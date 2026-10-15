import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { readGrammaticalGender, type GrammaticalGender } from './lib/model-input.ts';

export async function callerGrammaticalGender(
  caller: SupabaseClient,
  userId: string,
): Promise<GrammaticalGender> {
  try {
    const [account, session] = await Promise.all([
      caller.from('clients').select('grammatical_gender').eq('user_id', userId).maybeSingle(),
      caller.from('anonymous_sessions').select('grammatical_gender').eq('user_id', userId).maybeSingle(),
    ]);
    const row = (account.error ? null : account.data) ?? (session.error ? null : session.data);
    return readGrammaticalGender((row as { grammatical_gender?: unknown } | null)?.grammatical_gender);
  } catch {
    return 'neutro';
  }
}
