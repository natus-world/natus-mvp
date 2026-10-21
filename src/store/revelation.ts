import { read, remove, write } from './db.ts';

/**
 * The preview of the map (package 02, option B, 16 Oct 2026; reordered by the
 * owner on 20–21 Oct 2026) is seen once, right after «Generando» and before
 * the account is asked for. The map waiting to be shown is remembered in this
 * browser by its id: the preview shows only while that map is the current
 * one. Signing into another account that already had a map shows that map's
 * Carta, never a preview of somebody else's.
 *
 * Local by design: a preview missed on one device is not owed on another.
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

/**
 * The preview on screen right now. It is cleared as soon as it opens, so that
 * somebody who closes the app on it comes back to «Guarda tu mapa» and not to
 * the preview from the start (owner, 21 Oct 2026); while it is open, this is
 * what lets it stand in front of the account. In memory only: a reload ends it.
 */
let showing = false;

export function startRevelation(): void {
  clearRevelation();
  showing = true;
}

export function endRevelation(): void {
  showing = false;
}

export function revelationShowing(): boolean {
  return showing;
}

/**
 * «Volver a mi mapa» from «Guarda tu mapa» (owner, 21 Oct 2026): the preview
 * once more, in this visit only and without the animation from the start.
 */
let reopened = false;

export function reopenRevelation(): void {
  reopened = true;
  showing = true;
}

/** True once: reading it clears it. */
export function takeReopenedRevelation(): boolean {
  const was = reopened;
  reopened = false;
  return was;
}

/**
 * Premium's welcome offer comes after «Para cuidarte» (owner, 20 Oct 2026),
 * once, for whoever left the preview of a new map. Kept in this browser so the
 * trip through Google or the mail does not lose it.
 */
export function markWelcomeOfferDue(): void {
  write('welcome_offer_due', true);
}

/** True once: reading it clears it. */
export function takeWelcomeOfferDue(): boolean {
  const due = read<boolean>('welcome_offer_due', false);
  if (due) remove('welcome_offer_due');
  return due;
}
