/**
 * Today's sky for one person (v1.2 D-01): the day's transits over their natal
 * chart and their personal day, calculated, never written by a model.
 *
 * Read the Hellenistic way, like the chart (A-02):
 *
 * - the seven visible planets only, transiting and natal, plus the Ascendant
 *   when the hour of birth is known;
 * - aspects by whole sign: a transit is in aspect with a natal point when
 *   their signs are. The distance in degrees from the exact aspect (the orb)
 *   only orders them, as in the chart, never decides whether one exists;
 * - the lord of the year by annual profection (owner, 18 Oct 2026, used only
 *   to choose): the sign that many signs from the Ascendant as years lived,
 *   and its ruler. Its transits weigh more. Nothing about it is said as a
 *   forecast; without the hour there is no Ascendant and no lord.
 *
 * The positions of the day come from the ephemeris once for everybody (they
 * do not depend on where one is); everything personal is done here. Nothing
 * is rated good or bad (owner, 15 Oct 2026): `type` is what the catalog and
 * Davraz read as flowing or asking for more work.
 *
 * Pure: no I/O, no browser, so the Edge Function and the tests run the same
 * code.
 */

import {
  ChartParseError,
  placidusHouse,
  readPoints,
  rulerOf,
  SIGNS,
  TRADITIONAL,
  wholeSignHouse,
  type ChartAspect,
  type NatalChart,
  type Sign,
  type Traditional,
} from './natal-chart.ts';
import { reduce } from './numerology.ts';

export const DAILY_SKY_VERSION = 'daily-sky-v1';

/** Where a planet is on a day. */
export type SkyPoint = {
  name: Traditional;
  sign: Sign;
  /** Degrees within the sign, 0 to 30. */
  degree: number;
  /** Ecliptic longitude, 0 to 360. */
  longitude: number;
  retrograde: boolean;
};

export type NatalTarget = Traditional | 'Ascendant';

export type Transit = {
  /** The planet in the sky today. */
  planet: Traditional;
  /** The point of the natal chart it looks at. */
  natal: NatalTarget;
  type: ChartAspect['type'];
  /** Degrees from the exact aspect. Information and order only. */
  orb: number;
  /** The planet is the lord of the year. */
  lord_of_year: boolean;
};

export type DailySky = {
  version: typeof DAILY_SKY_VERSION;
  /** The person's own calendar day, YYYY-MM-DD. */
  date: string;
  has_birth_time: boolean;
  personal_day: number;
  /** Where the Moon is today: the day's tone. House null without the hour. */
  moon: { sign: Sign; house: number | null };
  /** Null without the hour of birth. */
  lord_of_year: Traditional | null;
  /** Ordered, the main one first. At most `MAX_TRANSITS`. */
  transits: Transit[];
};

export const MAX_TRANSITS = 5;

const EXACT: Record<ChartAspect['type'], number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

const BY_DISTANCE: Record<number, ChartAspect['type']> = {
  0: 'conjunction',
  2: 'sextile',
  3: 'square',
  4: 'trine',
  6: 'opposition',
  8: 'trine',
  9: 'square',
  10: 'sextile',
};

function signIndex(sign: Sign): number {
  return SIGNS.indexOf(sign);
}

/** The seven planets from the ephemeris' text for the day. */
export function skyFromContext(context: string): SkyPoint[] {
  const raw = readPoints(context);
  const sky: SkyPoint[] = [];
  for (const name of TRADITIONAL) {
    const p = raw.find((r) => r.name === name);
    if (!p) throw new ChartParseError(`The day's sky has no ${name}.`);
    sky.push({
      name,
      sign: p.sign as Sign,
      degree: Math.round(p.position * 100) / 100,
      longitude: Math.round(p.abs_pos * 100) / 100,
      retrograde: p.motion === 'retrograde',
    });
  }
  return sky;
}

/** Narrows a stored sky (jsonb) before it is used. */
export function parseSky(value: unknown): SkyPoint[] | null {
  if (!Array.isArray(value)) return null;
  const sky: SkyPoint[] = [];
  for (const name of TRADITIONAL) {
    const p = value.find(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && (v as { name?: unknown }).name === name,
    );
    if (
      !p ||
      !SIGNS.includes(p.sign as Sign) ||
      typeof p.degree !== 'number' ||
      typeof p.longitude !== 'number' ||
      typeof p.retrograde !== 'boolean'
    ) {
      return null;
    }
    sky.push({ name, sign: p.sign as Sign, degree: p.degree, longitude: p.longitude, retrograde: p.retrograde });
  }
  return sky;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso: string): [number, number, number] | null {
  const m = DATE.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return [y, mo, d];
}

export function isCalendarDate(iso: string): boolean {
  return parts(iso) !== null;
}

const digitSum = (n: number) =>
  String(n)
    .split('')
    .reduce((a, d) => a + Number(d), 0);

/**
 * Personal day, Pythagorean, with the reductions of PDR 6.2 (masters kept):
 * personal year = birth day + birth month + the calendar year, each reduced;
 * personal month = personal year + the month; personal day = personal month
 * + the day.
 */
