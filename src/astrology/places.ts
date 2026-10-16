import {
  GEOCODING_ENDPOINT,
  MIN_QUERY_LENGTH,
  rankPlaces,
  searchTermFor,
  type BirthPlace,
  type GeocoderResult,
} from '@/lib/places';

/**
 * Suggestions for the birth place, inside the country of birth (16 Oct 2026).
 * Asked of Open-Meteo straight from the browser: the name typed and the
 * country, nothing else. An error is an empty list — the field says it found
 * nothing and the person can try another name.
 */
export async function searchPlaces(query: string, country: string, signal?: AbortSignal): Promise<BirthPlace[]> {
  const term = searchTermFor(query, country);
  if (term.length < MIN_QUERY_LENGTH || !/^[A-Z]{2}$/.test(country)) return [];
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set('name', term);
  url.searchParams.set('countryCode', country);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'es');
  url.searchParams.set('format', 'json');
  try {
    const response = await fetch(url, signal ? { signal } : {});
    if (!response.ok) return [];
    const payload = (await response.json()) as { results?: GeocoderResult[] };
    return rankPlaces(Array.isArray(payload.results) ? payload.results : []);
  } catch {
    return [];
  }
}
