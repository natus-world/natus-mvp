import { beforeEach, describe, expect, it } from 'vitest';
import { checkInToday, rateCheckIn, toggleCheckIn, totalCheckIns } from './matches';
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
