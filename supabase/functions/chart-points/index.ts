import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { serveModel } from '../_shared/serve-model.ts';
import { chartPointsInputSchema } from '../_shared/lib/model-input.ts';
import { chartPointReadingsSchema, type ChartPointReadings } from '../_shared/lib/schemas/index.ts';
import { readStoredChart } from '../_shared/lib/comparison-payload.ts';
import { keepChartPointReadings, readablePoints } from '../_shared/lib/chart-points.ts';
import type { NatalChart } from '../_shared/lib/natal-chart.ts';
import {
  CHART_POINTS_PROMPT_VERSION,
  CHART_POINTS_SYSTEM_PROMPT,
  buildChartPointsUserMessage,
} from '../_shared/prompts/chart-points.ts';

/**
 * Package 05 «Carta completa» (owner, 16 Oct 2026): «la lectura de Davraz»
 * for every point of the person's chart, written once per calculated chart
 * and kept in `chart_point_readings`.
 *
 * The browser sends nothing. The chart is the row the natal-chart function
 * stored in `natal_charts`, read here as the person, under RLS, and the
 * readings are written for its `calculated_at`. A birth-data change or a
 * rebuild calculates the chart again with a new `calculated_at`; the readings
 * are then stale, the browser asks again and this overwrites them. While the
 * stored readings belong to the current chart, nothing is spent: the
 * function refuses with `current` and the browser reads the row.
 *
 * Not a plan feature (free and premium alike), but the spend goes through the
 * same per-person ceiling, deployment budget and reservation as every other
 * surface. No `prose` hook: nothing here was typed by anyone.
 */

type Request = {
  /** Filled by `enrich`. Never accepted from the browser: the schema strips it. */
  built?: { chart: NatalChart; calculatedAt: string };
};

type Stored = { chart: NatalChart; calculatedAt: string } | null;

async function storedChart(caller: SupabaseClient, userId: string): Promise<Stored> {
  const { data, error } = await caller
    .from('natal_charts')
    .select('chart, calculated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const chart = readStoredChart((data as { chart: unknown }).chart);
  if (!chart || readablePoints(chart).length === 0) return null;
  return { chart, calculatedAt: (data as { calculated_at: string }).calculated_at };
}

function built(input: Request): NonNullable<Request['built']> {
  if (!input.built) throw new Error('the chart was not read');
  return input.built;
}

Deno.serve(
  serveModel<Request, ChartPointReadings>({
    purpose: 'chart_points',
    promptVersion: CHART_POINTS_PROMPT_VERSION,
    input: chartPointsInputSchema,
    output: chartPointReadingsSchema,
    system: CHART_POINTS_SYSTEM_PROMPT,
    user: (input, { gender }) => buildChartPointsUserMessage(built(input).chart, gender),
    meta: (input) => ({ points: readablePoints(built(input).chart).length }),

    refuse: async (_input, { caller, userId }) => {
      const stored = await storedChart(caller, userId);
      if (!stored) return { reason: 'no_chart', safety: false };
      // Once per chart: readings written for this calculation are kept.
      const { data } = await caller
        .from('chart_point_readings')
        .select('chart_calculated_at')
        .eq('user_id', userId)
        .maybeSingle();
      const at = (data as { chart_calculated_at?: string } | null)?.chart_calculated_at;
      if (at && Date.parse(at) === Date.parse(stored.calculatedAt)) return { reason: 'current', safety: false };
      return null;
    },

    enrich: async (_input, { caller, userId }) => {
      const stored = await storedChart(caller, userId);
      if (!stored) throw new Error('no_chart');
      return { built: stored };
    },

    // Inside the model call, before the copy lint: a reading that rates its
    // placement or breaks a copy rule is left out alone, nothing is asked
    // again (owner, 22 Oct 2026).
    trim: (result, input) => keepChartPointReadings(result, readablePoints(built(input).chart)),

    store: async (result, input, { elevated, userId, promptVersion }) => {
      const { error } = await elevated.from('chart_point_readings').upsert({
        user_id: userId,
        chart_calculated_at: built(input).calculatedAt,
        prompt_version: promptVersion,
        readings: result.readings,
        created_at: new Date().toISOString(),
      });
      if (error) console.error('chart_points_store_failed', error.code);
      return null;
    },
  }),
);
