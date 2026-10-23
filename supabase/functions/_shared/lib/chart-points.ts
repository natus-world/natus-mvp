import type { NatalChart } from './natal-chart.ts';
import { lintChartJudgement, lintCrisisText, lintDeep } from './copy-lint.ts';
import { lintPhysicalRisk } from './physical-risk.ts';
import type { ChartPointReadings } from './schemas/index.ts';

/**
 * Package 05 «Carta completa» (owner, 16 Oct 2026): which points of a chart
 * Davraz reads, and whether an answer reads exactly those.
 *
 * Every point `buildNatalChart` returns, except the Descendant and the Imum
 * Coeli, which only mirror the Ascendant and the Midheaven. Without the hour
 * of birth the chart already has no axes, so there is nothing to strip.
 *
 * Pure, so the function and the browser apply the same rule.
 */

const MIRRORS = new Set(['Descendant', 'Imum_Coeli']);

export function readablePoints(chart: NatalChart): string[] {
  return chart.points.map((p) => p.name).filter((name) => !MIRRORS.has(name));
}

/**
 * What of an answer is shown (owner, 22 Oct 2026): nothing is refused and
 * nothing is asked again. Before, one reading out of shape — three sentences,
 * a point missing — threw the whole answer away, asked for it a second time
 * and, failing again, showed nothing at all.
 *
 * - a reading for a point the chart does not have, or a second one for the
 *   same point, is left out;
 * - a reading that rates the placement good or bad (A-02,
 *   `lintChartJudgement`) or breaks a copy rule is left out, alone: that point
 *   shows no reading and every other one stays;
 * - length is not counted: one or two sentences is what the prompt asks for.
 *
 * Only when nothing at all is left is the answer returned whole, so the copy
 * lint refuses it as before.
 */
export function keepChartPointReadings(result: ChartPointReadings, points: readonly string[]): ChartPointReadings {
  const asked = new Set(points);
  const seen = new Set<string>();
  const readings = result.readings.filter((reading) => {
    if (!asked.has(reading.point) || seen.has(reading.point)) return false;
    seen.add(reading.point);
    // The words only: the point's own name is not copy.
    const words = { text: reading.text };
    return (
      lintDeep(words).length === 0 &&
      lintCrisisText(words).length === 0 &&
      lintPhysicalRisk(words).length === 0 &&
      lintChartJudgement(words).length === 0
    );
  });
  return readings.length > 0 ? { readings } : result;
}

/** The readings keyed by point, as the full chart looks them up. */
export function readingsByPoint(result: ChartPointReadings): Record<string, string> {
  return Object.fromEntries(result.readings.map((r) => [r.point, r.text]));
}
