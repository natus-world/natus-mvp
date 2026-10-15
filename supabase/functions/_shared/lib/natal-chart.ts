/**
 * The calculated chart, read the Hellenistic way (v1.2 A-01, A-02, O-07).
 *
 * The ephemeris (Astrologer) answers with a text `context` whose houses are
 * Placidus. Everything the product needs is derived here, deterministically,
 * from the positions in that text:
 *
 * - houses by whole sign: house 1 is the whole sign of the Ascendant, house 2
 *   the next sign, every house 30°;
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
 * Ascendant, no house and no sect: the fields are null, never guessed.
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
  /** Whole-sign house, 1 to 12. Null without the hour of birth. */
  house: number | null;
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

export const NATAL_CHART_VERSION = 'whole-sign-v2';

export type NatalChart = {
  version: typeof NATAL_CHART_VERSION;
  house_system: 'whole_sign';
  has_birth_time: boolean;
  points: ChartPoint[];
  /** Null without the hour of birth. */
  ascendant: { sign: Sign; degree: number } | null;
  /** The traditional ruler of the Ascendant's sign, and where it sits. */
  ascendant_ruler: { planet: Traditional; sign: Sign; house: number | null } | null;
  /** Day or night chart, and the planets of that sect. Null without the hour. */
  sect: { kind: 'diurna' | 'nocturna'; planets: Traditional[] } | null;
  /** By sign, between every pair of points that are not the same axis. */
  aspects: ChartAspect[];
};

/** The Descendant and the Imum Coeli only mirror the Ascendant and the Midheaven. */
const MIRRORS = new Set(['Descendant', 'Imum_Coeli']);
/** Pairs that are always in the same relation, so saying it says nothing. */
const FIXED_PAIRS = new Set([
  'True_North_Lunar_Node|True_South_Lunar_Node',
  'Mean_North_Lunar_Node|Mean_South_Lunar_Node',
  'Ascendant|Descendant',
  'Imum_Coeli|Medium_Coeli',
]);

export function aspectsBySign(points: readonly ChartPoint[]): ChartAspect[] {
  const usable = points.filter((p) => !MIRRORS.has(p.name));
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

/** House by whole sign, counted from the Ascendant's sign. */
export function wholeSignHouse(sign: Sign, ascendantSign: Sign): number {
  return ((signIndex(sign) - signIndex(ascendantSign) + 12) % 12) + 1;
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

export function buildNatalChart(context: string, hasBirthTime: boolean): NatalChart {
  const raw = readPoints(context);
  const sun = raw.find((p) => p.name === 'Sun');
  if (!sun) throw new ChartParseError('The chart has no Sun to read.');

  const asc = hasBirthTime ? raw.find((p) => p.name === 'Ascendant') : undefined;
  const ascSign = asc ? (asc.sign as Sign) : null;

  const points: ChartPoint[] = raw
    // Without the hour the angles are inventions of the noon that stood in for it.
    .filter((p) => ascSign !== null || !AXES.has(p.name))
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
        house: ascSign ? wholeSignHouse(sign, ascSign) : null,
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
  }

  return {
    version: NATAL_CHART_VERSION,
    house_system: 'whole_sign',
    has_birth_time: ascSign !== null,
    points,
    ascendant: asc && ascSign ? { sign: ascSign, degree: Math.round(asc.position * 100) / 100 } : null,
    ascendant_ruler: ascendantRuler,
    sect,
    aspects: aspectsBySign(points),
  };
}
