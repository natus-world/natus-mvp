import { supabase } from '@/supabase/client.ts';
import { comparisonResultSchema, type ComparisonResult } from '@/lib/schemas';
import { readStoredChart } from '@/lib/comparison-payload';
import type { NatalChart } from '@/lib/natal-chart';

/**
 * Comparisons between friends (v1.2 C-01), read from `chart_comparisons`.
 *
 * Not mirrored like the rest of the store: a comparison belongs to a
 * friendship, either friend may have asked for it, and it stops being
 * readable the moment the friendship ends. The policy decides that on every
 * read, so this asks every time instead of keeping a copy that could outlive
 * the friendship.
 */

export type StoredComparison = {
  id: string;
  friendshipId: string;
  result: ComparisonResult;
  createdAt: string;
  /** Whether the reader asked for it. The function writes the one who asked
   *  as `a` and the friend as `b`, so this says which side is whose. */
  askedByMe: boolean;
};

export class ComparisonsUnavailable extends Error {}

/** The latest comparison between the caller and this friend, if any. */
export async function latestComparison(friendshipId: string): Promise<StoredComparison | null> {
  if (!supabase) throw new ComparisonsUnavailable('There is no backend configured.');
  const { data, error } = await supabase
    .from('chart_comparisons')
    .select('id, friendship_id, user_id, result, created_at')
    .eq('friendship_id', friendshipId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ComparisonsUnavailable(error.message);
  if (!data) return null;

  // A row written under an older prompt may not have the four parts. It is
  // treated as absent rather than rendered half-empty.
  const parsed = comparisonResultSchema.safeParse(data.result);
  if (!parsed.success) return null;

  const { data: session } = await supabase.auth.getSession();

  return {
    id: data.id,
    friendshipId: data.friendship_id,
    result: parsed.data,
    createdAt: data.created_at,
    askedByMe: data.user_id === session.session?.user.id,
  };
}

/**
 * The friend who did not ask for a comparison has read it: kept once, for the
 * admin panel (owner, 23 Oct 2026). The server records it only for that
 * friend and only while the two are friends. Fire and forget.
 */
export function markComparisonRead(comparisonId: string): void {
  if (!supabase) return;
  void supabase.rpc('mark_comparison_read', { p_comparison: comparisonId }).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * «Las dos cartas» (owner, 23 Oct 2026): the reader's chart and the friend's,
 * as stored, read only while the two are friends. Null when the friendship
 * is not accepted; a side is null when that person has no chart this code
 * can read. Asked every time, like the comparison, never kept.
 */
export async function friendCharts(
  friendshipId: string,
): Promise<{ mine: NatalChart | null; theirs: NatalChart | null } | null> {
  if (!supabase) throw new ComparisonsUnavailable('There is no backend configured.');
  const { data, error } = await supabase.rpc('friend_charts', { p_friendship: friendshipId });
  if (error) throw new ComparisonsUnavailable(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  return { mine: readStoredChart(row['mine']), theirs: readStoredChart(row['theirs']) };
}
