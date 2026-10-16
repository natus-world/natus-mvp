import { describe, expect, it } from 'vitest';
import { isAdultOn, latestAdultBirthDate } from './age.ts';

const TODAY = new Date(2026, 9, 16);

describe('only adults (owner, 16 Oct 2026)', () => {
  it('lets in whoever turns 18 today', () => {
    expect(latestAdultBirthDate(TODAY)).toBe('2008-10-16');
    expect(isAdultOn('2008-10-16', TODAY)).toBe(true);
  });
  it('keeps out whoever turns 18 tomorrow, and any date to come', () => {
    expect(isAdultOn('2008-10-17', TODAY)).toBe(false);
    expect(isAdultOn('2026-08-14', TODAY)).toBe(false);
    expect(isAdultOn('2030-01-01', TODAY)).toBe(false);
  });
  it('refuses what is not a date', () => {
    expect(isAdultOn('', TODAY)).toBe(false);
    expect(isAdultOn('14/05/1992', TODAY)).toBe(false);
  });
});
