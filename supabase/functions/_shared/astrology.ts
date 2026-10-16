export { parseAstrologerSubject, type AstrologerSubject } from './lib/astrology.ts';

const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export type Located = { latitude: number; longitude: number; timezone: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * City and ISO country to coordinates and an IANA timezone.
 *
 * Open-Meteo rather than a second astrology credential: the chart provider
 * would geocode too, through GeoNames, which is another account to hold and
 * another thing to be down.
 *
 * Returns null rather than throwing. Every caller has the same recovery — say
 * the place could not be found and carry on without a chart — and an
 * exception would only make each of them write it out.
 */
export async function resolveLocation(
  city: string,
  nation: string,
  signal: AbortSignal,
): Promise<Located | null> {
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set('name', city);
  url.searchParams.set('countryCode', nation);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'es');
  url.searchParams.set('format', 'json');

  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || !Array.isArray(payload.results)) return null;
  const result = payload.results[0];
  if (!isRecord(result)) return null;

  const { latitude, longitude, timezone } = result;
  if (
    typeof latitude !== 'number' ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    longitude < -180 ||
    longitude > 180 ||
    typeof timezone !== 'string' ||
    timezone.trim() === ''
  ) {
    return null;
  }

  return { latitude, longitude, timezone };
}

