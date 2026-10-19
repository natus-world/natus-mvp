import { isBackendConfigured, isDemoMode, supabase } from '@/supabase/client';
import { DEMO_SKY, DEMO_TIPS } from '@/ai/fixtures/daily-sky';
import { DAILY_SKY_VERSION, dailySky, personalDay, type DailySky } from '@/lib/daily-sky';
import { buildNatalChart, ChartParseError } from '@/lib/natal-chart';
import { activeProfile } from './account';
import { hasRemoteIdentity } from './hydrate';

/**
 * «Tus astros de hoy» (v1.2 D-01, package 03): the day's transits over the
 * person's chart and their personal day, calculated by the `daily-sky`
 * function and kept there once per person and day; Davraz's tip of the day
 * (premium) by `daily-tip`. Nothing here is written by the browser: it asks
 * with its own calendar day and shows what comes back. Kept in memory for
 * the session only — asking again is free, the server already has it.
 *
 * The demo build crosses a fixed sky with the chart in the draft, with the
 * same `dailySky` the server runs.
 */
export type TodaySky =
  | { status: 'ready'; day: DailySky; tips: string[] | null }
  /** No chart: the personal day alone. */
  | { status: 'no_chart'; personalDay: number }
  /** Nothing to show (no birth date, no backend). */
  | { status: 'none' }
  | { status: 'error' };

/** The person's own calendar day, YYYY-MM-DD, as the phone has it. */
export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function serverPath(): boolean {
  return isBackendConfigured && supabase !== null && hasRemoteIdentity();
}

function isDay(value: unknown): value is DailySky {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { version?: unknown }).version === DAILY_SKY_VERSION &&
    Array.isArray((value as { transits?: unknown }).transits)
  );
}

function tipsOf(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tips = value.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  return tips.length ? tips : null;
}

function demoSky(date: string): TodaySky {
  const draft = activeProfile()?.draft;
  const birthDate = draft?.birth_date ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { status: 'none' };
  if (!draft?.natal_chart) return { status: 'no_chart', personalDay: personalDay(birthDate, date) };
  try {
    const chart = buildNatalChart(draft.natal_chart.context, /^\d{1,2}:\d{2}$/.test(draft.birth_time.trim()));
    return { status: 'ready', day: dailySky({ chart, sky: DEMO_SKY, birthDate, date }), tips: null };
  } catch (error) {
    if (error instanceof ChartParseError) return { status: 'no_chart', personalDay: personalDay(birthDate, date) };
    throw error;
  }
}

const kept = new Map<string, TodaySky>();

/** What is already known of a day, synchronously, so a second visit renders at once. */
export function todaySky(date: string): TodaySky | undefined {
  return kept.get(date);
}

/** Asks the server for the day (once per session and day while it answers). */
export async function loadTodaySky(date: string): Promise<TodaySky> {
  const known = kept.get(date);
  if (known && known.status !== 'error') return known;

  let result: TodaySky;
  if (!serverPath() || !supabase) {
    result = isDemoMode ? demoSky(date) : { status: 'none' };
  } else {
    const { data, error } = await supabase.functions.invoke('daily-sky', { body: { date } });
    const body = (data ?? {}) as { status?: unknown; day?: unknown; tips?: unknown; personal_day?: unknown };
    if (error) {
      const reason = await (error as { context?: Response }).context?.json?.().catch(() => null);
      result = (reason as { error?: string } | null)?.error === 'no_birth_date' ? { status: 'none' } : { status: 'error' };
    } else if (body.status === 'OK' && isDay(body.day)) {
      result = { status: 'ready', day: body.day, tips: tipsOf(body.tips) };
    } else if (body.status === 'no_chart' && typeof body.personal_day === 'number') {
      result = { status: 'no_chart', personalDay: body.personal_day };
    } else {
      result = { status: 'error' };
    }
  }
  kept.set(date, result);
  return result;
}

/**
 * Davraz's tip of the day, premium only — the server refuses everybody else.
 * Silent on failure (package 03): the tip just does not appear.
 */
export async function loadTodayTip(date: string): Promise<string[] | null> {
  const known = kept.get(date);
  if (known?.status === 'ready' && known.tips) return known.tips;
  if (!serverPath() || !supabase) return isDemoMode ? DEMO_TIPS.tips : null;

  const { data, error } = await supabase.functions.invoke('daily-tip', { body: { date } });
  let tips: string[] | null = null;
  if (!error) {
    tips = tipsOf((data as { result?: { tips?: unknown } } | null)?.result?.tips);
  } else {
    // Written already (by another device, or before): read it from the row.
    const reason = await (error as { context?: Response }).context?.json?.().catch(() => null);
    if ((reason as { reason?: string } | null)?.reason === 'current') {
      const { data: row } = await supabase
        .from('daily_insights')
        .select('tips')
        .eq('insight_date', date)
        .maybeSingle();
      tips = tipsOf((row as { tips?: unknown } | null)?.tips);
    }
  }
  if (tips && known?.status === 'ready') kept.set(date, { ...known, tips });
  return tips;
}

/** Forget what this session knows (a birth-data change, a sign-out). */
export function forgetTodaySky(): void {
  kept.clear();
}
