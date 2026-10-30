import { describe, expect, it } from 'vitest';
import {
  AREA_KEYS,
  AREAS,
  areaBalance,
  areasProblem,
  keepAreas,
  areasBetween,
  crossLabel,
  crossesToLabel,
  typeBySign,
  type AreaCross,
} from './comparison-areas.ts';
import { NATAL_CHART_VERSION, SIGNS, wholeSignHouse, type NatalChart, type Sign } from './natal-chart.ts';

/** A chart by hand: each body in a sign at 10°, houses from the Ascendant when there is one. */
function chart(signs: Partial<Record<string, Sign>>, ascendant: Sign | null): NatalChart {
  const points = Object.entries(signs).map(([name, sign]) => ({
    name,
    sign: sign!,
    degree: 10,
    longitude: SIGNS.indexOf(sign!) * 30 + 10,
    retrograde: false,
    element: 'fire' as const,
    modality: 'cardinal' as const,
    house: ascendant ? wholeSignHouse(sign!, ascendant) : null,
    whole_sign_house: ascendant ? wholeSignHouse(sign!, ascendant) : null,
    dignity: null,
  }));
  return {
    version: NATAL_CHART_VERSION,
    house_system: 'whole_sign',
    cusps: null,
    has_birth_time: ascendant !== null,
    points,
    ascendant: ascendant ? { sign: ascendant, degree: 12 } : null,
    ascendant_ruler: null,
    sect: null,
    aspects: [],
  };
}

const FRANCISCA = chart(
  { Sun: 'Gemini', Moon: 'Pisces', Mercury: 'Gemini', Venus: 'Taurus', Mars: 'Leo', Jupiter: 'Sagittarius', Saturn: 'Capricorn' },
  'Libra',
);
const TOMAS = chart(
  { Sun: 'Aries', Moon: 'Scorpio', Mercury: 'Pisces', Venus: 'Virgo', Mars: 'Taurus', Jupiter: 'Capricorn', Saturn: 'Cancer' },
  'Leo',
);

describe('typeBySign', () => {
  it('reads the aspect from the distance between the signs, either way round', () => {
    expect(typeBySign('Gemini', 'Aries')).toBe('sextile');
    expect(typeBySign('Aries', 'Gemini')).toBe('sextile');
    expect(typeBySign('Leo', 'Taurus')).toBe('square');
    expect(typeBySign('Pisces', 'Scorpio')).toBe('trine');
    expect(typeBySign('Capricorn', 'Cancer')).toBe('opposition');
    expect(typeBySign('Taurus', 'Taurus')).toBe('conjunction');
    // 1, 5, 7 and 11 signs apart do not see each other.
    expect(typeBySign('Aries', 'Taurus')).toBeNull();
    expect(typeBySign('Aries', 'Virgo')).toBeNull();
    expect(typeBySign('Aries', 'Scorpio')).toBeNull();
    expect(typeBySign('Aries', 'Pisces')).toBeNull();
  });
});

