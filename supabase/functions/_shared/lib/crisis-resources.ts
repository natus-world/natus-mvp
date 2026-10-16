import { crisisResourcesFile } from './catalog.ts';
import type { CrisisResource } from './schemas/index.ts';

/**
 * Country lookup for crisis resources. Pure — no storage, no browser.
 *
 * PDR 6.4: the list is never empty. A country outside the MVP set falls back
 * to the international directory plus an instruction to call local emergency
 * services, and never to nothing.
 */

export const MVP_COUNTRIES = ['CL', 'MX', 'CO', 'AR', 'PE'] as const;

/**
 * The country a phone is in, read from its IANA time zone (owner, 16 Oct
 * 2026): the help lines follow where the person is, not only where they
 * said they live. A phone sets its zone by itself when it travels, so this
 * needs no permission and no network — asking for the location in the middle
 * of a crisis would put a dialog between somebody and the numbers.
 *
 * Only the MVP countries, and only zones no other country shares: anything
 * else answers null, and the lines of «País donde vives» stand.
 */
const ZONES: Readonly<Record<string, (typeof MVP_COUNTRIES)[number]>> = {
  'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL',
  'America/Coyhaique': 'CL',
  'Pacific/Easter': 'CL',
  'Chile/Continental': 'CL',
  'Chile/EasterIsland': 'CL',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Merida': 'MX',
  'America/Monterrey': 'MX',
  'America/Matamoros': 'MX',
  'America/Chihuahua': 'MX',
  'America/Ciudad_Juarez': 'MX',
  'America/Ojinaga': 'MX',
  'America/Mazatlan': 'MX',
  'America/Bahia_Banderas': 'MX',
  'America/Hermosillo': 'MX',
  'America/Tijuana': 'MX',
  'Mexico/General': 'MX',
  'Mexico/BajaNorte': 'MX',
  'Mexico/BajaSur': 'MX',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Buenos_Aires': 'AR',
  'America/Cordoba': 'AR',
  'America/Catamarca': 'AR',
  'America/Jujuy': 'AR',
  'America/Mendoza': 'AR',
};

export function countryFromTimeZone(timeZone: string | undefined): string | null {
  if (!timeZone) return null;
  if (timeZone.startsWith('America/Argentina/')) return 'AR';
  return ZONES[timeZone] ?? null;
}

/** Where the lines come from: the country the phone is in, else the one chosen. */
export function helpCountry(home: string | undefined, timeZone: string | undefined): string | undefined {
  return countryFromTimeZone(timeZone) ?? home;
}

export type CrisisResourceSet = {
  country: string;
  resources: CrisisResource[];
  fallback: typeof crisisResourcesFile.fallback;
  /**
   * True when any listed number has not been verified by telephone. The screen
   * must say so. PDR 6.4 calls verification an absolute launch blocker and
   * notes a wrong number here would be the worst bug in the product; showing
   * numbers while quietly implying they were checked is the failure mode this
   * flag exists to prevent.
   */
  unverified: boolean;
};

export function resourcesForCountry(country: string | undefined): CrisisResourceSet {
  const code = (country ?? '').toUpperCase();
  const resources = crisisResourcesFile.resources
    .filter((r) => r.country === code && r.is_active)
    .sort((a, b) => a.priority - b.priority);

  return {
    country: code,
    resources,
    fallback: crisisResourcesFile.fallback,
    // An empty list is unverified by definition: there is nothing local to
    // stand behind, so the international fallback carries the whole screen.
    unverified: resources.length === 0 || resources.some((r) => r.verified_at === null),
  };
}

export type ModelCrisisReply = {
  type: 'crisis';
  severity: 'high';
  category: 'indirecto';
  crisis_response: string;
  resources: CrisisResourceSet;
};

export function modelCrisisReply(crisisResponse: string, country: string | undefined): ModelCrisisReply {
  return {
    type: 'crisis',
    severity: 'high',
    category: 'indirecto',
    crisis_response: crisisResponse,
    resources: resourcesForCountry(country),
  };
}

/** `tel:` href with everything a dialler would choke on removed. */
export function telHref(contact: string): string {
  return `tel:${contact.replace(/[^\d+*#]/g, '')}`;
}
