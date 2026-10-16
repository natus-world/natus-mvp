import { supabase } from '@/supabase/client';
import { getClient, signUp } from './account';
import { getSession } from './session';

/**
 * The second half of saving the map with Google (`linkGoogle`): once the
 * person is back from Google, their anonymous row carries a Google identity
 * and an address, and the account is created from it — the same claim the
 * email path makes.
 *
 * Only when there is something to claim. Somebody who signs in with Google
 * on a new device with no account yet has no session here, and gets no empty
 * account: they start from the beginning, as before.
 */
export async function completeLinkedSignup(): Promise<boolean> {
  if (!supabase || getClient()) return false;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous || !user.email) return false;
  if (!getSession()?.soul_map_id) return false;
  try {
    signUp({ email: user.email });
    return true;
  } catch {
    return false;
  }
}
