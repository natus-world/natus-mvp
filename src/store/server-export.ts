import { supabase } from '@/supabase/client';
import { hasRemoteIdentity } from './hydrate';

/**
 * What «Descargar mis datos» cannot take from the mirror: rows the server
 * writes and this browser only reads when it needs them — the memory (M-01)
 * and the proposals to change the routine (R-04). Read as the person, under
 * RLS. Empty without a backend, where neither exists.
 */
export async function serverOnlyData(): Promise<Record<string, unknown>> {
  if (!supabase || !hasRemoteIdentity()) return {};
  const [items, sources, proposals] = await Promise.all([
    supabase.from('memory_items').select('id, category, content, edited_by_user, created_at, updated_at'),
    supabase.from('memory_item_sources').select('memory_item_id, journal_entry_id, conversation_id, checkin_id, created_at'),
    supabase
      .from('routine_change_proposals')
      .select('id, trigger, proposal, status, created_at, responded_at'),
  ]);
  return {
    ...(items.data ? { memory_items: items.data } : {}),
    ...(sources.data ? { memory_item_sources: sources.data } : {}),
    ...(proposals.data ? { routine_change_proposals: proposals.data } : {}),
  };
}
