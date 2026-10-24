import type { Numerology } from './schemas/index.ts';
import { NATAL_CHART_VERSION, aspectsBetween, type CrossAspect, type NatalChart } from './natal-chart.ts';
import { areasBetween, type Area } from './comparison-areas.ts';

/**
 * What is allowed to leave the browser when two charts are compared.
 *
 * This is the highest-risk payload in the product. Every other model call
 * carries one person's material; this one carries two, and the second person
 * consented to a comparison rather than to being described. PDR 8.3 is
 * explicit that the other person's presenting need and clinical answers are
 * never part of it — and the same has to hold for the requester, because a
 * comparison is read by both.
 *
 * So the payload is built from an allow-list rather than trimmed down from a
 * record. The difference matters: a deny-list has to be updated every time a
 * field is added upstream, and the failure mode of forgetting is that private
 * data ships. Here a new field on the source is invisible until someone comes
 * to this file and names it.
 *
 * `comparison-payload.test.ts` loads the sources with clinical material and
 * asserts it cannot be found in the serialised payload, under every scope.
 */

export type { CrossAspect };

/**
 * The local record, as the caller holds it. Deliberately typed as an open
 * object: the point is that whatever else is in there does not travel.
 */
export type ComparisonSource = {
  display_name: string;
  numerology: Numerology | null;
  soul_map_themes: readonly string[];
  /** The stored chart, read the Hellenistic way (v1.2 A-02). */
  chart: NatalChart | null;
  [extra: string]: unknown;
};

export type ComparisonScope = {
  numerology: boolean;
  astro: boolean;
  soul_map_themes: boolean;
};

export type ComparisonSubject = {
  display_name: string;
  numerology: Numerology | null;
  soul_map_themes: string[];
  /** Null without a chart or outside `scope.astro`. */
  chart: NatalChart | null;
};

export type ComparisonPayload = {
  scope: ComparisonScope;
  a: ComparisonSubject;
  b: ComparisonSubject;
  /**
   * v1.2 A-02: the aspects between the two charts, by sign, computed here
   * from the two charts and never accepted from a caller — an aspect list that
   * arrived with a request would be a caller telling the model which
   * placements to read out, which is rule 5 broken from the outside.
   */
  aspects: CrossAspect[];
  /**
   * «Las dos cartas» (owner, 23 Oct 2026): the twelve areas, crossed by sign
   * from the two charts with A as the one who asked. Computed here like the
   * aspects, never accepted from a caller.
   */
  areas: Area[];
};

/** Every field of a source that may cross into a payload. Nothing else does. */
const ALLOWED = ['display_name', 'numerology', 'soul_map_themes', 'chart'] as const;

function subject(source: ComparisonSource, scope: ComparisonScope): ComparisonSubject {
  // Named one at a time, never spread. A spread here would be the bug.
  return {
    display_name: source.display_name,
    numerology: scope.numerology ? (source.numerology ?? null) : null,
    // v1.2 C-01: astrology and numerology only. The themes are inferred from
    // what the person wrote, so they never travel, whatever the scope says.
    // The field stays in the shape until C-01 replaces this flow.
    soul_map_themes: [],
    chart: scope.astro && source.chart ? copyChart(source.chart) : null,
  };
}

export function buildComparisonPayload(input: {
  a: ComparisonSource;
  b: ComparisonSource;
  scope: ComparisonScope;
}): ComparisonPayload {
  return {
    scope: {
      numerology: input.scope.numerology,
      astro: input.scope.astro,
      soul_map_themes: false,
    },
    a: subject(input.a, input.scope),
    b: subject(input.b, input.scope),
    aspects: [],
    areas: [],
  };
}

/**
 * A stored chart, field by field, never spread — the same allow-list as the
 * rest of the subject. Only the calculation the model reads crosses.
 */
function copyChart(chart: NatalChart): NatalChart {
  return {
    version: chart.version,
    house_system: chart.house_system,
    has_birth_time: chart.has_birth_time,
    points: chart.points.map((p) => ({
      name: p.name,
      sign: p.sign,
      degree: p.degree,
      longitude: p.longitude,
      retrograde: p.retrograde,
      element: p.element,
      modality: p.modality,
      house: p.house,
      dignity: p.dignity,
    })),
    ascendant: chart.ascendant ? { sign: chart.ascendant.sign, degree: chart.ascendant.degree } : null,
    ascendant_ruler: chart.ascendant_ruler
      ? { planet: chart.ascendant_ruler.planet, sign: chart.ascendant_ruler.sign, house: chart.ascendant_ruler.house }
      : null,
    sect: chart.sect ? { kind: chart.sect.kind, planets: [...chart.sect.planets] } : null,
    aspects: chart.aspects.map((a) => ({ a: a.a, b: a.b, type: a.type, separation: a.separation })),
  };
}

/** A stored chart this code can read, or null: the current version, with points. */
export function readStoredChart(value: unknown): NatalChart | null {
  if (!value || typeof value !== 'object') return null;
  const chart = value as Partial<NatalChart>;
  return chart.version === NATAL_CHART_VERSION && Array.isArray(chart.points) ? (chart as NatalChart) : null;
}

/** v1.2 A-02: the payload with the aspects and the areas between the two charts, by sign. */
export function withCrossAspects(payload: ComparisonPayload): ComparisonPayload {
  if (!payload.a.chart || !payload.b.chart) return payload;
  return {
    ...payload,
    aspects: aspectsBetween(payload.a.chart.points, payload.b.chart.points),
    areas: areasBetween(payload.a.chart, payload.b.chart),
  };
}

/** The allow-list, exported so a test can assert it rather than restate it. */
export const ALLOWED_SUBJECT_FIELDS: readonly string[] = ALLOWED;

/** A scope that permits nothing is not a comparison; the caller should refuse
 *  rather than send an empty payload and let the model improvise. */
export function isScopeUsable(scope: ComparisonScope): boolean {
  return scope.numerology || scope.astro;
}

/**
 * Rule 5 of PDR 8.5, as a predicate.
 *
 * The old check asked only whether *any* aspect came back when no chart was
 * present. It passed in the case that mattered — a model handed two charts
 * and asked for aspects it cannot compute from signs and houses, which is
 * every reading this feature produced before the aspects were computed for it.
 *
 * This asks the question that catches it: is the answer a subset of what was
 * computed? Returns the first aspect that was not, or null.
 *
 * Comparison is case- and space-insensitive because "Conjunction" and
 * "conjunction" are the same aspect, and rejecting a reading over the
 * difference would be pedantry rather than safety.
 */
export function inventedAspect<T extends { a_body: string; b_body: string; type: string }>(
  returned: readonly T[],
  computed: readonly CrossAspect[],
): T | null {
  const key = (a: { a_body: string; b_body: string; type: string }) =>
    `${a.a_body}|${a.b_body}|${a.type}`.toLowerCase().replace(/\s+/g, '');
  const real = new Set(computed.map(key));
  return returned.find((aspect) => !real.has(key(aspect))) ?? null;
}
