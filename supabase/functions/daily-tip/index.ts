import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { serveModel } from '../_shared/serve-model.ts';
import { overPlanCap, planTier } from '../_shared/quota.ts';
import { dailyTipInputSchema } from '../_shared/lib/model-input.ts';
import { dailyTipsSchema, type DailyTips } from '../_shared/lib/schemas/index.ts';
import { lintChartJudgement } from '../_shared/lib/copy-lint.ts';
import { DAILY_SKY_VERSION, type DailySky } from '../_shared/lib/daily-sky.ts';
import {
  DAILY_TIP_PROMPT_VERSION,
  DAILY_TIP_SYSTEM_PROMPT,
  buildDailyTipUserMessage,
} from '../_shared/prompts/daily-tip.ts';

/**
 * Davraz's tip of the day (v1.2 D-01, guide §9.4): premium only, one or two
 * small practical tips from the person's day as `daily-sky` calculated it.
 *
 * The browser sends its calendar day and nothing else. The day is the row in
 * `daily_insights`, read here as the person; the tips are written into that
 * same row, so once a day is enough and a free person costs nothing here.
 * A failure is silent on the screen (package 03: «El tip no aparece; el
 * resto de la pantalla funciona igual»).
 */

type Request = {
  date: string;
  /** Filled by `enrich`. Never accepted from the browser: the schema strips it. */
  day?: DailySky;
};

type Row = { sky: unknown; tips: unknown } | null;

async function storedDay(caller: SupabaseClient, userId: string, date: string): Promise<Row> {
  const { data, error } = await caller
    .from('daily_insights')
    .select('sky, tips')
    .eq('user_id', userId)
    .eq('insight_date', date)
    .maybeSingle();
  return error ? null : (data as Row);
}

function isDay(value: unknown): value is DailySky {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { version?: unknown }).version === DAILY_SKY_VERSION &&
    Array.isArray((value as { transits?: unknown }).transits)
  );
}

function day(input: Request): DailySky {
  if (!input.day) throw new Error('the day was not read');
  return input.day;
}

Deno.serve(
  serveModel<Request, DailyTips>({
    purpose: 'daily_tip',
    promptVersion: DAILY_TIP_PROMPT_VERSION,
    input: dailyTipInputSchema,
    output: dailyTipsSchema,
    system: DAILY_TIP_SYSTEM_PROMPT,
    user: (input, { gender }) => buildDailyTipUserMessage(day(input), gender),
    meta: (input) => ({ transits: day(input).transits.length }),

    refuse: async (input, { caller, userId, elevated }) => {
      if ((await planTier(elevated, userId)) !== 'premium') return { reason: 'not_premium', safety: false };
      if ((await overPlanCap(elevated, userId))?.over) return { reason: 'cap', safety: false };
      const row = await storedDay(caller, userId, input.date);
      if (!row || !isDay(row.sky) || row.sky.transits.length === 0) return { reason: 'no_day', safety: false };
      // Once a day: tips written for this day are kept.
      if (Array.isArray(row.tips) && row.tips.length > 0) return { reason: 'current', safety: false };
      return null;
    },

    enrich: async (input, { caller, userId }) => {
      const row = await storedDay(caller, userId, input.date);
      if (!row || !isDay(row.sky)) throw new Error('no_day');
      return { ...input, day: row.sky };
    },

    // Inside the model call, so a rated day or the word «secta» is retried once.
    lint: (result) => {
      const judged = lintChartJudgement(result)[0];
      return judged ? `${judged.match}: ${judged.why}` : null;
    },

    store: async (result, input, { elevated, userId }) => {
      const { error } = await elevated
        .from('daily_insights')
        .update({ tips: result.tips })
        .eq('user_id', userId)
        .eq('insight_date', input.date);
      if (error) console.error('daily_tip_store_failed', error.code);
      return null;
    },
  }),
);
