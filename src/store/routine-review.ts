import { supabase } from '@/supabase/client';
import type { Practice } from '@/lib/schemas';
import { hasRemoteIdentity, writesSettled } from './hydrate';
import { clearReaction, currentMatch } from './matches';
import { applyRoutineChange } from './routine';

/**
 * v1.2 R-04: proposals to change the routine, written by the
 * `routine-review` function and answered here. Not mirrored, like the memory:
 * the server writes them, so they are read when the routine is opened.
 *
 * Nothing changes until the person accepts. Accepting records the answer
 * first and only then changes the routine, so a change the server never
 * heard about is not applied.
 */

export type RoutineProposal = {
  id: string;
  trigger: 'weekly' | 'bimonthly_free' | 'low_rating' | 'abandoned';
  prompt_version: string;
  proposal: {
    summary: string;
    remove: { practice_id: string; title: string; why: string }[];
    add: (Practice & { why: string })[];
    restore: { slug: string; name: string; why: string } | null;
  };
};

/** Ask for a review. The server decides whether one is due; most times it is not. */
export async function requestReview(): Promise<void> {
  if (!supabase || !hasRemoteIdentity()) return;
  try {
    await writesSettled();
    await supabase.functions.invoke('routine-review', { body: {} });
  } catch {
    // Background work: a review that did not happen happens next time.
  }
}

export async function pendingProposal(): Promise<RoutineProposal | null> {
  if (!supabase || !hasRemoteIdentity()) return null;
  const match = currentMatch();
  if (!match) return null;
  const { data, error } = await supabase
    .from('routine_change_proposals')
    .select('id, trigger, prompt_version, proposal')
    .eq('status', 'pending')
    .eq('match_id', match.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RoutineProposal;
}

export async function answerProposal(proposal: RoutineProposal, accept: boolean): Promise<boolean> {
  if (!supabase) return false;
  const match = currentMatch();
  const { error } = await supabase
    .from('routine_change_proposals')
    .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', proposal.id);
  if (error) return false;
  if (accept && match) {
    applyRoutineChange({
      matchId: match.id,
      removeIds: proposal.proposal.remove.map((r) => r.practice_id),
      add: proposal.proposal.add.map(({ why: _why, ...practice }) => practice),
      promptVersion: proposal.prompt_version,
    });
    if (proposal.proposal.restore) clearReaction(proposal.proposal.restore.slug);
  }
  return true;
}
