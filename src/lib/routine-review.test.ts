import { describe, expect, it } from 'vitest';
import { reviewDue, type ReviewState } from './routine-review.ts';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse('2026-10-01T12:00:00Z');

function state(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    tier: 'premium',
    now: START + 2 * DAY,
    routineStartedAt: START,
    lastReviewAt: null,
    pendingProposal: false,
    practices: [{ title: 'Caminar', cadence: 'daily', createdAt: START }],
    checkins: [{ title: 'Caminar', day: '2026-10-02', rating: 4 }],
    ...overrides,
  };
}

describe('when the routine is reviewed (v1.2 R-04)', () => {
  it('premium: every week', () => {
    expect(reviewDue(state({ now: START + 6 * DAY, checkins: [{ title: 'Caminar', day: '2026-10-06', rating: 4 }] }))).toBeNull();
    expect(reviewDue(state({ now: START + 7 * DAY, checkins: [{ title: 'Caminar', day: '2026-10-07', rating: 4 }] }))).toBe('weekly');
  });

  it('premium: earlier when a practice is rated 2 or less twice', () => {
    const checkins = [
      { title: 'Caminar', day: '2026-10-02', rating: 2 },
      { title: 'Caminar', day: '2026-10-03', rating: 1 },
    ];
    expect(reviewDue(state({ now: START + 3 * DAY, checkins }))).toBe('low_rating');
    expect(reviewDue(state({ now: START + 3 * DAY, checkins: checkins.slice(0, 1) }))).toBeNull();
  });

  it('counts only what happened since the last review', () => {
    const checkins = [
      { title: 'Caminar', day: '2026-10-02', rating: 2 },
      { title: 'Caminar', day: '2026-10-03', rating: 1 },
    ];
    expect(reviewDue(state({ now: START + 6 * DAY, lastReviewAt: START + 5 * DAY, checkins }))).toBeNull();
  });

  it('premium: earlier when a daily or weekly practice goes two weeks undone', () => {
    const quiet = { now: START + 14 * DAY, lastReviewAt: START + 13 * DAY, checkins: [] };
    expect(reviewDue(state({ ...quiet, lastReviewAt: null }))).toBe('abandoned');
    expect(
      reviewDue(state({ ...quiet, lastReviewAt: null, practices: [{ title: 'Una vez', cadence: 'one_off', createdAt: START }] })),
    ).toBe('weekly');
  });

  it('free: every two months, and no signals', () => {
    const low = [
      { title: 'Caminar', day: '2026-10-02', rating: 1 },
      { title: 'Caminar', day: '2026-10-03', rating: 1 },
    ];
    expect(reviewDue(state({ tier: 'free', now: START + 30 * DAY, checkins: low }))).toBeNull();
    expect(reviewDue(state({ tier: 'free', now: START + 60 * DAY }))).toBe('bimonthly_free');
  });

  it('never while a proposal waits for an answer, nor without a routine', () => {
    expect(reviewDue(state({ now: START + 30 * DAY, pendingProposal: true }))).toBeNull();
    expect(reviewDue(state({ now: START + 30 * DAY, practices: [] }))).toBeNull();
  });
});
