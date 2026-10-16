import { read, remove, write } from './db.ts';

/**
 * The revelation of the map (package 02, option B, 16 Oct 2026) is seen once,
 * right after «Generando». Between the two there may be a trip through Google
 * (`/registro`), so the map waiting to be revealed is remembered in this
 * browser by its id: the revelation shows only while that map is the current
 * one. Signing into another account that already had a map shows that map's
 * Carta, never a revelation of somebody else's.
 *
 * Local by design: a revelation missed on one device is not owed on another.
 */
export function markRevelationPending(synthesisId: string): void {
  write('revelation_pending', synthesisId);
}

export function revelationPending(synthesisId: string | undefined): boolean {
  if (!synthesisId) return false;
  return read<string | null>('revelation_pending', null) === synthesisId;
}

export function clearRevelation(): void {
  remove('revelation_pending');
}
