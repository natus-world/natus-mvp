/**
 * The calculated chart, read the Hellenistic way (v1.2 A-01, A-02, O-07).
 *
 * The ephemeris (Astrologer) answers with a text `context` whose houses are
 * Placidus. Everything the product needs is derived here, deterministically,
 * from the positions in that text:
 *
 * - houses in Placidus (owner, 27–28 Oct 2026, after people found their houses
 *   did not match other apps): the provider's own cusps, read from its text;
 *   every point also keeps its house by whole sign — house 1 the whole sign of
 *   the Ascendant, every house 30° — which the full chart can show instead.
 *   Davraz always reads Placidus. Born so near a pole that Placidus cannot be
 *   drawn, or with no cusps to read, the chart falls back to whole sign;
 * - the seven visible planets' traditional rulerships and the ruler of the
 *   Ascendant;
 * - essential dignities: domicile, exaltation, exile, fall;
 * - the sect: a day chart when the Sun is above the horizon;
 * - aspects by sign (decided by the owner, 15 Oct 2026): two points are in
 *   aspect when their signs are, whatever the degrees — the separation in
 *   degrees is kept beside it as information, never as a condition.
 *
 * Calculated here, like the numerology, so the model receives them as given
 * and is told not to recompute them. Without the hour of birth there is no
 * Ascendant and no house: the fields are null, never guessed. The sect then
 * comes only from the person, who may say whether they were born by day or by
 * night (owner, 22 Oct 2026), and the Moon is kept only when its sign is
 * certain (`moonSignCertain`): a chart without the hour is cast at noon, and
 * the Moon may change sign during the day.
 *
 * Pure: no I/O, no browser, so the Edge Function and the browser run the
 * same code.
 */

export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

export const TRADITIONAL = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
export type Traditional = (typeof TRADITIONAL)[number];

const RULER: Record<Sign, Traditional> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

const EXALTATION: Record<Traditional, Sign> = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mercury: 'Virgo',
  Venus: 'Pisces',
  Mars: 'Capricorn',
  Jupiter: 'Cancer',
  Saturn: 'Libra',
};

const ELEMENT = ['fire', 'earth', 'air', 'water'] as const;
const MODALITY = ['cardinal', 'fixed', 'mutable'] as const;

export type Dignity = 'domicilio' | 'exaltacion' | 'exilio' | 'caida';

export type ChartPoint = {
  name: string;
  sign: Sign;
  /** Degrees within the sign, 0 to 30. */
  degree: number;
  /** Ecliptic longitude, 0 to 360. */
  longitude: number;
  retrograde: boolean;
  element: (typeof ELEMENT)[number];
  modality: (typeof MODALITY)[number];
  /** House in the chart's `house_system`, 1 to 12. Null without the hour of birth. */
  house: number | null;
  /** House by whole sign, 1 to 12, for the full chart's selector. Null without the hour of birth. */
  whole_sign_house: number | null;
  /** The seven visible planets only. Null for everything else, and when none applies. */
  dignity: Dignity | null;
};

/** Signs apart → aspect. 1, 5, 7 and 11 signs apart are in aversion: no aspect. */
const ASPECT_BY_DISTANCE: Record<number, ChartAspect['type']> = {
  0: 'conjunction',
  2: 'sextile',
  3: 'square',
  4: 'trine',
  6: 'opposition',
  8: 'trine',
  9: 'square',
  10: 'sextile',
};

export type ChartAspect = {
  a: string;
  b: string;
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  /** Degrees between the two points along the ecliptic, 0 to 180. Information only. */
  separation: number;
};

export const NATAL_CHART_VERSION = 'placidus-v1';

/** Placidus unless it cannot be drawn (a birth near a pole) or the text has no cusps. */
export type HouseSystem = 'placidus' | 'whole_sign';

