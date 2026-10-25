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

/** How many results the geocoder is asked for (its maximum). */
export const GEOCODER_COUNT = 100;

/** The search for `term` inside `country`, with the key when there is one. */
export function geocodingUrl(term: string, country: string, apiKey?: string | null): URL {
  const url = new URL(apiKey ? CUSTOMER_GEOCODING_ENDPOINT : GEOCODING_ENDPOINT);
  url.searchParams.set('name', term);
  url.searchParams.set('countryCode', country);
  // A hundred, not ten (25 Oct 2026): with ten, five hamlets called
  // «Querétaro» left the city out, and «Uruapan» in Baja California sat
  // beside the real one in Michoacán with nothing to tell them apart.
  url.searchParams.set('count', String(GEOCODER_COUNT));
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
 * what it does. Keys are normalized. A list searches each name and shows
 * them together: «Matamoros» is a town in Coahuila and, as «Heroica
 * Matamoros», the city in Tamaulipas.
 */
const ALIASES: Record<string, Record<string, string | readonly string[]>> = {
  MX: {
    cdmx: 'Ciudad de México',
    df: 'Ciudad de México',
    'd f': 'Ciudad de México',
    'mexico df': 'Ciudad de México',
    'mexico d f': 'Ciudad de México',
    'distrito federal': 'Ciudad de México',
    'ciudad de mexico': 'Ciudad de México',
    'leon guanajuato': 'León de los Aldama',
    // GeoNames' names for big cities (25 Oct 2026, from what people typed).
    queretaro: 'Santiago de Querétaro',
    durango: 'Victoria de Durango',
    'tuxtla gutierrez': 'Tuxtla Gtz',
    coatzacoalcos: 'Puerto Mexico',
    coatza: 'Puerto Mexico',
    'ciudad obregon': 'Cd Obregon',
    'cd obregon': 'Cd Obregon',
    'ciudad del carmen': 'Cd Carmen',
    'cd del carmen': 'Cd Carmen',
    'ciudad madero': 'Cd Madero',
    'cd madero': 'Cd Madero',
    'ciudad victoria': 'Cd. Victoria',
    'cd victoria': 'Cd. Victoria',
    matamoros: ['Matamoros', 'Heroica Matamoros'],
    'los cabos': ['Cabo San Lucas', 'San José del Cabo'],
    nezahualcoyotl: 'Neza',
    'ciudad nezahualcoyotl': 'Neza',
    ixtapaluca: 'Iztapaluca',
    tlalnepantla: ['Tlanepantla de baz', 'Tlalnepantla'],
    'tlalnepantla de baz': 'Tlanepantla de baz',
    tultitlan: 'Tultitlá de Mariano Escobedo',
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

function aliasesFor(query: string, country: string): readonly string[] {
  const found = ALIASES[country.toUpperCase()]?.[normalizePlaceName(query)];
  if (found === undefined) return [query.trim()];
  return typeof found === 'string' ? [found] : found;
}

/** The name to search for: the alias when there is one, else what was typed. */
export function searchTermFor(query: string, country: string): string {
  return aliasesFor(query, country)[0] ?? query.trim();
}

/**
 * Abbreviations people add after the city (25 Oct 2026: «Monterrey NL»),
 * expanded to the region's own words. Keys and values normalized.
 */
const REGION_ABBREVIATIONS: Record<string, Record<string, string>> = {
  MX: {
    nl: 'nuevo leon',
    jal: 'jalisco',
    bc: 'baja california',
    bcs: 'baja california sur',
    gto: 'guanajuato',
    qro: 'queretaro',
    mich: 'michoacan',
    ver: 'veracruz',
    chis: 'chiapas',
    oax: 'oaxaca',
    pue: 'puebla',
    yuc: 'yucatan',
    qroo: 'quintana roo',
    'q roo': 'quintana roo',
    son: 'sonora',
    sin: 'sinaloa',
    chih: 'chihuahua',
    coah: 'coahuila',
    tamps: 'tamaulipas',
    tam: 'tamaulipas',
    slp: 'san luis potosi',
    ags: 'aguascalientes',
    zac: 'zacatecas',
    dgo: 'durango',
    nay: 'nayarit',
    col: 'colima',
    gro: 'guerrero',
    mor: 'morelos',
    hgo: 'hidalgo',
    tlax: 'tlaxcala',
    tab: 'tabasco',
    camp: 'campeche',
    edomex: 'estado de mexico',
    'edo mex': 'estado de mexico',
    'edo de mex': 'estado de mexico',
    'edo de mexico': 'estado de mexico',
    mex: 'mexico',
    cdmx: 'ciudad de mexico',
    df: 'ciudad de mexico',
  },
  CO: { dc: 'bogota', 'd c': 'bogota' },
  CL: { rm: 'metropolitana', stgo: 'santiago' },
  AR: { caba: 'ciudad autonoma de buenos aires', bsas: 'buenos aires', 'bs as': 'buenos aires' },
};

/** One search to try: the name to ask for, and what was typed after it, if anything, to tell regions apart. */
export type SearchStep = { terms: readonly string[]; hint: string };

/**
 * The searches to try, in order, until one finds something (25 Oct 2026).
 * People write the city and its state — «Guadalajara, Jalisco», «Monterrey
 * NL», and halfway through, «Mérida, Yuca» — and the geocoder knows only
 * names: with a comma it asks for the city alone and keeps the rest to put
 * that region first; without one, when the whole finds nothing, it drops
 * the last words, at most two.
 */
export function searchSteps(query: string, country: string): SearchStep[] {
  const typed = query.trim().replace(/\s+/g, ' ');
  const comma = typed.indexOf(',');
  if (comma >= 0) {
    const city = typed.slice(0, comma).trim();
    const hint = typed.slice(comma + 1).trim();
    const steps: SearchStep[] = [];
    if (city.length >= MIN_QUERY_LENGTH) steps.push({ terms: aliasesFor(city, country), hint });
    return steps;
  }
  const steps: SearchStep[] = [{ terms: aliasesFor(typed, country), hint: '' }];
  const words = typed.split(' ');
  for (let keep = words.length - 1; keep >= Math.max(1, words.length - 2); keep--) {
    const city = words.slice(0, keep).join(' ');
    if (normalizePlaceName(city).length < MIN_QUERY_LENGTH) break;
    steps.push({ terms: aliasesFor(city, country), hint: words.slice(keep).join(' ') });
  }
  return steps;
}

const REGION_FILLER = /^(estado|provincia|departamento|region|comunidad autonoma|comunidad) (de |del )?/;

/** Whether the words typed after the city name the place's region: «jal» → Estado de Jalisco. */
export function regionMatches(region: string, hint: string, country: string): boolean {
  const typed = normalizePlaceName(hint);
  if (typed === '') return false;
  const wanted = (REGION_ABBREVIATIONS[country.toUpperCase()]?.[typed] ?? typed).split(' ');
  const full = normalizePlaceName(region);
  const words = [...full.split(' '), ...full.replace(REGION_FILLER, '').split(' ')];
  return wanted.every((word) => words.some((w) => w.startsWith(word)));
}

/**
 * GeoNames' shortened or odd names, as the person knows the place (25 Oct
 * 2026): «Cd Obregon» is Ciudad Obregón, «Puerto Mexico» in Veracruz is
 * Coatzacoalcos, «Delegación Iztapalapa» is Iztapalapa. Only the name shown
 * and kept changes; the coordinates are the geocoder's.
 */
const NAME_FIXES: Record<string, Record<string, { name: string; region?: string }>> = {
  MX: {
    'tuxtla gtz': { name: 'Tuxtla Gutiérrez' },
    'cd obregon': { name: 'Ciudad Obregón' },
    'cd carmen': { name: 'Ciudad del Carmen' },
    'puerto mexico': { name: 'Coatzacoalcos', region: 'veracruz' },
    neza: { name: 'Ciudad Nezahualcóyotl' },
    'tlanepantla de baz': { name: 'Tlalnepantla de Baz' },
    iztapaluca: { name: 'Ixtapaluca' },
    'tultitla de mariano escobedo': { name: 'Tultitlán de Mariano Escobedo' },
  },
};

function shownName(name: string, region: string, country: string): string {
  const fix = NAME_FIXES[country]?.[normalizePlaceName(name)];
  if (fix && (!fix.region || normalizePlaceName(region).includes(fix.region))) return fix.name;
  return name
    .replace(/^Cd\.? (?=\S)/, 'Ciudad ')
    .replace(/^Delegación (?=\S)/, '')
    .replace(/^Municipio de (?=\S)/, '');
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
  const region = typeof result.admin1 === 'string' ? result.admin1 : '';
  return {
    name: shownName(name, region, country),
    region,
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
 * Populated places only — not airports, rivers or hills — those in the
 * region typed after the city first, then the most populous, otherwise in
 * the geocoder's order, without repeating a place.
 */
export function rankPlaces(results: readonly GeocoderResult[], limit = 6, hint = ''): BirthPlace[] {
  const seen = new Set<string>();
  return results
    .map((result, index) => ({ result, index, place: toPlace(result) }))
    .filter(({ result }) => typeof result.feature_code === 'string' && result.feature_code.startsWith('PPL'))
    .map((entry) => ({
      ...entry,
      inRegion: entry.place !== null && hint !== '' && regionMatches(entry.place.region, hint, entry.place.country),
    }))
    .sort(
      (a, b) =>
        Number(b.inRegion) - Number(a.inRegion) ||
        population(b.result) - population(a.result) ||
        a.index - b.index,
    )
    .flatMap(({ place }) => {
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
  // What was typed, or the name it was searched as: the place's name may be
  // either once GeoNames' own is fixed («Tuxtla Gtz» shown as Tuxtla Gutiérrez).
  const wanted = [query, searchTermFor(query, country)]
    .map((name) => normalizePlaceName(name).split(' ').filter(Boolean))
    .filter((words) => words.length > 0);
  if (wanted.length === 0) return null;
  return (
    rankPlaces(results, results.length).find((place) => {
      if (place.country !== country.toUpperCase()) return false;
      const words = normalizePlaceName(place.name).split(' ');
      return wanted.some((asked) => asked.every((word) => words.includes(word)));
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

/**
 * Asks the geocoder, through `ask`, step by step until a step finds a place,
 * and ranks what it found (25 Oct 2026). `ask` answers null when the search
 * could not be made; that step then counts as finding nothing.
 */
export async function findPlaces(
  query: string,
  country: string,
  ask: (term: string) => Promise<readonly GeocoderResult[] | null>,
  limit = 6,
): Promise<BirthPlace[]> {
  if (!/^[A-Z]{2}$/.test(country)) return [];
  for (const step of searchSteps(query, country)) {
    const answers = await Promise.all(
      step.terms.filter((term) => term.length >= MIN_QUERY_LENGTH).map((term) => ask(term)),
    );
    const found = rankPlaces(
      answers.flatMap((answer) => answer ?? []),
      limit,
      step.hint,
    );
    if (found.length > 0) return found;
  }
  return [];
}
