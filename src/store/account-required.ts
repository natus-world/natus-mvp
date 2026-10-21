import { read, write } from './db';
import { isSignedIn } from './account';

/**
 * The account is asked for right after the preview of a new map (owner,
 * 20–21 Oct 2026; before, from 16 Oct, as soon as the map was ready): to read
 * it whole and go on to Caminos, the person saves it, with no «Ahora no».
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

/** Where somebody who owes the account may still be: the policies, and the form itself. */
const OPEN_WHILE_OWED = ['/registro', '/privacidad', '/terminos'];

/**
 * Whether this route must give way to «Guarda tu mapa». Only the preview on
 * screen (`previewing`, on `/carta`) stands in front of it.
 */
export function sendsToSignup(pathname: string, previewing: boolean): boolean {
  if (!accountRequired()) return false;
  if (pathname === '/carta' && previewing) return false;
  return !OPEN_WHILE_OWED.includes(pathname);
}