export type NatalChart = {
  version: typeof NATAL_CHART_VERSION;
  house_system: HouseSystem;
  /** The twelve Placidus cusps as ecliptic longitudes, house 1 first. Null by whole sign or without the hour. */
  cusps: number[] | null;
  has_birth_time: boolean;
  points: ChartPoint[];
  /** Null without the hour of birth. */
  ascendant: { sign: Sign; degree: number } | null;
  /** The traditional ruler of the Ascendant's sign, and where it sits. */
  ascendant_ruler: { planet: Traditional; sign: Sign; house: number | null } | null;
  /** Day or night chart, and the planets of that sect. Without the hour, only as the person said it. */
  sect: { kind: 'diurna' | 'nocturna'; planets: Traditional[] } | null;
  /** By sign, between every pair of points that are not the same axis. */
  aspects: ChartAspect[];
};

/** The Descendant and the Imum Coeli only mirror the Ascendant and the Midheaven. */
const MIRRORS = new Set(['Descendant', 'Imum_Coeli']);
/** Lilith is read by its sign and house only (owner, 28 Oct 2026): no aspect. */
const NO_ASPECTS = new Set(['Mean_Lilith', 'True_Lilith', 'Lilith']);
/** Pairs that are always in the same relation, so saying it says nothing. */
const FIXED_PAIRS = new Set([
  'True_North_Lunar_Node|True_South_Lunar_Node',
  'Mean_North_Lunar_Node|Mean_South_Lunar_Node',
  'Ascendant|Descendant',
  'Imum_Coeli|Medium_Coeli',
]);

export function aspectsBySign(points: readonly ChartPoint[]): ChartAspect[] {
  const usable = points.filter((p) => !MIRRORS.has(p.name) && !NO_ASPECTS.has(p.name));
  const aspects: ChartAspect[] = [];
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i]!;
      const b = usable[j]!;
      if (FIXED_PAIRS.has([a.name, b.name].sort().join('|'))) continue;
      const distance = (signIndex(b.sign) - signIndex(a.sign) + 12) % 12;
      const type = ASPECT_BY_DISTANCE[distance];
      if (!type) continue;
      const raw = Math.abs(a.longitude - b.longitude) % 360;
      const separation = Math.round(Math.min(raw, 360 - raw) * 10) / 10;
      aspects.push({ a: a.name, b: b.name, type, separation });
    }
  }
  return aspects;
}

export class ChartParseError extends Error {}

/** The placements a recommendation may cite: the seven visible planets and the Ascendant. */
export const MAIN_POINTS = [...TRADITIONAL, 'Ascendant'] as const;
export type MainPoint = (typeof MAIN_POINTS)[number];
export type Placement = { name: MainPoint; sign: Sign; house: number | null };

/** An aspect between two charts, by sign. No orb: it is never shown. */
export type CrossAspect = { a_body: MainPoint; b_body: MainPoint; type: ChartAspect['type'] };

/**
 * v1.2 A-02: the aspects between two charts, by sign, as in one chart. Read
 * between the seven visible planets and the Ascendant of each — the points
 * the tradition reads between two people — so the list stays one a reading
 * can hold.
 */
export function aspectsBetween(a: readonly ChartPoint[], b: readonly ChartPoint[]): CrossAspect[] {
  const main = (points: readonly ChartPoint[]) =>
    points.filter((p): p is ChartPoint & { name: MainPoint } => (MAIN_POINTS as readonly string[]).includes(p.name));
  const aspects: CrossAspect[] = [];
  for (const pa of main(a)) {
    for (const pb of main(b)) {
      const type = ASPECT_BY_DISTANCE[(signIndex(pb.sign) - signIndex(pa.sign) + 12) % 12];
      if (type) aspects.push({ a_body: pa.name, b_body: pb.name, type });
    }
  }
  return aspects;
}

export function mainPlacements(chart: NatalChart): Placement[] {
  return chart.points
    .filter((p): p is ChartPoint & { name: MainPoint } => (MAIN_POINTS as readonly string[]).includes(p.name))
    .map((p) => ({ name: p.name, sign: p.sign, house: p.house }));
}

function signIndex(sign: string): number {
  return SIGNS.indexOf(sign as Sign);
}

