import { supabase } from '@/supabase/client';
import { MEMORY_CATEGORIES, MAX_MEMORY_ITEM_CHARS, type MemoryCategory } from '@/lib/schemas';
import { hasRemoteIdentity, writesSettled } from './hydrate';
import { getPreferences } from './preferences';
import { fetchQuota } from './quota';

/**
 * The memory (v1.2 M-01): what Natus knows about the person, premium only.
 *
 * Unlike the rest of the store this is not mirrored: the items are written by
 * the `memory` function, on the server, so a copy hydrated at the start of a
 * session would be stale by the next journal entry. The profile reads it when
 * it is opened and writes the person's corrections straight to Postgres.
 *
 * No backend, no memory: the fixture demo has nothing to learn with.
 */

export type MemoryItem = {
  id: string;
  category: MemoryCategory;
  content: string;
  /** The person wrote or corrected it: it stays even if its sources go. */
  edited_by_user: boolean;
  updated_at: string;
};

export { MEMORY_CATEGORIES, MAX_MEMORY_ITEM_CHARS };

/** Premium and consent: the two conditions for the memory to learn and be read. */
export async function memoryIsActive(): Promise<boolean> {
  if (!getPreferences().memory_consent_at) return false;
  const quota = await fetchQuota('chat');
  return quota?.tier === 'premium';
}

export async function listMemory(): Promise<MemoryItem[] | null> {
  if (!supabase || !hasRemoteIdentity()) return null;
  const { data, error } = await supabase
    .from('memory_items')
    .select('id, category, content, edited_by_user, updated_at')
    .order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? []).filter((row): row is MemoryItem =>
    (MEMORY_CATEGORIES as readonly string[]).includes(row.category),
  );
}

export async function correctMemoryItem(id: string, content: string): Promise<boolean> {
  const value = content.trim().slice(0, MAX_MEMORY_ITEM_CHARS);
  if (!supabase || !value) return false;
  const { error } = await supabase.from('memory_items').update({ content: value }).eq('id', id);
  return !error;
}

export async function deleteMemoryItem(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('memory_items').delete().eq('id', id);
  return !error;
}

export async function addMemoryItem(category: MemoryCategory, content: string): Promise<boolean> {
  const value = content.trim().slice(0, MAX_MEMORY_ITEM_CHARS);
  if (!supabase || !value) return false;
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return false;
  const { error } = await supabase.from('memory_items').insert({ user_id: userId, category, content: value });
  return !error;
}

// ── learning ─────────────────────────────────────────────────────────────

/** Sources older than this are never read: on becoming premium, the last 30 days (M-01). */
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
/** A conversation is read once it has gone this long without a message. */
const QUIET_MS = 30 * 60 * 1000;

type Pending = { source: 'journal' | 'checkin' | 'conversation'; id: string };

async function pendingSources(now: number, checkinsToday: boolean): Promise<Pending[]> {
  if (!supabase) return [];
  const since = new Date(now - LOOKBACK_MS);
  const [journal, checkins, conversations] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('id')
      .is('memory_processed_at', null)
      .eq('crisis_flagged', false)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('recommendation_checkins')
      .select('id')
      .is('memory_processed_at', null)
      .not('rating', 'is', null)
      .gte('checked_on', since.toISOString().slice(0, 10))
      // Today's are left for the day unless the person has just commented:
      // a rating comes first and its comment after, and a check-in is read
      // once.
      .lt('checked_on', checkinsToday ? '9999-12-31' : new Date(now).toISOString().slice(0, 10))
      .order('checked_on', { ascending: true }),
    supabase.from('conversations').select('id, memory_processed_at'),
  ]);

  const quietConversations: Pending[] = [];
  for (const conversation of conversations.data ?? []) {
    const { data: last } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) continue;
    const at = Date.parse(last.created_at);
    const read = conversation.memory_processed_at ? Date.parse(conversation.memory_processed_at) : 0;
    if (at > read && now - at >= QUIET_MS && at >= since.getTime()) {
      quietConversations.push({ source: 'conversation', id: conversation.id });
    }
  }

  return [
    ...(journal.data ?? []).map((r) => ({ source: 'journal' as const, id: r.id })),
    ...(checkins.data ?? []).map((r) => ({ source: 'checkin' as const, id: r.id })),
    ...quietConversations,
  ];
}

let running: Promise<number> | null = null;

/**
 * Hand every source not yet read to the `memory` function, one at a time.
 * Called when the app opens, after a journal entry is saved and after a
 * practice's comment is saved, and every few minutes while the app is open (that is how
 * a conversation that went quiet gets read). The server decides again
 * whether each one may be read; this only avoids asking when the answer is
 * plainly no.
 *
 * Returns how many sources were read. Never throws: learning is background
 * work, and nothing the person is doing waits on it.
 */
export function learnFromPending(options: { checkinsToday?: boolean } = {}, now = Date.now()): Promise<number> {
  if (running) return running;
  running = (async () => {
    try {
      if (!supabase || !hasRemoteIdentity() || !(await memoryIsActive())) return 0;
      await writesSettled();
      let read = 0;
      for (const pending of await pendingSources(now, options.checkinsToday ?? false)) {
        const { error } = await supabase.functions.invoke('memory', { body: pending });
        if (!error) {
          read += 1;
          continue;
        }
        // A refusal about this one source (crisis, not quiet yet) is not a
        // reason to stop; a paused memory, a cap or a missing model is.
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status !== 403) break;
        const reason = await (error as { context?: Response }).context
          ?.clone()
          .json()
          .then((b: { reason?: string }) => b.reason)
          .catch(() => undefined);
        if (reason === 'memory_paused' || reason === 'plan_cap') break;
      }
      return read;
    } catch {
      return 0;
    } finally {
      running = null;
    }
  })();
  return running;
}
