import { CODE_TTL_MS, type CodePurpose } from '@/supabase/session';

/**
 * The code on its way, kept for the tab: on a phone, going to the mail app
 * and back can reload the page, and the person must land again on «Escribe
 * tu código» rather than on the form, where asking again would hit
 * Supabase's minute. Nothing here is a secret: the address and the time.
 */
const KEY = 'natus:codigo_pendiente';

export type PendingCode = { email: string; sentAt: number };

export function readPendingCode(purpose: CodePurpose): PendingCode | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingCode & { purpose?: CodePurpose };
    if (value.purpose !== purpose || typeof value.email !== 'string' || typeof value.sentAt !== 'number') return null;
    if (Date.now() - value.sentAt > 2 * CODE_TTL_MS) return null;
    return { email: value.email, sentAt: value.sentAt };
  } catch {
    return null;
  }
}

export function savePendingCode(purpose: CodePurpose, pending: PendingCode | null): void {
  try {
    if (pending) sessionStorage.setItem(KEY, JSON.stringify({ ...pending, purpose }));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private mode or storage off: the screen still works, only a reload forgets.
  }
}
