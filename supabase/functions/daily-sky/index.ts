import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { ChartParseError, type NatalChart } from '../_shared/lib/natal-chart.ts';
import { dailySky, isCalendarDate, parseSky, personalDay, skyFromContext, type SkyPoint } from '../_shared/lib/daily-sky.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Today's sky for the person (v1.2 D-01): the transits of the day over their
 * stored chart and their personal day, calculated, no model.
 *
 * The browser sends only its own calendar day. Where the planets are that day
 * is asked of the ephemeris once for everybody and kept in `sky_days` (noon
 * UTC: positions do not depend on the place, and noon keeps every time zone's
 * day inside the same 24 hours); everything personal is read here, as the
 * person, from `natal_charts` and the profile. The result is kept in
 * `daily_insights`, once per person and day, so opening Hoy again is free.
 */

const ENDPOINT = 'https://astrologer.p.rapidapi.com/api/v6/context/birth-chart';
const HOST = 'astrologer.p.rapidapi.com';
const TIMEOUT_MS = 20_000;
const DAY_MS = 86_400_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChart(value: unknown): value is NatalChart {
  return isRecord(value) && Array.isArray(value.points) && typeof value.has_birth_time === 'boolean';
}

/** A phone's own day is never more than a day from UTC's. */
function plausible(date: string): boolean {
  const asked = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(asked) && Math.abs(asked - Date.now()) <= 1.6 * DAY_MS;
}

// Several people open Hoy at the same minute; one worker asks once.
const asking = new Map<string, Promise<SkyPoint[] | null>>();

async function fetchSky(date: string): Promise<SkyPoint[] | null> {
  const key = Deno.env.get('RAPIDAPI_KEY');
  if (!key) return null;
  const [year, month, day] = date.split('-').map(Number);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': HOST },
      body: JSON.stringify({
        subject: {
          name: 'Cielo',
          year,
          month,
          day,
          hour: 12,
          minute: 0,
          city: 'Greenwich',
          nation: 'GB',
          latitude: 51.4779,
          longitude: 0,
          timezone: 'UTC',
        },
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(payload) || payload.status !== 'OK' || typeof payload.context !== 'string') {
      console.error('astrologer_error', response.status);
      return null;
    }
    return skyFromContext(payload.context);
  } catch (error) {
    if (!(error instanceof ChartParseError)) console.error('sky_fetch_failed');
    return null;
  }
}

async function skyFor(elevated: SupabaseClient, date: string): Promise<SkyPoint[] | null> {
  const { data } = await elevated.from('sky_days').select('points').eq('day', date).maybeSingle();
  const stored = parseSky((data as { points?: unknown } | null)?.points);
  if (stored) return stored;

  let pending = asking.get(date);
  if (!pending) {
    pending = fetchSky(date).then(async (sky) => {
      if (sky) {
        const { error } = await elevated.from('sky_days').upsert({ day: date, points: sky }, { ignoreDuplicates: true });
        if (error) console.error('sky_store_failed', error.code);
      }
      return sky;
    });
    asking.set(date, pending);
    pending.finally(() => asking.delete(date));
  }
  return pending;
}

async function birthDateOf(caller: SupabaseClient, userId: string): Promise<string | null> {
  for (const table of ['clients', 'anonymous_sessions'] as const) {
    const { data } = await caller.from(table).select('birth_date').eq('user_id', userId).maybeSingle();
    const value = (data as { birth_date?: unknown } | null)?.birth_date;
    if (typeof value === 'string' && isCalendarDate(value)) return value;
  }
  return null;
}

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  let auth;
  try {
    auth = await authenticate(request);
  } catch (error) {
    if (error instanceof Unauthorized) return json(request, { error: 'unauthorized' }, 401);
    return json(request, { error: 'misconfigured' }, 500);
  }
  const { userId, caller, elevated } = auth;

  const body: unknown = await request.json().catch(() => null);
  const date = isRecord(body) && typeof body.date === 'string' ? body.date : '';
  if (!isCalendarDate(date) || !plausible(date)) return json(request, { error: 'invalid_date' }, 400);

  const birthDate = await birthDateOf(caller, userId);
  if (!birthDate) return json(request, { error: 'no_birth_date' }, 404);

  const { data: chartRow } = await caller
    .from('natal_charts')
    .select('chart, calculated_at')
    .eq('user_id', userId)
    .maybeSingle();
  const row = chartRow as { chart?: unknown; calculated_at?: string } | null;
  // Without a chart there are no transits; the personal day still is.
  if (!row || !isChart(row.chart) || !row.calculated_at) {
    return json(request, { status: 'no_chart', personal_day: personalDay(birthDate, date) });
  }

  const { data: kept } = await caller
    .from('daily_insights')
    .select('sky, tips, chart_calculated_at')
    .eq('user_id', userId)
    .eq('insight_date', date)
    .maybeSingle();
  const cached = kept as { sky: unknown; tips: unknown; chart_calculated_at: string } | null;
  if (cached && Date.parse(cached.chart_calculated_at) === Date.parse(row.calculated_at)) {
    return json(request, { status: 'OK', day: cached.sky, tips: cached.tips ?? null });
  }

  const sky = await skyFor(elevated, date);
  if (!sky) return json(request, { error: 'sky_unavailable' }, 502);

  const day = dailySky({ chart: row.chart, sky, birthDate, date });
  const { error } = await elevated.from('daily_insights').upsert({
    user_id: userId,
    insight_date: date,
    personal_day: day.personal_day,
    sky: day,
    chart_calculated_at: row.calculated_at,
    // A new chart makes the day's tip stale with it.
    tips: null,
  });
  if (error) console.error('daily_insight_store_failed', error.code);

  return json(request, { status: 'OK', day, tips: null });
});
