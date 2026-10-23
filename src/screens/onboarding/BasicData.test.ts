import { describe, expect, it } from 'vitest';
import { clockParts, joinClock } from './BasicData';

describe('the birth hour on the twelve-hour clock (owner, 22 Oct 2026)', () => {
  it('reads a stored hour as h, minutes and a. m./p. m.', () => {
    expect(clockParts('01:40')).toEqual({ h: '1', m: '40', ampm: 'am' });
    expect(clockParts('13:40')).toEqual({ h: '1', m: '40', ampm: 'pm' });
    expect(clockParts('00:05')).toEqual({ h: '12', m: '05', ampm: 'am' });
    expect(clockParts('12:30')).toEqual({ h: '12', m: '30', ampm: 'pm' });
    expect(clockParts('')).toEqual({ h: '', m: '', ampm: '' });
  });

  it('writes it back on the 24-hour clock, midnight and noon included', () => {
    expect(joinClock('1', '40', 'am')).toBe('01:40');
    expect(joinClock('1', '40', 'pm')).toBe('13:40');
    expect(joinClock('12', '05', 'am')).toBe('00:05');
    expect(joinClock('12', '30', 'pm')).toBe('12:30');
    expect(joinClock('7', '', 'pm')).toBe('19:00');
  });

  it('keeps no hour until a. m. or p. m. is chosen: nothing is assumed', () => {
    expect(joinClock('1', '40', '')).toBe('');
    expect(joinClock('', '', 'pm')).toBe('');
  });

  it('round-trips every minute of the day', () => {
    for (let h = 0; h < 24; h++) {
      const value = `${String(h).padStart(2, '0')}:17`;
      const p = clockParts(value);
      expect(joinClock(p.h, p.m, p.ampm)).toBe(value);
    }
  });
});
