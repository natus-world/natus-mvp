import { describe, expect, it } from 'vitest';
import { buildChartPointsFixture } from './chart-points';
import { BROAD_CONTEXT, SEED_CONTEXT } from './chart-seed.testing';
import { chartPointReadingsSchema } from '@/lib/schemas';
import { checkChartPointReadings, readablePoints } from '@/lib/chart-points';
import { lintChartJudgement, lintCrisisText, lintDeep } from '@/lib/copy-lint';
import { lintPhysicalRisk } from '@/lib/physical-risk';
import { buildNatalChart } from '@/lib/natal-chart';

/**
 * The copy lint governs fixtures as well as model output (CLAUDE.md): the
 * demo's readings pass the schema, the check and every lint the function's
 * answer passes, for the demo person with and without the hour, and for a
 * chart with every kind of point.
 */
const CHARTS = [
  ['the demo person, with the hour', buildNatalChart(SEED_CONTEXT, true)],
  ['the demo person, without the hour', buildNatalChart(SEED_CONTEXT, false)],
  ['a chart with every kind of point', buildNatalChart(BROAD_CONTEXT, true)],
] as const;

describe.each(CHARTS)('the demo readings of the full chart: %s', (_label, chart) => {
  const fixture = buildChartPointsFixture(chart);

  it('satisfies the contract', () => {
    expect(() => chartPointReadingsSchema.parse(fixture)).not.toThrow();
  });

  it('reads every point once, in one or two sentences', () => {
    expect(checkChartPointReadings(fixture, readablePoints(chart))).toBeNull();
  });

  it('passes the copy lint, rates nothing and names no house', () => {
    expect(lintDeep(fixture)).toEqual([]);
    expect(lintCrisisText(fixture)).toEqual([]);
    expect(lintPhysicalRisk(fixture)).toEqual([]);
    expect(lintChartJudgement(fixture)).toEqual([]);
    for (const { text } of fixture.readings) expect(text).not.toMatch(/\bcasa\b/i);
  });
});

it('has its own text for every placement of the demo person', () => {
  const chart = buildNatalChart(SEED_CONTEXT, true);
  const texts = buildChartPointsFixture(chart).readings.map((r) => r.text);
  // The curated ones name the sign in Spanish; none fell to the generic line.
  expect(texts.filter((t) => /con el tono de ese signo|se lee como complemento de los siete/.test(t))).toEqual([]);
});
