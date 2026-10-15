import { supabase } from '@/supabase/client.ts';
import { comparisonResultSchema, type ComparisonResult } from '@/lib/schemas';

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
};

export class ComparisonsUnavailable extends Error {}

/** The latest comparison between the caller and this friend, if any. */
export async function latestComparison(friendshipId: string): Promise<StoredComparison | null> {
  if (!supabase) throw new ComparisonsUnavailable('There is no backend configured.');
  const { data, error } = await supabase
    .from('chart_comparisons')
    .select('id, friendship_id, result, created_at')
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

  return {
    id: data.id,
    friendshipId: data.friendship_id,
    result: parsed.data,
    createdAt: data.created_at,
  };
}