export function personalDay(birthDate: string, date: string): number {
  const birth = parts(birthDate);
  const today = parts(date);
  if (!birth || !today) throw new RangeError('Expected two YYYY-MM-DD dates.');
  const year = reduce(reduce(birth[2]) + reduce(birth[1]) + reduce(digitSum(today[0])));
  const month = reduce(year + reduce(today[1]));
  return reduce(month + reduce(today[2]));
}

/** Whole years lived on `date`. */
export function yearsLived(birthDate: string, date: string): number {
  const birth = parts(birthDate);
  const today = parts(date);
  if (!birth || !today) throw new RangeError('Expected two YYYY-MM-DD dates.');
  const before = today[1] < birth[1] || (today[1] === birth[1] && today[2] < birth[2]);
  return today[0] - birth[0] - (before ? 1 : 0);
}

/** Annual profection: one sign a year from the Ascendant; its ruler is the lord of the year. */
export function lordOfYear(ascendant: Sign, years: number): Traditional {
  const sign = SIGNS[(signIndex(ascendant) + (((years % 12) + 12) % 12)) % 12]!;
  return rulerOf(sign);
}

// How much each part weighs in choosing. Not shown anywhere.
const PLANET_WEIGHT: Record<Traditional, number> = {
  // The Moon changes sign every two and a half days: the day's own tone.
  Moon: 3,
  Sun: 2,
  Mercury: 1,
  Venus: 1,
  Mars: 1,
  Jupiter: 1,
  Saturn: 1,
};
const NATAL_WEIGHT: Partial<Record<NatalTarget, number>> = { Sun: 2, Moon: 2, Ascendant: 2 };
// Conjunction, opposition and square are the strong aspects of the tradition;
// strong is not hard, and a trine is not better.
const ASPECT_WEIGHT: Record<ChartAspect['type'], number> = {
  conjunction: 1,
  opposition: 1,
  square: 1,
  trine: 0,
  sextile: 0,
};

function closeness(orb: number): number {
  if (orb <= 1) return 3;
  if (orb <= 3) return 2;
  if (orb <= 6) return 1;
  return 0;
}

export function dailySky(input: {
  chart: NatalChart;
  sky: readonly SkyPoint[];
  birthDate: string;
  date: string;
}): DailySky {
  const { chart, sky, birthDate, date } = input;
  const asc = chart.has_birth_time ? chart.ascendant : null;
  const lord = asc ? lordOfYear(asc.sign, yearsLived(birthDate, date)) : null;
  const ascRuler = chart.ascendant_ruler?.planet ?? null;

  const targets = chart.points.filter(
    (p): p is typeof p & { name: NatalTarget } =>
      (TRADITIONAL as readonly string[]).includes(p.name) || (p.name === 'Ascendant' && asc !== null),
  );

  const scored: { transit: Transit; score: number }[] = [];
  for (const planet of sky) {
    for (const natal of targets) {
      const type = BY_DISTANCE[(signIndex(natal.sign) - signIndex(planet.sign) + 12) % 12];
      if (!type) continue;
      const raw = Math.abs(planet.longitude - natal.longitude) % 360;
      const separation = Math.min(raw, 360 - raw);
      const orb = Math.round(Math.abs(separation - EXACT[type]) * 10) / 10;
      const isLord = planet.name === lord;
      const score =
        PLANET_WEIGHT[planet.name] +
        (NATAL_WEIGHT[natal.name] ?? 0) +
        (natal.name === ascRuler ? 1 : 0) +
        ASPECT_WEIGHT[type] +
        closeness(orb) +
        (isLord ? 3 : 0) +
        (natal.name === lord ? 1 : 0);
      scored.push({ transit: { planet: planet.name, natal: natal.name, type, orb, lord_of_year: isLord }, score });
    }
  }

  // Highest first; then the closer; then a fixed order, so the same day
  // always gives the same list.
  const order = (t: Transit) => TRADITIONAL.indexOf(t.planet) * 10 + (t.natal === 'Ascendant' ? 9 : TRADITIONAL.indexOf(t.natal));
  scored.sort((a, b) => b.score - a.score || a.transit.orb - b.transit.orb || order(a.transit) - order(b.transit));

  const moon = sky.find((p) => p.name === 'Moon')!;
  return {
    version: DAILY_SKY_VERSION,
    date,
    has_birth_time: asc !== null,
    personal_day: personalDay(birthDate, date),
    // In the chart's own houses: Placidus, as Davraz reads it (owner, 28–30 Oct 2026).
    moon: {
      sign: moon.sign,
      house: asc
        ? chart.house_system === 'placidus' && chart.cusps
          ? placidusHouse(moon.longitude, chart.cusps)
          : wholeSignHouse(moon.sign, asc.sign)
        : null,
    },
    lord_of_year: lord,
    transits: scored.slice(0, MAX_TRANSITS).map((s) => s.transit),
  };
}
