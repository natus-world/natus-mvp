/**
 * v1.2 R-04: whether the routine is due for a review, and why.
 *
 * Premium is reviewed every week, and earlier on three signals: a practice
 * rated 2 or less twice, a daily or weekly practice not done in two weeks,
 * or an important change in the memory — something new Natus kept in «Lo
 * que no te funciona» or «Lo que estás viviendo» (defined by the owner's
 * delegation, 16 Oct 2026). Free renews every two months. Never while a proposal is waiting for
 * an answer, and every signal counts only what happened since the last
 * review, so a proposal the person turned down is not asked again the next
 * day for the same reason.
 *
 * Pure, so the rule has tests; the `routine-review` function feeds it from
 * the database.
 */

export type ReviewTrigger = 'weekly' | 'bimonthly_free' | 'low_rating' | 'abandoned' | 'memory_shift';

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKLY_MS = 7 * DAY_MS;
export const FREE_RENEWAL_MS = 60 * DAY_MS;
export const ABANDONED_MS = 14 * DAY_MS;
const LOW_RATING = 2;
const LOW_RATINGS_TO_SIGNAL = 2;

export type ReviewState = {
  tier: 'free' | 'premium';
  now: number;
  /** When the current routine was written (its oldest active practice). */
  routineStartedAt: number;
  /** The last review of this routine, whatever its outcome; null if none. */
  lastReviewAt: number | null;
  pendingProposal: boolean;
  practices: readonly { title: string; cadence: string; createdAt: number }[];
  /** Check-ins of these practices: the day (YYYY-MM-DD) and the rating, if any. */
  checkins: readonly { title: string; day: string; rating: number | null }[];
  /** When Natus kept something new in the two categories that count; empty without a live memory. */
  memoryShifts?: readonly number[];
};

function dayMs(day: string): number {
  return Date.parse(`${day}T12:00:00Z`);
}

export function reviewDue(state: ReviewState): ReviewTrigger | null {
  if (state.pendingProposal || state.practices.length === 0) return null;
  const since = Math.max(state.routineStartedAt, state.lastReviewAt ?? 0);

  if (state.tier === 'free') return state.now - since >= FREE_RENEWAL_MS ? 'bimonthly_free' : null;

  for (const practice of state.practices) {
    const low = state.checkins.filter(
      (c) => c.title === practice.title && c.rating !== null && c.rating <= LOW_RATING && dayMs(c.day) >= since - DAY_MS,
    );
    if (low.length >= LOW_RATINGS_TO_SIGNAL) return 'low_rating';
  }

  for (const practice of state.practices) {
    if (practice.cadence !== 'daily' && practice.cadence !== 'weekly') continue;
    const lastDone = Math.max(
      practice.createdAt,
      ...state.checkins.filter((c) => c.title === practice.title).map((c) => dayMs(c.day)),
    );
    if (state.now - Math.max(lastDone, since) >= ABANDONED_MS) return 'abandoned';
  }

  if ((state.memoryShifts ?? []).some((at) => at > since)) return 'memory_shift';

  return state.now - since >= WEEKLY_MS ? 'weekly' : null;
}
