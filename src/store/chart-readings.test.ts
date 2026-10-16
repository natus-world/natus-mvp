import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAll, write } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';
import { getOrCreateSession, updateDraft } from './session';
import { chartReadings, ensureChartReadings } from './chart-readings';
import { SEED_CONTEXT } from '@/ai/fixtures/chart-seed.testing';
import { CHART_POINTS_PROMPT_VERSION } from '@/ai/prompts/versions';

/**
 * No backend in the tests: the server path is exercised by
 * `pnpm verify:models` against the local stack. What is checked here is what
 * the browser decides on its own — the kept readings follow the draft's
 * chart, and the demo build reads the fixture.
 */
const env = vi.hoisted(() => ({ demo: false }));
vi.mock('@/supabase/client', async (original) => ({
  ...(await original<typeof import('@/supabase/client')>()),
  get isDemoMode() {
    return env.demo;
  },
}));

const chartAt = 1_792_183_536_058;

function withChart(calculatedAt = chartAt, time = '08:30') {
  getOrCreateSession();
  updateDraft({
    birth_time: time,
    natal_chart: { provider: 'astrologer', api_version: 'v6', context: SEED_CONTEXT, calculated_at: calculatedAt, parse_status: 'parsed' },
  });
}

beforeEach(() => {
  installMemoryStorage();
  clearAll();
  env.demo = false;
});

describe('the readings of the full chart, outside the demo', () => {
  it('has none, and nothing to ask for, without a backend', async () => {
    withChart();
    expect(chartReadings()).toBeUndefined();
    expect(await ensureChartReadings()).toBe('unavailable');
  });

  it('gives back what this browser kept for the chart in the draft', () => {
    withChart();
    write('chart_readings', {
      promptVersion: CHART_POINTS_PROMPT_VERSION,
      readings: { Sun: 'Tu Sol en Géminis sugiere curiosidad.' },
      chartCalculatedAt: '2026-10-16T19:00:00+00:00',
      draftChartAt: chartAt,
    });
    expect(chartReadings()).toEqual({
      promptVersion: CHART_POINTS_PROMPT_VERSION,
      readings: { Sun: 'Tu Sol en Géminis sugiere curiosidad.' },
    });
  });

  it('hides them at once when the chart in the draft is calculated again (M-02)', () => {
    withChart();
    write('chart_readings', {
      promptVersion: CHART_POINTS_PROMPT_VERSION,
      readings: { Sun: 'Tu Sol en Géminis sugiere curiosidad.' },
      chartCalculatedAt: '2026-10-16T19:00:00+00:00',
      draftChartAt: chartAt,
    });
    withChart(chartAt + 1);
    expect(chartReadings()).toBeUndefined();
  });
});

describe('the readings of the full chart, in the demo build', () => {
  it('reads every point of the demo chart from the fixture', async () => {
    env.demo = true;
    withChart();
    expect(await ensureChartReadings()).toBe('ready');
    const readings = chartReadings()!.readings;
    expect(Object.keys(readings).sort()).toEqual(
      ['Ascendant', 'Jupiter', 'Mars', 'Medium_Coeli', 'Mercury', 'Moon', 'Neptune', 'Pluto', 'Saturn', 'Sun', 'Uranus', 'Venus'].sort(),
    );
    expect(chartReadings()!.promptVersion).toBe(CHART_POINTS_PROMPT_VERSION);
  });

  it('reads no axis without the hour', () => {
    env.demo = true;
    withChart(chartAt, '');
    expect(Object.keys(chartReadings()!.readings)).toHaveLength(10);
    expect(chartReadings()!.readings['Ascendant']).toBeUndefined();
  });

  it('is unavailable without a chart', async () => {
    env.demo = true;
    getOrCreateSession();
    expect(chartReadings()).toBeUndefined();
    expect(await ensureChartReadings()).toBe('unavailable');
  });
});
