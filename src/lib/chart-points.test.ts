import { describe, expect, it } from 'vitest';
import { checkChartPointReadings, readablePoints, readingsByPoint } from './chart-points.ts';
import { buildNatalChart } from './natal-chart.ts';
import { chartPointReadingsSchema, MAX_CHART_POINT_READING_CHARS } from './schemas/index.ts';
import { BROAD_CONTEXT, SEED_CONTEXT } from '../ai/fixtures/chart-seed.testing.ts';

const seed = buildNatalChart(SEED_CONTEXT, true);
const POINTS = readablePoints(seed);
const ok = (point: string) => ({ point, text: `Tu carta sugiere algo propio de ${point}.` });
const all = () => ({ readings: POINTS.map(ok) });

describe('the points Davraz reads (package 05)', () => {
  it('reads every point of the chart but the two mirrored axes', () => {
    const broad = readablePoints(buildNatalChart(BROAD_CONTEXT, true));
    expect(broad).toContain('Ascendant');
    expect(broad).toContain('Medium_Coeli');
    expect(broad).toContain('True_North_Lunar_Node');
    expect(broad).toContain('Chiron');
    expect(broad).not.toContain('Descendant');
    expect(broad).not.toContain('Imum_Coeli');
  });

  it('reads no axis without the hour of birth', () => {
    const points = readablePoints(buildNatalChart(SEED_CONTEXT, false));
    expect(points).toHaveLength(10);
    expect(points).not.toContain('Ascendant');
    expect(points).not.toContain('Medium_Coeli');
  });
});

describe('the check on an answer', () => {
  it('CONTROL: accepts one reading per point', () => {
    expect(checkChartPointReadings(all(), POINTS)).toBeNull();
    expect(readingsByPoint(all())['Sun']).toBe('Tu carta sugiere algo propio de Sun.');
  });

  it('accepts them in any order', () => {
    expect(checkChartPointReadings({ readings: [...all().readings].reverse() }, POINTS)).toBeNull();
  });

  it('refuses a point the chart does not have', () => {
    const answer = { readings: [...all().readings, ok('Chiron')] };
    expect(checkChartPointReadings(answer, POINTS)).toMatch(/Chiron/);
  });

  it('refuses a missing point', () => {
    const answer = { readings: all().readings.filter((r) => r.point !== 'Moon') };
    expect(checkChartPointReadings(answer, POINTS)).toMatch(/Moon/);
  });

  it('refuses a point read twice', () => {
    const answer = { readings: [...all().readings, ok('Sun')] };
    expect(checkChartPointReadings(answer, POINTS)).toMatch(/Two readings for "Sun"/);
  });

  it('refuses the Ascendant when there is no hour', () => {
    const noTime = readablePoints(buildNatalChart(SEED_CONTEXT, false));
    const answer = { readings: [...noTime.map(ok), ok('Ascendant')] };
    expect(checkChartPointReadings(answer, noTime)).toMatch(/Ascendant/);
  });

  it('refuses more than two sentences', () => {
    const answer = all();
    answer.readings[0] = { point: 'Sun', text: 'Una. Dos. Tres.' };
    expect(checkChartPointReadings(answer, POINTS)).toMatch(/3 sentences/);
  });

  it('refuses a placement rated good or bad (A-02)', () => {
    const answer = all();
    answer.readings[2] = { point: answer.readings[2]!.point, text: 'Tu carta sugiere un Mercurio muy favorable.' };
    expect(checkChartPointReadings(answer, POINTS)).toMatch(/chart-judgement/);
  });
});

describe('the shape of an answer', () => {
  it('refuses an empty text', () => {
    expect(chartPointReadingsSchema.safeParse({ readings: [{ point: 'Sun', text: '  ' }] }).success).toBe(false);
  });

  it('refuses an over-long text', () => {
    const text = 'a'.repeat(MAX_CHART_POINT_READING_CHARS + 1);
    expect(chartPointReadingsSchema.safeParse({ readings: [{ point: 'Sun', text }] }).success).toBe(false);
  });

  it('refuses no readings at all', () => {
    expect(chartPointReadingsSchema.safeParse({ readings: [] }).success).toBe(false);
  });
});
