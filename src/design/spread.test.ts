import { describe, expect, it } from 'vitest';
import { spreadApart } from './spread';

const gap = (a: number, b: number) => Math.min(Math.abs(a - b) % 360, 360 - (Math.abs(a - b) % 360));

describe('spreadApart', () => {
  it('pulls apart points on the same degree instead of letting them cross', () => {
    const shown = spreadApart(
      [
        { id: 'Uranus', d: 280 },
        { id: 'Neptune', d: 286 },
        { id: 'Saturn', d: 298 },
        { id: 'Pluto', d: 286 },
      ],
      13,
    );
    const ds = [...shown.values()].sort((a, b) => a - b);
    for (let i = 1; i < ds.length; i++) expect(gap(ds[i]!, ds[i - 1]!)).toBeGreaterThanOrEqual(12.9);
  });

  it('leaves points that are far enough where they are', () => {
    const shown = spreadApart(
      [
        { id: 'Sun', d: 10 },
        { id: 'Moon', d: 200 },
      ],
      13,
    );
    expect(shown.get('Sun')).toBe(10);
    expect(shown.get('Moon')).toBe(200);
  });
});
