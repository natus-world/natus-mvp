import { read, write } from './db';
import { isSignedIn } from './account';

/**
 * Google is asked for as soon as the map is ready, before it is shown (owner,
 * 16 Oct 2026): it reads as more serious, and no anonymous rows pile up.
 *
 * Only for maps made from then on. Somebody who started without an account
 * before keeps «Guardar mi mapa» as an offer, so nobody already inside is
 * locked out of what they made.
 */
export function requireAccount(): void {
  write('account_required', true);
}

export function accountRequired(): boolean {
  return read<boolean>('account_required', false) && !isSignedIn();
}

export function clearAccountRequirement(): void {
  write('account_required', false);
}
