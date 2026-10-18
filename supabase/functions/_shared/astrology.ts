export { parseAstrologerSubject, type AstrologerSubject } from './lib/astrology.ts';

import { bestPlace, geocodingUrl, searchTermFor, type GeocoderResult } from './lib/places.ts';

export type Located = { latitude: number; longitude: number; timezone: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * City and ISO country to coordinates and an IANA timezone, for a draft saved
 * before the person picked the place from suggestions (16 Oct 2026); a picked
 * place arrives with its coordinates and never comes here.
 *
 * Open-Meteo rather than a second astrology credential: the chart provider
 * would geocode too, through GeoNames, which is another account to hold and
 * another thing to be down. Ten candidates, and only one whose name carries
 * what was typed (`bestPlace`): no chart is better than a wrong one.
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
  const url = geocodingUrl(searchTermFor(city, nation), nation, Deno.env.get('OPEN_METEO_API_KEY'));

  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || !Array.isArray(payload.results)) return null;
  const place = bestPlace(payload.results as GeocoderResult[], city, nation);
  return place ? { latitude: place.latitude, longitude: place.longitude, timezone: place.timezone } : null;
}
