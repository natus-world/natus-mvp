/**
 * Where somebody was born, as the chart needs it: coordinates and the IANA
 * timezone of the place, so the provider turns the local hour into the right
 * instant (16 Oct 2026).
 *
 * The person picks the place from suggestions, inside the country of birth
 * they chose, and the pick is what is stored and sent. Before, the server took
 * the first thing the geocoder returned for whatever was typed, and some of
 * those were confidently wrong: «León» in Mexico became a village in Baja
 * California, an hour away from León, Guanajuato; «CABA» became a hamlet in
 * Tucumán; «Santiago» in Ecuador, a town in the province of Morona Santiago.
 *
 * Pure: the browser ranks suggestions with it, and the Edge Function uses it
 * for drafts saved before the pick existed.
 */

export type BirthPlace = {
  /** The place as the geocoder names it, e.g. «León de los Aldama». */
  name: string;
  /** The first-level region, e.g. «Estado de Guanajuato». */
  region: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  latitude: number;
  longitude: number;
  /** IANA, e.g. America/Mexico_City. */
  timezone: string;
};

/** One result from Open-Meteo's geocoding search, as far as it is read. */
export type GeocoderResult = {
  name?: unknown;
  admin1?: unknown;
  country_code?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  population?: unknown;
  feature_code?: unknown;
};

export const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * The commercial endpoint (owner, 18 Oct 2026): the same search with the
 * subscription's key. The key lives only on the server; the browser asks the
 * `geocode` function, which adds it.
 */
export const CUSTOMER_GEOCODING_ENDPOINT = 'https://customer-geocoding-api.open-meteo.com/v1/search';

/** The search for `term` inside `country`, with the key when there is one. */
export function geocodingUrl(term: string, country: string, apiKey?: string | null): URL {
  const url = new URL(apiKey ? CUSTOMER_GEOCODING_ENDPOINT : GEOCODING_ENDPOINT);
  url.searchParams.set('name', term);
  url.searchParams.set('countryCode', country);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'es');
  url.searchParams.set('format', 'json');
  if (apiKey) url.searchParams.set('apikey', apiKey);
  return url;
}

/** The geocoder answers nothing for fewer letters than this. */
export const MIN_QUERY_LENGTH = 3;

export function normalizePlaceName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * What people write that the geocoder does not know, per country, mapped to
 * what it does. Keys are normalized.
 */
const ALIASES: Record<string, Record<string, string>> = {
  MX: {
    cdmx: 'Ciudad de México',
    df: 'Ciudad de México',
    'd f': 'Ciudad de México',
    'mexico df': 'Ciudad de México',
    'mexico d f': 'Ciudad de México',
    'distrito federal': 'Ciudad de México',
    'ciudad de mexico': 'Ciudad de México',
    'leon guanajuato': 'León de los Aldama',
  },
  AR: {
    caba: 'Buenos Aires',
    'capital federal': 'Buenos Aires',
    'ciudad autonoma de buenos aires': 'Buenos Aires',
    tucuman: 'San Miguel de Tucumán',
  },
  CL: {
    stgo: 'Santiago de Chile',
  },
  CO: {
    'bogota dc': 'Bogotá',
    'bogota d c': 'Bogotá',
  },
};

/** The name to search for: the alias when there is one, else what was typed. */
export function searchTermFor(query: string, country: string): string {
  return ALIASES[country.toUpperCase()]?.[normalizePlaceName(query)] ?? query.trim();
}

function finite(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

const TIMEZONE = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/;

function toPlace(result: GeocoderResult): BirthPlace | null {
  const name = typeof result.name === 'string' ? result.name.trim() : '';
  const country = typeof result.country_code === 'string' ? result.country_code.toUpperCase() : '';
  const latitude = finite(result.latitude, -90, 90);
  const longitude = finite(result.longitude, -180, 180);
  const timezone = typeof result.timezone === 'string' ? result.timezone : '';
  if (!name || !/^[A-Z]{2}$/.test(country) || latitude === null || longitude === null) return null;
  if (!TIMEZONE.test(timezone)) return null;
  return {
    name,
    region: typeof result.admin1 === 'string' ? result.admin1 : '',
    country,
    latitude,
    longitude,
    timezone,
  };
}

function population(result: GeocoderResult): number {
  return typeof result.population === 'number' ? result.population : 0;
}

/**
 * Populated places only — not airports, rivers or hills — the most populous
 * first, otherwise in the geocoder's order, without repeating a place.
 */
export function rankPlaces(results: readonly GeocoderResult[], limit = 6): BirthPlace[] {
  const seen = new Set<string>();
  return results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => typeof result.feature_code === 'string' && result.feature_code.startsWith('PPL'))
    .sort((a, b) => population(b.result) - population(a.result) || a.index - b.index)
    .flatMap(({ result }) => {
      const place = toPlace(result);
      if (!place) return [];
      const key = `${normalizePlaceName(place.name)}|${normalizePlaceName(place.region)}|${place.country}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [place];
    })
    .slice(0, limit);
}

/**
 * The one place to use for a name typed before suggestions existed, or null.
 *
 * Only a place whose name carries the word that was typed: «León de los
 * Aldama» for «León», never «Tucumanao» for «Tucumán». No chart is better than
 * a chart cast for the wrong town, whose Ascendant and houses would be wrong
 * with nothing on the screen to say so.
 */
export function bestPlace(results: readonly GeocoderResult[], query: string, country: string): BirthPlace | null {
  const wanted = normalizePlaceName(searchTermFor(query, country)).split(' ').filter(Boolean);
  if (wanted.length === 0) return null;
  return (
    rankPlaces(results, results.length).find((place) => {
      if (place.country !== country.toUpperCase()) return false;
      const words = normalizePlaceName(place.name).split(' ');
      return wanted.every((word) => words.includes(word));
    }) ?? null
  );
}

/** Narrows an untrusted place before it decides where a chart is cast. */
export function parseBirthPlace(value: unknown): BirthPlace | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const place = toPlace({
    name: record.name,
    admin1: record.region,
    country_code: record.country,
    latitude: record.latitude,
    longitude: record.longitude,
    timezone: record.timezone,
  });
  if (!place || place.name.length > 160 || place.region.length > 160) return null;
  return place;
}

/** «León de los Aldama, Estado de Guanajuato». */
export function placeLabel(place: BirthPlace): string {
  return place.region && place.region !== place.name ? `${place.name}, ${place.region}` : place.name;
}
