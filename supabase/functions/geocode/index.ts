import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { MIN_QUERY_LENGTH, geocodingUrl, normalizePlaceName, type GeocoderResult } from '../_shared/lib/places.ts';

/**
 * The birth-place search, through the server (owner, 18 Oct 2026).
 *
 * The browser used to ask Open-Meteo directly, on the free endpoint, which is
 * for non-commercial use and stops at 10,000 searches a day — a launch day
 * passes that and nobody gets past the birth step. The commercial plan comes
 * with a key, and a key in the bundle is anybody's, so the search comes here,
 * where `OPEN_METEO_API_KEY` is a secret. Without the secret it uses the free
 * endpoint, as before; if the paid one fails it falls back to the free one,
 * so the step never stops for a billing problem.
 *
 * Signed-in sessions only (the anonymous one made at first load counts). The
 * same searches repeat — «Santiago», «Ciudad de México» — so each worker keeps
 * the last answers for a day.
 */

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map<string, { at: number; results: GeocoderResult[]; source: Source }>();

/** Which endpoint answered: says, without the key, whether the paid plan works. */
type Source = 'paid' | 'free';

function remember(key: string, results: GeocoderResult[], source: Source): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), results, source });
}

/** Only what the app reads, so nothing else crosses. */
function trim(results: unknown): GeocoderResult[] {
  if (!Array.isArray(results)) return [];
  return results.slice(0, 10).map((r: Record<string, unknown>) => ({
    name: r.name,
    admin1: r.admin1,
    country_code: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    population: r.population,
    feature_code: r.feature_code,
  }));
}

async function ask(url: URL): Promise<GeocoderResult[] | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      console.error('geocoder_error', url.hostname, response.status);
      return null;
    }
    const payload = (await response.json()) as { results?: unknown };
    return trim(payload.results);
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  try {
    await authenticate(request);
  } catch (error) {
    if (error instanceof Unauthorized) return json(request, { error: 'unauthorized' }, 401);
    return json(request, { error: 'misconfigured' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return json(request, { error: 'invalid_body' }, 400);
  }

  const term = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const country = typeof body.country === 'string' ? body.country.toUpperCase() : '';
  if (term.length < MIN_QUERY_LENGTH || !/^[A-Z]{2}$/.test(country)) {
    return json(request, { results: [] });
  }

  const key = `${country}|${normalizePlaceName(term)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return json(request, { results: hit.results, source: hit.source });

  const apiKey = Deno.env.get('OPEN_METEO_API_KEY');
  let source: Source = apiKey ? 'paid' : 'free';
  let results = await ask(geocodingUrl(term, country, apiKey));
  if (results === null && apiKey) {
    source = 'free';
    results = await ask(geocodingUrl(term, country, null));
  }
  if (results === null) return json(request, { error: 'geocoder_unavailable' }, 502);

  remember(key, results, source);
  return json(request, { results, source });
});