export function dignityOf(planet: string, sign: Sign): Dignity | null {
  if (!(TRADITIONAL as readonly string[]).includes(planet)) return null;
  const p = planet as Traditional;
  const opposite = SIGNS[(signIndex(sign) + 6) % 12]!;
  if (RULER[sign] === p) return 'domicilio';
  if (EXALTATION[p] === sign) return 'exaltacion';
  if (RULER[opposite] === p) return 'exilio';
  if (EXALTATION[p] === opposite) return 'caida';
  return null;
}

/** The traditional ruler of a sign. */
export function rulerOf(sign: Sign): Traditional {
  return RULER[sign];
}

/** House by whole sign, counted from the Ascendant's sign. */
export function wholeSignHouse(sign: Sign, ascendantSign: Sign): number {
  return ((signIndex(sign) - signIndex(ascendantSign) + 12) % 12) + 1;
}

const arc = (from: number, to: number) => (((to - from) % 360) + 360) % 360;

/** The house a longitude falls in, between the cusps (house 1 first): a point on a cusp opens that house. */
export function placidusHouse(longitude: number, cusps: readonly number[]): number {
  for (let i = 0; i < 12; i++) {
    if (arc(cusps[i]!, longitude) < arc(cusps[i]!, cusps[(i + 1) % 12]!)) return i + 1;
  }
  return 1;
}

const HOUSE_NAMES = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];

/**
 * Within the polar circles the Placidus cusps cannot be drawn for every hour;
 * the ephemeris then quietly draws another system. Whole sign is said instead.
 */
export const POLAR_LATITUDE = 66;

/**
 * The provider's Placidus cusps, `<house name="First_House" cusp="13.92"
 * sign="Leo" />` — `cusp` is the degree within the sign — as longitudes, house
 * 1 first. Null when any of the twelve is missing or unreadable.
 */
export function readCusps(context: string): number[] | null {
  const cusps: (number | null)[] = Array.from({ length: 12 }, () => null);
  for (const match of context.matchAll(/<house\b[^>]*\/>/g)) {
    const tag = match[0];
    const name = attribute(tag, 'name')?.replace(/[_ ]House$/, '');
    const index = name ? HOUSE_NAMES.indexOf(name) : -1;
    const sign = attribute(tag, 'sign') ?? '';
    const degree = Number(attribute(tag, 'cusp'));
    if (index < 0 || signIndex(sign) < 0 || !Number.isFinite(degree) || degree < 0 || degree >= 30) continue;
    cusps[index] = Math.round((signIndex(sign) * 30 + degree) * 100) / 100;
  }
  return cusps.every((c) => c !== null) ? (cusps as number[]) : null;
}

/** The birth latitude the provider wrote, or null. */
export function birthLatitude(context: string): number | null {
  const tag = /<birth_data\b[^>]*\/?>/.exec(context)?.[0];
  const lat = tag ? Number(attribute(tag, 'lat')) : NaN;
  return Number.isFinite(lat) ? lat : null;
}

type RawPoint = { name: string; sign: string; position: number; abs_pos: number; motion: string };

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? match[1]! : null;
}

/** Every `<point …/>` in the provider's context, planets and axes alike. */
export function readPoints(context: string): RawPoint[] {
  const points: RawPoint[] = [];
  for (const match of context.matchAll(/<point\b[^>]*\/>/g)) {
    const tag = match[0];
    const name = attribute(tag, 'name');
    const sign = attribute(tag, 'sign');
    const position = Number(attribute(tag, 'position'));
    const abs = Number(attribute(tag, 'abs_pos'));
    if (!name || !sign || signIndex(sign) < 0 || !Number.isFinite(position) || !Number.isFinite(abs)) continue;
    points.push({ name, sign, position, abs_pos: abs, motion: attribute(tag, 'motion') ?? 'direct' });
  }
  return points;
}

const AXES = new Set(['Ascendant', 'Descendant', 'Medium_Coeli', 'Imum_Coeli']);

/** Whether the person said they were born by day or by night (no hour known). */
export type DayNight = 'dia' | 'noche';

/** The Moon moves at most about 15.4° a day, about 0.65° an hour. */
const MOON_DEGREES_PER_HOUR = 0.65;

