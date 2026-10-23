import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkInToday,
  clearReaction,
  isCheckedToday,
  isDoneOnce,
  practiceIdFor,
  rateCheckIn,
  recentlyDismissedSlugs,
  saveMatch,
  setReaction,
  toggleCheckIn,
  toggleOnce,
  totalCheckIns,
} from './matches';
import type { MatchResult } from '@/lib/schemas';
import { clearAll, write } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

const DAY = '2026-10-15';

describe('which practice a mark is for (owner, 22 Oct 2026)', () => {
  const practice = (id: string, title: string) => ({ id, title });
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';

  it('keeps the id of the one practice with that title, on marking and on rating', () => {
    write('routine_practices', [practice(A, 'Caminar')]);
    toggleCheckIn('Caminar', DAY);
    expect(checkInToday('Caminar', DAY)?.practice_id).toBe(A);
    rateCheckIn('Caminar', DAY, 4);
    expect(checkInToday('Caminar', DAY)).toMatchObject({ rating: 4, practice_id: A });
  });

  it('leaves it empty when two practices share the title, or none has it', () => {
    write('routine_practices', [practice(A, 'Caminar'), practice(B, 'Caminar')]);
    expect(practiceIdFor('Caminar')).toBeNull();
    expect(practiceIdFor('Nadar')).toBeNull();
  });
});

describe('«Una vez» — a practice done once stays done (owner, 21 Oct 2026)', () => {
  it('is done from the day it is marked on, and the days after', () => {
    expect(isDoneOnce('Escribir una carta')).toBe(false);
    toggleOnce('Escribir una carta', '2026-10-14');
    expect(isDoneOnce('Escribir una carta')).toBe(true);
    expect(isCheckedToday('Escribir una carta', DAY)).toBe(false);
    expect(totalCheckIns('Escribir una carta')).toBe(1);
  });

  it('marking it today can be rated, like any other', () => {
    toggleOnce('Escribir una carta', DAY);
    rateCheckIn('Escribir una carta', DAY, 5);
    expect(checkInToday('Escribir una carta', DAY)?.rating).toBe(5);
  });

  it('touching it again unmarks it, whatever day it was done', () => {
    toggleOnce('Escribir una carta', '2026-10-01');
    toggleCheckIn('Caminar', '2026-10-01');
    toggleOnce('Escribir una carta', DAY);
    expect(isDoneOnce('Escribir una carta')).toBe(false);
    expect(totalCheckIns('Caminar')).toBe(1);
  });
});

describe('v1.2 R-03 — how useful a marked practice was', () => {
  it('keeps the rating and the comment on that day only', () => {
    toggleCheckIn('Caminar', DAY);
    toggleCheckIn('Caminar', '2026-10-14');
    rateCheckIn('Caminar', DAY, 4, '  Me ordenó la cabeza.  ');
    expect(checkInToday('Caminar', DAY)).toMatchObject({ rating: 4, comment: 'Me ordenó la cabeza.' });
    expect(checkInToday('Caminar', '2026-10-14')?.rating).toBeUndefined();
  });

  it('cannot rate a practice that was not marked that day', () => {
    rateCheckIn('Caminar', DAY, 3);
    expect(checkInToday('Caminar', DAY)).toBeUndefined();
    expect(totalCheckIns('Caminar')).toBe(0);
  });

  it('stores an empty comment as none', () => {
    toggleCheckIn('Caminar', DAY);
    rateCheckIn('Caminar', DAY, 2, '   ');
    expect(checkInToday('Caminar', DAY)?.comment).toBeNull();
  });

  it('refuses a rating outside 1 to 5', () => {
    toggleCheckIn('Caminar', DAY);
    expect(() => rateCheckIn('Caminar', DAY, 6)).toThrow();
    expect(() => rateCheckIn('Caminar', DAY, 0)).toThrow();
  });

  it('unmarking takes the rating with it', () => {
    toggleCheckIn('Caminar', DAY);
    rateCheckIn('Caminar', DAY, 5);
    toggleCheckIn('Caminar', DAY);
    toggleCheckIn('Caminar', DAY);
    expect(checkInToday('Caminar', DAY)?.rating).toBeUndefined();
  });
});

describe('v1.2 R-05 — a dismissed therapy, for a week', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const result = { matched_modalities: [] } as unknown as MatchResult;

  it('stays out for 7 days, then may be proposed again', () => {
    saveMatch({ result, strategy: 'topical', usedFallback: false, synthesisId: 's1', now: 0 });
    setReaction('reiki', 'dismissed', 1_000);
    expect(recentlyDismissedSlugs(1_000 + 6 * DAY_MS)).toEqual(['reiki']);
    expect(recentlyDismissedSlugs(1_000 + 7 * DAY_MS)).toEqual([]);
  });

  it('comes back at once with «Deshacer»', () => {
    saveMatch({ result, strategy: 'topical', usedFallback: false, synthesisId: 's1', now: 0 });
    setReaction('reiki', 'dismissed', 1_000);
    clearReaction('reiki');
    expect(recentlyDismissedSlugs(2_000)).toEqual([]);
  });
});