describe('areasBetween', () => {
  it('gives the twelve areas in the owner’s order when both have the hour', () => {
    expect(areasBetween(FRANCISCA, TOMAS).map((a) => a.key)).toEqual([...AREA_KEYS]);
  });

  it('keeps each cross in the order the area names it, A’s body and B’s body', () => {
    const given = areasBetween(FRANCISCA, TOMAS).find((a) => a.key === 'lo_que_se_dan')!;
    expect(given.crosses.map((c) => [c.first, c.a.body, c.b.body])).toEqual([
      ['a', 'Sun', 'Moon'],
      ['b', 'Moon', 'Sun'],
    ]);
    // Francisca's Sun in Gemini, Tomás's Moon in Scorpio: five signs apart.
    expect(given.crosses[0]!.type).toBeNull();
  });

  it('names the planets of the table for each area', () => {
    for (const def of AREAS) expect(def.crosses.length).toBeGreaterThan(0);
    const sex = areasBetween(FRANCISCA, TOMAS).find((a) => a.key === 'sexualidad')!;
    expect(sex.crosses.map((c) => `${c.a.body}/${c.b.body}`)).toEqual([
      'Venus/Mars',
      'Mars/Venus',
      'Mars/Mars',
      'Moon/Venus',
      'Venus/Moon',
    ]);
  });

  it('reads the houses an area looks at only in a chart that has them', () => {
    const sex = areasBetween(FRANCISCA, TOMAS).find((a) => a.key === 'sexualidad')!;
    // Tomás's Mars in Taurus falls in Francisca's 8th (Libra rising).
    expect(sex.overlays).toContainEqual({ of: 'b', body: 'Mars', inHouseOf: 'a', house: 8 });
    const noHour = chart({ Sun: 'Gemini', Venus: 'Taurus', Mars: 'Leo', Moon: 'Pisces' }, null);
    const without = areasBetween(noHour, TOMAS).find((a) => a.key === 'sexualidad')!;
    expect(without.overlays.every((o) => o.inHouseOf === 'b')).toBe(true);
  });

  it('reads the houses in the host chart\'s Placidus when it has them (owner, 30 Oct 2026)', () => {
    // Equal houses from Francisca's Ascendant: the 8th opens at 12° Taurus, so Mars at 10° Taurus is in her 7th.
    const asc = SIGNS.indexOf(FRANCISCA.ascendant!.sign) * 30 + FRANCISCA.ascendant!.degree;
    const cusps = Array.from({ length: 12 }, (_, i) => (asc + i * 30) % 360);
    const host: NatalChart = { ...FRANCISCA, house_system: 'placidus', cusps };
    const sex = areasBetween(host, TOMAS).find((a) => a.key === 'sexualidad')!;
    expect(sex.overlays.some((o) => o.of === 'b' && o.body === 'Mars')).toBe(false);
    const work = areasBetween(host, TOMAS).flatMap((a) => a.overlays).filter((o) => o.of === 'b' && o.body === 'Mars');
    expect(work.every((o) => o.house !== 8)).toBe(true);
  });

  it('leaves out «Cómo se ven juntos» unless both have the hour', () => {
    const noHour = chart({ Sun: 'Gemini', Moon: 'Pisces' }, null);
    expect(areasBetween(noHour, TOMAS).some((a) => a.key === 'como_se_ven')).toBe(false);
    expect(areasBetween(TOMAS, noHour).some((a) => a.key === 'como_se_ven')).toBe(false);
  });

  it('reads only what is there when a Moon is not certain, and drops an area left with nothing', () => {
    const noMoon = chart(
      { Sun: 'Gemini', Mercury: 'Gemini', Venus: 'Taurus', Mars: 'Leo', Jupiter: 'Sagittarius', Saturn: 'Capricorn' },
      null,
    );
    const areas = areasBetween(noMoon, TOMAS);
    expect(areas.some((a) => a.key === 'lo_que_sienten')).toBe(false);
    const given = areas.find((a) => a.key === 'lo_que_se_dan')!;
    expect(given.crosses.map((c) => c.a.body)).toEqual(['Sun']);
  });

  it('turns round with the reader: the same crosses, each person’s body on their side', () => {
    const mine = areasBetween(FRANCISCA, TOMAS).find((a) => a.key === 'atraccion')!;
    const theirs = areasBetween(TOMAS, FRANCISCA).find((a) => a.key === 'atraccion')!;
    expect(theirs.crosses.map((c) => [c.a.sign, c.b.sign])).toEqual(
      [...mine.crosses].reverse().map((c) => [c.b.sign, c.a.sign]),
    );
  });
});

