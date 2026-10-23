import { describe, expect, it } from 'vitest';
import { keepChartPointReadings, readablePoints, readingsByPoint } from './chart-points.ts';
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

describe('what of an answer is shown (owner, 22 Oct 2026)', () => {
  const kept = (answer: { readings: { point: string; text: string }[] }, points = POINTS) =>
    keepChartPointReadings(answer, points).readings.map((r) => r.point);

  it('CONTROL: keeps one reading per point', () => {
    expect(kept(all())).toEqual(POINTS);
    expect(readingsByPoint(all())['Sun']).toBe('Tu carta sugiere algo propio de Sun.');
  });

  it('keeps them in any order', () => {
    expect(kept({ readings: [...all().readings].reverse() })).toHaveLength(POINTS.length);
  });

  it('shows what there is when a point is missing, instead of nothing', () => {
    const answer = { readings: all().readings.filter((r) => r.point !== 'Moon') };
    expect(kept(answer)).toEqual(POINTS.filter((p) => p !== 'Moon'));
  });

  it('leaves out a point the chart does not have, and a second reading of one', () => {
    expect(kept({ readings: [...all().readings, ok('Chiron')] })).not.toContain('Chiron');
    const twice = { readings: [...all().readings, { point: 'Sun', text: 'Otra lectura.' }] };
    expect(keepChartPointReadings(twice, POINTS).readings.filter((r) => r.point === 'Sun')).toEqual([ok('Sun')]);
  });

  it('leaves out the Ascendant when there is no hour', () => {
    const noTime = readablePoints(buildNatalChart(SEED_CONTEXT, false));
    expect(kept({ readings: [...noTime.map(ok), ok('Ascendant')] }, noTime)).not.toContain('Ascendant');
  });

  it('does not count sentences: three are shown', () => {
    const answer = all();
    answer.readings[0] = { point: 'Sun', text: 'Una. Dos. Tres.' };
    expect(kept(answer)).toContain('Sun');
  });

  it('leaves out, alone, a placement rated good or bad (A-02)', () => {
    const answer = all();
    const rated = answer.readings[2]!.point;
    answer.readings[2] = { point: rated, text: 'Tu carta sugiere un Mercurio muy favorable.' };
    expect(kept(answer)).toEqual(POINTS.filter((p) => p !== rated));
  });

  it('leaves out, alone, a reading that breaks a copy rule', () => {
    const answer = all();
    answer.readings[1] = { point: answer.readings[1]!.point, text: 'Tenés que mirar esto.' };
    expect(kept(answer)).toHaveLength(POINTS.length - 1);
  });

  it('returns the answer whole when nothing is left, so the copy lint refuses it', () => {
    const answer = { readings: [{ point: 'Sun', text: 'Un Sol maléfico.' }] };
    expect(keepChartPointReadings(answer, POINTS)).toBe(answer);
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
