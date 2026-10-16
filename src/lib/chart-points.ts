import type { NatalChart } from './natal-chart.ts';
import { countSentences, lintChartJudgement } from './copy-lint.ts';
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
 * A reason to refuse the answer, or null to accept it. The shape (non-empty,
 * not too long) is the schema's; this is what depends on the chart and on
 * the product's rules for reading one:
 *
 * - one reading for every point asked for, no point twice, none invented;
 * - one or two sentences each;
 * - nothing rated good or bad (A-02, `lintChartJudgement`).
 *
 * The general copy lint runs over every answer elsewhere (the shared
 * `generate` and `runAi`), so it is not repeated here.
 */
export function checkChartPointReadings(result: ChartPointReadings, points: readonly string[]): string | null {
  const asked = new Set(points);
  const seen = new Set<string>();
  for (const { point, text } of result.readings) {
    if (!asked.has(point)) return `A reading for "${point}", which is not a point of this chart.`;
    if (seen.has(point)) return `Two readings for "${point}"; one was asked for.`;
    seen.add(point);
    const sentences = countSentences(text);
    if (sentences < 1 || sentences > 2) return `The reading of "${point}" has ${sentences} sentences; one or two were asked for.`;
  }
  const missing = points.filter((p) => !seen.has(p));
  if (missing.length > 0) return `No reading for ${missing.map((p) => `"${p}"`).join(', ')}; one for every point was asked for.`;

  const judged = lintChartJudgement(result)[0];
  if (judged) return `Copy rule "${judged.rule}" broken at ${judged.path}: "${judged.match}" — ${judged.why}`;
  return null;
}

/** The readings keyed by point, as the full chart looks them up. */
export function readingsByPoint(result: ChartPointReadings): Record<string, string> {
  return Object.fromEntries(result.readings.map((r) => [r.point, r.text]));
}
