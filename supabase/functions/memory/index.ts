import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { serveModel } from '../_shared/serve-model.ts';
import { memoryInputSchema, type MemoryInput } from '../_shared/lib/model-input.ts';
import { memoryResultSchema, type MemoryResult } from '../_shared/lib/schemas/index.ts';
import { modalityBySlug } from '../_shared/lib/catalog.ts';
import { scanText } from '../_shared/lib/safety.ts';
import { lintCopy } from '../_shared/lib/copy-lint.ts';
import { overPlanCap } from '../_shared/quota.ts';
import { memoryActive, readMemory, type StoredMemoryItem } from '../_shared/memory.ts';
import {
  MEMORY_PROMPT_VERSION,
  MEMORY_SYSTEM_PROMPT,
  buildMemoryUserMessage,
  type MemoryPromptItem,
  type MemorySource,
} from '../_shared/prompts/memory.ts';

/**
 * v1.2 M-01: learn from one new source — a journal entry, a rated practice or
 * a conversation that has gone quiet — and update the person's memory.
 *
 * The browser names the source and nothing else. The text is read here, as
 * the person under RLS, so nobody can feed the memory something that is not
 * in their own record; and it is scanned for crisis again here, whatever the
 * browser decided, because what raised a signal never enters the memory.
 *
 * Premium and consent are read from the server's side. A free or paused
 * memory is refused before anything is spent, and so is a premium person over
 * this month's cap: the memory spends from the same US$4.
 */

/** A conversation is read once it has gone this long without a message. */
const QUIET_MS = 30 * 60 * 1000;
const MAX_TURNS = 40;
const MAX_CONVERSATION_CHARS = 12_000;

type Turn = { role: 'user' | 'assistant'; text: string; type: string | null; created_at: string };

type Request = MemoryInput & {
  /** Filled by `enrich`. Never accepted from the browser: the schema strips it. */
  built?: { items: StoredMemoryItem[]; source: MemorySource; readUntil: string | null };
};

function anyCrisis(texts: readonly (string | null | undefined)[]): boolean {
  return texts.some((text) => Boolean(text && scanText(text).crisis));
}

