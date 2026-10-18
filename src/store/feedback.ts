import { isBackendConfigured, supabase } from '@/supabase/client';

/**
 * Suggestions during the beta (owner, 18 Oct 2026): a short conversation
 * with the team, open from every screen. Not mirrored like the rest of the
 * store — it is read when the sheet opens and written straight through, and
 * nothing else in the app reads it: never the memory, never a model, never
 * the funnel.
 *
 * Without a backend (the demo) the conversation lives in memory only.
 */
export type FeedbackMessage = {
  id: string;
  author: 'person' | 'team';
  body: string;
  createdAt: string;
};

const demo: FeedbackMessage[] = [];

function remote() {
  return isBackendConfigured && supabase ? supabase : null;
}

export async function loadFeedback(): Promise<FeedbackMessage[]> {
  const db = remote();
  if (!db) return [...demo];
  const { data, error } = await db
    .from('feedback_messages')
    .select('id, author, body, created_at')
    .order('created_at', { ascending: true });
  if (error || !data) throw new Error('feedback_unavailable');
  return data.map((row) => ({
    id: row.id as string,
    author: row.author === 'team' ? 'team' : 'person',
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

/** Whether the team has answered something not yet seen. */
export async function hasUnreadFromTeam(): Promise<boolean> {
  const db = remote();
  if (!db) return false;
  const { count, error } = await db
    .from('feedback_messages')
    .select('id', { count: 'exact', head: true })
    .eq('author', 'team')
    .is('read_at', null);
  return !error && (count ?? 0) > 0;
}

export async function markTeamRead(): Promise<void> {
  const db = remote();
  if (!db) return;
  await db.rpc('feedback_mark_read');
}

/** The route, in the closed form the table accepts, or null. */
export function screenOf(pathname: string): string | null {
  const clean = pathname.toLowerCase().replace(/[^a-z0-9/_-]/g, '').slice(0, 81);
  return /^\/[a-z0-9/_-]{0,80}$/.test(clean) ? clean : null;
}

export async function sendFeedback(input: {
  body: string;
  screen: string | null;
  crisisFlagged: boolean;
}): Promise<FeedbackMessage> {
  const body = input.body.trim().slice(0, 4000);
  const db = remote();
  if (!db) {
    const message: FeedbackMessage = {
      id: `demo-${demo.length + 1}`,
      author: 'person',
      body,
      createdAt: new Date().toISOString(),
    };
    demo.push(message);
    return message;
  }
  const { data: session } = await db.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('no_session');
  const { data, error } = await db
    .from('feedback_messages')
    .insert({
      user_id: userId,
      author: 'person',
      body,
      screen: input.screen,
      crisis_flagged: input.crisisFlagged,
    })
    .select('id, created_at')
    .single();
  if (error || !data) throw new Error('feedback_not_sent');
  return { id: data.id as string, author: 'person', body, createdAt: data.created_at as string };
}
