import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { parseAstrologerSubject, resolveLocation } from '../_shared/astrology.ts';
import { withoutBirthTime } from '../_shared/lib/astrology.ts';
import { buildNatalChart, ChartParseError, type DayNight } from '../_shared/lib/natal-chart.ts';
import { parseBirthPlace } from '../_shared/lib/places.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const ENDPOINT = 'https://astrologer.p.rapidapi.com/api/v6/context/birth-chart';
const HOST = 'astrologer.p.rapidapi.com';
const TIMEOUT_MS = 20_000;
const CALLS_PER_DAY = 5;

/**
 * What the provider is asked for: its default points — the ten planets, the
 * true Nodes, Chiron and the four angles — plus the mean Lilith (owner, 28 Oct
 * 2026), which it leaves out unless named. Placidus is asked for by name.
 */
const ACTIVE_POINTS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'True_North_Lunar_Node', 'True_South_Lunar_Node', 'Chiron', 'Mean_Lilith',
  'Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli',
];

/** Day or night, when the person said it; anything else is not knowing. */
function dayNightOf(value: unknown): DayNight | null {
  return value === 'dia' || value === 'noche' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON with sorted keys: jsonb gives keys back in its own order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    isRecord(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v,
  );
}

/**
 * The calculated chart (A-02; houses in Placidus since 30 Oct 2026, whole sign
 * near a pole), kept in `natal_charts`.
 * Derived from the provider's text with no further call, so a stored chart
 * can be rebuilt for free. A failure here never fails the request: the text
 * the Soul Map reads is already in hand.
 */
async function keepChart(
  elevated: SupabaseClient,
  userId: string,
  context: string,
  hasBirthTime: boolean,
  dayNight: DayNight | null,
): Promise<boolean> {
  try {
    const chart = buildNatalChart(context, hasBirthTime, dayNight);
    // The same chart keeps its `calculated_at`: the readings of the full
    // chart (package 05) are written for it, and a rebuild on another device
    // that changes nothing must not make them stale.
    const { data: before } = await elevated.from('natal_charts').select('chart').eq('user_id', userId).maybeSingle();
    if (before && canonical((before as { chart: unknown }).chart) === canonical(chart)) return true;
    const { error } = await elevated.from('natal_charts').upsert({
      user_id: userId,
      has_birth_time: chart.has_birth_time,
      house_system: chart.house_system,
      chart,
      calculated_at: new Date().toISOString(),
    });
    if (error) console.error('natal_chart_store_failed', error.code);
    return !error;
  } catch (error) {
    if (!(error instanceof ChartParseError)) console.error('natal_chart_parse_failed');
    return false;
  }
}

/**
 * Rebuild the chart from what is already stored (A-01: "regenerar
 * las cartas ya guardadas"). Read as the person, under RLS — the account
 * first, then the anonymous session, as activeProfile does — and no call to
 * the provider: the positions are in the stored text.
 */
async function rebuild(caller: SupabaseClient, elevated: SupabaseClient, userId: string): Promise<boolean> {
  for (const table of ['clients', 'anonymous_sessions'] as const) {
    const { data } = await caller
      .from(table)
      .select('natal_chart, birth_time, birth_daynight')
      .eq('user_id', userId)
      .maybeSingle();
    const stored = isRecord(data) && isRecord(data.natal_chart) ? data.natal_chart : null;
    if (stored && typeof stored.context === 'string' && stored.context.trim() !== '') {
      const timeKnown = data?.birth_time != null;
      return keepChart(elevated, userId, stored.context, timeKnown, timeKnown ? null : dayNightOf(data?.birth_daynight));
    }
  }
  return false;
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
  const { userId, elevated } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: 'invalid_body' }, 400);
  }

  if (isRecord(body) && body.rebuild === true) {
    const rebuilt = await rebuild(auth.caller, elevated, userId);
    return json(request, rebuilt ? { status: 'OK', rebuilt: true } : { error: 'no_stored_chart' }, rebuilt ? 200 : 404);
  }

  const subject = parseAstrologerSubject(isRecord(body) ? body.subject : null);
  if (!subject) return json(request, { error: 'invalid_birth_data' }, 400);
  // Without the hour the browser sends local noon, and says so. Anything else
  // is treated as a known hour: the stripping below only ever removes.
  const timeKnown = !(isRecord(body) && body.time_known === false);

  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    return json(request, { error: 'astrologer_not_configured' }, 503);
  }

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await elevated
    .from('natal_chart_calls')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= CALLS_PER_DAY) return json(request, { error: 'spend_limit', scope: 'person' }, 429);
  await elevated.from('natal_chart_calls').insert({ user_id: userId });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // The place the person picked, when they did (16 Oct 2026); else the name
    // they typed, looked up. A picked place must be in the country sent.
    const picked = isRecord(body) ? parseBirthPlace(body.place) : null;
    const location =
      picked && picked.country === subject.nation
        ? { latitude: picked.latitude, longitude: picked.longitude, timezone: picked.timezone }
        : await resolveLocation(subject.city, subject.nation, controller.signal);
    if (!location) return json(request, { error: 'birth_place_not_found' }, 422);

    const ask = (withPoints: boolean) =>
      fetch(ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': HOST,
        },
        body: JSON.stringify({
          subject: { ...subject, ...location, houses_system_identifier: 'P' },
          ...(withPoints ? { active_points: ACTIVE_POINTS } : {}),
        }),
      });

    let response = await ask(true);
    // A provider that refuses the list of points still casts the chart without
    // Lilith, rather than casting none.
    if (response.status === 400 || response.status === 422) {
      console.error('astrologer_points_refused', response.status);
      response = await ask(false);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(payload) || payload.status !== 'OK') {
      // Do not pass provider details through: they can reveal configuration,
      // and the UI has one useful recovery for every provider-side failure.
      console.error('astrologer_error', response.status, isRecord(payload) ? payload.status : null);
      return json(request, { error: 'astrologer_error' }, 502);
    }

    const raw = payload.context;
    if (typeof raw !== 'string' || raw.trim() === '' || raw.length > 250_000) {
      return json(request, { error: 'invalid_astrologer_response' }, 502);
    }
    // v1.2 A-01: without the hour there is no Ascendant and there are no
    // houses. Removed here, before the chart is stored anywhere.
    const context = timeKnown ? raw : withoutBirthTime(raw);
    // Without the hour, day or night as the person said it (owner, 22 Oct 2026).
    await keepChart(elevated, userId, context, timeKnown, timeKnown ? null : dayNightOf(isRecord(body) ? body.day_night : null));

    return json(request, { status: 'OK', api_version: 'v6', context, time_known: timeKnown });
  } catch (error) {
    return json(
      request,
      { error: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error' },
      504,
    );
  } finally {
    clearTimeout(timer);
  }
});