describe('labels', () => {
  it('fixes the label of an opposition, a conjunction and signs that do not see each other', () => {
    const none = () => undefined;
    const cross = (type: AreaCross['type']) => ({ type }) as AreaCross;
    expect(crossLabel(cross('opposition'), none)).toBe('opuestos');
    expect(crossLabel(cross('conjunction'), none)).toBe('funden');
    expect(crossLabel(cross(null), none)).toBe('sin');
    expect(crossLabel(cross('trine'), () => 'cultiva')).toBe('cultiva');
    expect(crossLabel(cross('square'), none)).toBeNull();
  });

  it('asks Davraz for every trine, sextile and square once, and nothing else', () => {
    const asked = crossesToLabel(areasBetween(FRANCISCA, TOMAS));
    const keys = asked.map((x) => `${x.a_body}|${x.b_body}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(asked.every((x) => ['trine', 'sextile', 'square'].includes(x.type))).toBe(true);
    // Sun in Gemini and Sun in Aries: a sextile.
    expect(asked).toContainEqual({ a_body: 'Sun', b_body: 'Sun', type: 'sextile' });
  });

  it('balances an area without a number: a conjunction half each way, no cross nothing', () => {
    expect(areaBalance(['fluye', 'cultiva', 'trabajo', 'opuestos', 'funden', 'sin', null])).toEqual({
      flow: 2.5,
      work: 2.5,
    });
    expect(areaBalance(['sin'])).toEqual({ flow: 0, work: 0 });
  });
});

describe('areasProblem', () => {
  const areas = areasBetween(FRANCISCA, TOMAS);
  const labels = crossesToLabel(areas).map((x) => ({ a_body: x.a_body, b_body: x.b_body, label: 'fluye' }));
  const whole = {
    areas: areas.map((a) => ({ key: a.key })),
    cross_labels: labels,
    astro_dialogue: { aspects: [{ a_body: 'Sun', b_body: 'Sun', flow: 'fluye' }] },
  };

  it('accepts every area in order and every cross labelled once', () => {
    expect(areasProblem(whole, areas)).toBeNull();
  });

  it('asks again for an area missing or out of order', () => {
    expect(areasProblem({ ...whole, areas: whole.areas.slice(1) }, areas)).toMatch(/"areas" must be/);
    expect(areasProblem({ ...whole, areas: [...whole.areas].reverse() }, areas)).toMatch(/"areas" must be/);
  });

  it('asks again for a label missing, invented or twice', () => {
    expect(areasProblem({ ...whole, cross_labels: labels.slice(1) }, areas)).toMatch(/Missing/);
    expect(
      areasProblem({ ...whole, cross_labels: [...labels, { a_body: 'Pluto', b_body: 'Sun', label: 'fluye' }] }, areas),
    ).toMatch(/Not asked for/);
    expect(areasProblem({ ...whole, cross_labels: [...labels, labels[0]!] }, areas)).toMatch(/exactly/);
  });

  it('asks again when a label goes against the flow of the same aspect', () => {
    const work = { ...whole, astro_dialogue: { aspects: [{ a_body: 'Sun', b_body: 'Sun', flow: 'pide_trabajo' }] } };
    expect(areasProblem(work, areas)).toMatch(/does not agree/);
    const cultivated = {
      ...whole,
      cross_labels: labels.map((l) => (l.a_body === 'Sun' && l.b_body === 'Sun' ? { ...l, label: 'cultiva' } : l)),
    };
    expect(areasProblem(cultivated, areas)).toBeNull();
  });

  it('accepts empty lists when there were no charts to cross', () => {
    expect(areasProblem({ areas: [], cross_labels: [], astro_dialogue: { aspects: [] } }, [])).toBeNull();
  });
});

describe('keepAreas', () => {
  const areas = areasBetween(FRANCISCA, TOMAS);
  const labels = crossesToLabel(areas).map((x) => ({ a_body: x.a_body, b_body: x.b_body, label: 'fluye' }));
  const base = { astro_dialogue: { aspects: [] } };

  it('puts the areas back in order, drops the ones not sent and the labels not asked for or twice', () => {
    const kept = keepAreas(
      {
        ...base,
        areas: [...areas.map((a) => ({ key: a.key })).reverse(), { key: 'inventada' }],
        cross_labels: [...labels, labels[0]!, { a_body: 'Pluto', b_body: 'Sun', label: 'fluye' }],
      },
      areas,
    );
    expect(kept.areas.map((a) => a.key)).toEqual(areas.map((a) => a.key));
    expect(kept.cross_labels).toEqual(labels);
    expect(areasProblem(kept, areas)).toBeNull();
  });

  it('leaves what is missing for areasProblem to ask again', () => {
    const kept = keepAreas({ ...base, areas: [], cross_labels: [] }, areas);
    expect(areasProblem(kept, areas)).toMatch(/"areas" must be/);
  });
});
