import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkInToday,
  clearReaction,
  rateCheckIn,
  recentlyDismissedSlugs,
  saveMatch,
  setReaction,
  toggleCheckIn,
  totalCheckIns,
} from './matches';
import type { MatchResult } from '@/lib/schemas';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

const DAY = '2026-10-15';

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
