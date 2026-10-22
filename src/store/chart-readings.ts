import { dayNightOf } from '@/astrology/natal-chart';
import { isBackendConfigured, isDemoMode, supabase } from '@/supabase/client';
import { generateChartReadings } from '@/ai/chart-points';
import { buildChartPointsFixture } from '@/ai/fixtures/chart-points';
import { CHART_POINTS_PROMPT_VERSION } from '@/ai/prompts/versions';
import { checkChartPointReadings, readablePoints, readingsByPoint } from '@/lib/chart-points';
import { readStoredChart } from '@/lib/comparison-payload';
import { buildNatalChart, ChartParseError, type NatalChart } from '@/lib/natal-chart';
import { chartPointReadingsSchema } from '@/lib/schemas';
import { activeProfile } from './account';
import { read, remove, write } from './db';
import { hasRemoteIdentity } from './hydrate';

/**
 * Davraz's reading of each point of the full chart (package 05, owner,
 * 16 Oct 2026). The API below is a contract the screen uses.
 *
 * Keys are `ChartPoint.name` as `src/lib/natal-chart.ts` names them
 * («Sun», «Venus», «Ascendant», «Medium_Coeli», «True_North_Lunar_Node»…).
 *
 * Written by the `chart-points` function into `chart_point_readings`, once
 * per calculated chart, and not mirrored: read here when the full chart is
 * opened, as the memory and the routine proposals are, and kept in this
 * browser (`chart_readings`) so the next opening renders at once. The row
 * says which `natal_charts.calculated_at` it was written for; when the chart
 * is calculated again (a birth-data change) the readings are stale, and
 * `ensureChartReadings` asks for new ones.
 *
 * The demo build without a server reads the curated fixture for the chart in
 * the draft.
 */
export type ChartReadings = {
  promptVersion: string;
  /** One or two sentences per point, in propositive language. */
  readings: Record<string, string>;
};

type Kept = ChartReadings & {
  /** `natal_charts.calculated_at` the readings were written for. */
  chartCalculatedAt: string;
  /** The draft's own chart stamp when they were kept: a new chart in the draft hides them at once. */
  draftChartAt: number | null;
};

function draftChartAt(): number | null {
  return activeProfile()?.draft.natal_chart?.calculated_at ?? null;
}

function serverPath(): boolean {
  return isBackendConfigured && supabase !== null && hasRemoteIdentity();
}

/** The chart in the draft, as the demo reads it. */
function draftChart(): NatalChart | null {
  const draft = activeProfile()?.draft;
  if (!draft?.natal_chart) return null;
  try {
    return buildNatalChart(draft.natal_chart.context, /^\d{1,2}:\d{2}$/.test(draft.birth_time.trim()), dayNightOf(draft));
  } catch (error) {
    if (error instanceof ChartParseError) return null;
    throw error;
  }
}

let demo: { context: string; time: string; value: ChartReadings } | null = null;

function demoReadings(): ChartReadings | undefined {
  const draft = activeProfile()?.draft;
  if (!draft?.natal_chart) return undefined;
  if (demo && demo.context === draft.natal_chart.context && demo.time === draft.birth_time) return demo.value;
  const chart = draftChart();
  if (!chart) return undefined;
  const value = { promptVersion: CHART_POINTS_PROMPT_VERSION, readings: readingsByPoint(buildChartPointsFixture(chart)) };
  demo = { context: draft.natal_chart.context, time: draft.birth_time, value };
  return value;
}

/** What is stored for the person's current chart, or undefined. Synchronous. */
export function chartReadings(): ChartReadings | undefined {
  if (!serverPath() && isDemoMode) return demoReadings();
  const kept = read<Kept | null>('chart_readings', null);
  if (!kept || kept.draftChartAt !== draftChartAt()) return undefined;
  return { promptVersion: kept.promptVersion, readings: kept.readings };
}

type ChartRow = { chart: NatalChart; calculatedAt: string };

async function storedChart(): Promise<ChartRow | null | 'error'> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('natal_charts').select('chart, calculated_at').maybeSingle();
  if (error) return 'error';
  const chart = data ? readStoredChart(data.chart) : null;
  if (!data || !chart || readablePoints(chart).length === 0) return null;
  return { chart, calculatedAt: data.calculated_at };
}

/** The stored readings, when they were written for this chart and still read it. */
async function storedReadings(row: ChartRow): Promise<Kept | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chart_point_readings')
    .select('chart_calculated_at, prompt_version, readings')
    .maybeSingle();
  if (error || !data || Date.parse(data.chart_calculated_at) !== Date.parse(row.calculatedAt)) return null;
  const parsed = chartPointReadingsSchema.safeParse({ readings: data.readings });
  if (!parsed.success || checkChartPointReadings(parsed.data, readablePoints(row.chart))) return null;
  return {
    promptVersion: data.prompt_version,
    readings: readingsByPoint(parsed.data),
    chartCalculatedAt: row.calculatedAt,
    draftChartAt: draftChartAt(),
  };
}

let inFlight: Promise<'ready' | 'unavailable' | 'error'> | null = null;

/**
 * Asks for the readings when there are none for the current chart yet.
 * 'ready' once `chartReadings()` returns them; 'unavailable' when there is no
 * chart, no backend or no model; 'error' when the call failed (retry offered).
 */
export function ensureChartReadings(): Promise<'ready' | 'unavailable' | 'error'> {
  inFlight ??= ensure().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function ensure(): Promise<'ready' | 'unavailable' | 'error'> {
  if (!serverPath()) return isDemoMode && demoReadings() ? 'ready' : 'unavailable';

  let row: ChartRow | null | 'error';
  try {
    row = await storedChart();
  } catch {
    return 'error';
  }
  if (row === 'error') return 'error';
  if (!row) {
    remove('chart_readings');
    return 'unavailable';
  }

  const current = await storedReadings(row).catch(() => null);
  if (current) {
    write('chart_readings', current);
    return 'ready';
  }
  // Written for a chart that is no longer this one.
  remove('chart_readings');

  try {
    const result = await generateChartReadings(row.chart);
    // The row is what the function kept; the answer stands in when keeping it failed.
    const kept = (await storedReadings(row).catch(() => null)) ?? {
      promptVersion: CHART_POINTS_PROMPT_VERSION,
      readings: readingsByPoint(result.value),
      chartCalculatedAt: row.calculatedAt,
      draftChartAt: draftChartAt(),
    };
    write('chart_readings', kept);
    return 'ready';
  } catch {
    // Another tab may have asked first (the function then refuses with
    // `current`): what is stored is the answer.
    const kept = await storedReadings(row).catch(() => null);
    if (kept) {
      write('chart_readings', kept);
      return 'ready';
    }
    return 'error';
  }
}
