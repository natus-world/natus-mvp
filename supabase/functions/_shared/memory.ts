import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { planTier } from './quota.ts';
import { MEMORY_CATEGORIES, type MemoryCategory } from './lib/schemas/index.ts';

/**
 * v1.2 M-01, the two conditions under which the memory is alive: premium and
 * the person's express consent. Without either it is kept but paused —
 * nothing is added and the chat does not read it. Fails closed.
 */
export async function memoryActive(
  caller: SupabaseClient,
  elevated: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [tier, consent] = await Promise.all([planTier(elevated, userId), memoryConsented(caller, userId)]);
  return tier === 'premium' && consent;
}

/** Whether the person has agreed that Natus learns from what they write. */
export async function memoryConsented(caller: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await caller
      .from('preferences')
      .select('memory_consent_at')
      .eq('user_id', userId)
      .maybeSingle();
    return !error && Boolean(data?.memory_consent_at);
  } catch {
    return false;
  }
}

export type StoredMemoryItem = {
  id: string;
  category: MemoryCategory;
  content: string;
  edited_by_user: boolean;
};

/** The person's memory, read as the person, oldest first. */
export async function readMemory(caller: SupabaseClient, userId: string): Promise<StoredMemoryItem[]> {
  const { data, error } = await caller
    .from('memory_items')
    .select('id, category, content, edited_by_user')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(120);
  if (error || !data) return [];
  return (data as StoredMemoryItem[]).filter((item) =>
    (MEMORY_CATEGORIES as readonly string[]).includes(item.category),
  );
}