async function conversationTurns(caller: SupabaseClient, conversationId: string, since: string | null): Promise<Turn[]> {
  let query = caller
    .from('messages')
    .select('role, text, type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (since) query = query.gt('created_at', since);
  const { data } = await query;
  return ((data ?? []) as Turn[]).filter((t) => t.role === 'user' || t.role === 'assistant');
}

async function markRead(elevated: SupabaseClient, input: MemoryInput, until: string): Promise<void> {
  const table =
    input.source === 'journal' ? 'journal_entries' : input.source === 'checkin' ? 'recommendation_checkins' : 'conversations';
  const { error } = await elevated.from(table).update({ memory_processed_at: until }).eq('id', input.id);
  if (error) console.error('memory_mark_failed', error.code);
}

/**
 * What this source would teach, or why it must not be read. Shared by
 * `refuse` (which spends nothing) and `enrich` (which builds the prompt).
 */
async function readSource(
  caller: SupabaseClient,
  input: MemoryInput,
): Promise<{ source: MemorySource; readUntil: string | null } | { skip: string; readUntil: string | null }> {
  if (input.source === 'journal') {
    const { data } = await caller
      .from('journal_entries')
      .select('entry_date, body, mood, practice_id, modality_slug, crisis_flagged, memory_processed_at')
      .eq('id', input.id)
      .maybeSingle();
    if (!data) return { skip: 'not_found', readUntil: null };
    if (data.memory_processed_at) return { skip: 'already_read', readUntil: null };
    if (data.crisis_flagged || anyCrisis([data.body])) return { skip: 'crisis', readUntil: new Date().toISOString() };
    let about: string | null = null;
    if (data.practice_id) {
      const { data: practice } = await caller.from('routine_practices').select('title').eq('id', data.practice_id).maybeSingle();
      about = (practice?.title as string | undefined) ?? null;
    } else if (data.modality_slug) {
      about = modalityBySlug(data.modality_slug as string)?.name_es ?? null;
    }
    return {
      source: { kind: 'journal', date: data.entry_date, mood: data.mood, about, body: data.body },
      readUntil: new Date().toISOString(),
    };
  }

  if (input.source === 'checkin') {
    const { data } = await caller
      .from('recommendation_checkins')
      .select('practice_title, checked_on, rating, comment, memory_processed_at')
      .eq('id', input.id)
      .maybeSingle();
    if (!data) return { skip: 'not_found', readUntil: null };
    if (data.memory_processed_at) return { skip: 'already_read', readUntil: null };
    if (data.rating === null) return { skip: 'not_rated', readUntil: null };
    if (anyCrisis([data.comment])) return { skip: 'crisis', readUntil: new Date().toISOString() };
    return {
      source: {
        kind: 'checkin',
        practice: data.practice_title,
        date: data.checked_on,
        rating: data.rating,
        comment: data.comment,
      },
      readUntil: new Date().toISOString(),
    };
  }

  const { data } = await caller
    .from('conversations')
    .select('memory_processed_at')
    .eq('id', input.id)
    .maybeSingle();
  if (!data) return { skip: 'not_found', readUntil: null };
  const turns = await conversationTurns(caller, input.id, data.memory_processed_at as string | null);
  const last = turns.at(-1);
  if (!last || !turns.some((t) => t.role === 'user')) return { skip: 'nothing_new', readUntil: null };
  if (Date.now() - Date.parse(last.created_at) < QUIET_MS) return { skip: 'not_quiet', readUntil: null };
  // A crisis anywhere in what is new keeps all of it out: the turns around
  // it are about the same thing.
  if (turns.some((t) => t.type === 'crisis') || anyCrisis(turns.filter((t) => t.role === 'user').map((t) => t.text))) {
    return { skip: 'crisis', readUntil: last.created_at };
  }
  // The most recent turns, within a budget.
  const kept: Turn[] = [];
  let chars = 0;
  for (const turn of [...turns].reverse()) {
    if (kept.length >= MAX_TURNS || chars + turn.text.length > MAX_CONVERSATION_CHARS) break;
    kept.unshift(turn);
    chars += turn.text.length;
  }
  return {
    source: { kind: 'conversation', turns: kept.map(({ role, text }) => ({ role, text })) },
    readUntil: last.created_at,
  };
}

function built(input: Request): NonNullable<Request['built']> {
  if (!input.built) throw new Error('the memory payload was not built');
  return input.built;
}

const refOf = (index: number) => `m${index + 1}`;

function promptItems(items: readonly StoredMemoryItem[]): MemoryPromptItem[] {
  return items.map((item, index) => ({
    ref: refOf(index),
    category: item.category,
    content: item.content,
    byPerson: item.edited_by_user,
  }));
}

function itemByRef(items: readonly StoredMemoryItem[], ref: string): StoredMemoryItem | undefined {
  const match = /^m(\d+)$/.exec(ref);
  return match ? items[Number(match[1]) - 1] : undefined;
}

function sourceColumn(input: MemoryInput): Record<string, string> {
  if (input.source === 'journal') return { journal_entry_id: input.id };
  if (input.source === 'checkin') return { checkin_id: input.id };
  return { conversation_id: input.id };
}

Deno.serve(
  serveModel<Request, MemoryResult>({
    purpose: 'memory',
    promptVersion: MEMORY_PROMPT_VERSION,
    input: memoryInputSchema,
    output: memoryResultSchema,
    system: MEMORY_SYSTEM_PROMPT,
    user: (input, { gender }) =>
      buildMemoryUserMessage({ items: promptItems(built(input).items), source: built(input).source, gender }),
    meta: (input) => ({ memory_items_read: built(input).items.length }),

    refuse: async (input, { caller, userId, elevated }) => {
      if (!(await memoryActive(caller, elevated, userId))) return { reason: 'memory_paused', safety: false };
      if ((await overPlanCap(elevated, userId)).over) return { reason: 'plan_cap', safety: false };
      const read = await readSource(caller, input);
      if ('skip' in read) {
        // Nothing here may be learnt, ever: mark it read so it is not
        // offered again. A crisis is logged as a safety refusal.
        if (read.readUntil) await markRead(elevated, input, read.readUntil);
        return { reason: read.skip, safety: read.skip === 'crisis' };
      }
      return null;
    },

    enrich: async (input, { caller, userId }) => {
      const read = await readSource(caller, input);
      if ('skip' in read) throw new Error(`memory source became unreadable: ${read.skip}`);
      return {
        source: input.source,
        id: input.id,
        built: { items: await readMemory(caller, userId), source: read.source, readUntil: read.readUntil },
      };
    },

    check: (result, input) => {
      const { items } = built(input);
      for (const ref of result.support) {
        if (!itemByRef(items, ref)) return `support names ${ref}, which was not sent`;
      }
      for (const revision of result.revise) {
        const item = itemByRef(items, revision.ref);
        if (!item) return `revise names ${revision.ref}, which was not sent`;
        if (item.edited_by_user) return `revise rewrites ${revision.ref}, which the person wrote`;
      }
      for (const entry of [...result.add, ...result.revise]) {
        if (scanText(entry.content).crisis) return 'a memory item reads as a crisis signal';
        // Not the "command" rule: an item can describe an obligation of the
        // person's life ("tienes que cuidar a tu mamá los fines de semana")
        // without giving one.
        const violation = lintCopy(entry.content).filter((v) => v.rule !== 'command')[0];
        if (violation) return `${violation.rule}: "${violation.match}"`;
      }
      return null;
    },

    store: async (result, input, { elevated, userId }) => {
      const { items, readUntil } = built(input);
      const from = sourceColumn(input);
      const sourced = new Set<string>();
      const added: string[] = [];

      for (const entry of result.add) {
        const { data, error } = await elevated
          .from('memory_items')
          .insert({ user_id: userId, category: entry.category, content: entry.content })
          .select('id')
          .single();
        if (error || !data) {
          console.error('memory_add_failed', error?.code);
          continue;
        }
        sourced.add(data.id as string);
        added.push(data.id as string);
      }

      for (const revision of result.revise) {
        const item = itemByRef(items, revision.ref)!;
        const { error } = await elevated
          .from('memory_items')
          .update({ category: revision.category, content: revision.content })
          .eq('id', item.id)
          .eq('edited_by_user', false);
        if (error) console.error('memory_revise_failed', error.code);
        sourced.add(item.id);
      }

      for (const ref of result.support) sourced.add(itemByRef(items, ref)!.id);

      if (sourced.size > 0) {
        const { data: existing } = await elevated
          .from('memory_item_sources')
          .select('memory_item_id')
          .in('memory_item_id', [...sourced])
          .match(from);
        for (const row of (existing ?? []) as { memory_item_id: string }[]) sourced.delete(row.memory_item_id);
        if (sourced.size > 0) {
          const { error } = await elevated
            .from('memory_item_sources')
            .insert([...sourced].map((memory_item_id) => ({ memory_item_id, user_id: userId, ...from })));
          if (error) {
            // The source went while this ran (the entry was deleted): what
            // it added must not outlive it with nothing to point at.
            console.error('memory_sources_failed', error.code);
            if (added.length > 0) await elevated.from('memory_items').delete().in('id', added);
            return null;
          }
        }
      }

      if (readUntil) await markRead(elevated, input, readUntil);
      return null;
    },
  }),
);