/**
 * Whether the Moon's sign at local noon is its sign at birth, the hour not
 * being known (owner, 22 Oct 2026: nothing is guessed). Born any time that
 * day, the Moon was within twelve hours of noon; born by day, within nine
 * (05:00 to 21:00 covers the longest daylight with some room). It kept its
 * sign if it was that far from both edges.
 */
export function moonSignCertain(degreeInSign: number, dayNight: DayNight | null): boolean {
  const margin = (dayNight === 'dia' ? 9 : 12) * MOON_DEGREES_PER_HOUR;
  return degreeInSign >= margin && degreeInSign <= 30 - margin;
}

export function buildNatalChart(context: string, hasBirthTime: boolean, dayNight: DayNight | null = null): NatalChart {
  const raw = readPoints(context);
  const sun = raw.find((p) => p.name === 'Sun');
  if (!sun) throw new ChartParseError('The chart has no Sun to read.');

  const asc = hasBirthTime ? raw.find((p) => p.name === 'Ascendant') : undefined;
  const ascSign = asc ? (asc.sign as Sign) : null;

  // Placidus when its cusps are there, the first on the Ascendant, and the
  // birth was not so near a pole that they cannot be drawn.
  const read = asc ? readCusps(context) : null;
  const latitude = birthLatitude(context);
  const cusps =
    read && asc && Math.min(arc(read[0]!, asc.abs_pos), arc(asc.abs_pos, read[0]!)) < 0.5 &&
    (latitude === null || Math.abs(latitude) < POLAR_LATITUDE)
      ? read
      : null;

  const points: ChartPoint[] = raw
    // Without the hour the angles are inventions of the noon that stood in for it.
    .filter((p) => ascSign !== null || !AXES.has(p.name))
    // And the Moon too, unless its sign is certain all that day.
    .filter((p) => ascSign !== null || p.name !== 'Moon' || moonSignCertain(p.position, dayNight))
    .map((p) => {
      const sign = p.sign as Sign;
      const index = signIndex(sign);
      return {
        name: p.name,
        sign,
        degree: Math.round(p.position * 100) / 100,
        longitude: Math.round(p.abs_pos * 100) / 100,
        retrograde: p.motion === 'retrograde',
        element: ELEMENT[index % 4]!,
        modality: MODALITY[index % 3]!,
        house: ascSign ? (cusps ? placidusHouse(p.abs_pos, cusps) : wholeSignHouse(sign, ascSign)) : null,
        whole_sign_house: ascSign ? wholeSignHouse(sign, ascSign) : null,
        dignity: dignityOf(p.name, sign),
      };
    });

  let ascendantRuler: NatalChart['ascendant_ruler'] = null;
  let sect: NatalChart['sect'] = null;
  if (asc && ascSign) {
    const planet = RULER[ascSign];
    const where = points.find((p) => p.name === planet);
    ascendantRuler = where ? { planet, sign: where.sign, house: where.house } : null;

    // Ecliptic longitude runs counterclockwise from the Ascendant: the first
    // 180° are below the horizon, the next 180° above it.
    const fromAscendant = (sun.abs_pos - asc.abs_pos + 360) % 360;
    sect =
      fromAscendant > 180
        ? { kind: 'diurna', planets: ['Sun', 'Jupiter', 'Saturn'] }
        : { kind: 'nocturna', planets: ['Moon', 'Venus', 'Mars'] };
  } else if (dayNight) {
    // Said by the person: by day the Sun was above the horizon.
    sect =
      dayNight === 'dia'
        ? { kind: 'diurna', planets: ['Sun', 'Jupiter', 'Saturn'] }
        : { kind: 'nocturna', planets: ['Moon', 'Venus', 'Mars'] };
  }

  return {
    version: NATAL_CHART_VERSION,
    house_system: cusps ? 'placidus' : 'whole_sign',
    cusps,
    has_birth_time: ascSign !== null,
    points,
    ascendant: asc && ascSign ? { sign: ascSign, degree: Math.round(asc.position * 100) / 100 } : null,
    ascendant_ruler: ascendantRuler,
    sect,
    aspects: aspectsBySign(points),
  };
}
