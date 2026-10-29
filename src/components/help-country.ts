import { countryFromTimeZone, helpCountry } from '@/lib/crisis-resources';

/** The phone's IANA time zone, or undefined when the browser will not say. */
function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * The country whose help lines to show: where the phone is now, read from its
 * time zone, else «País donde vives» (owner, 16 Oct 2026). Every list of lines
 * goes through this, so they cannot disagree.
 */
export function linesCountry(home: string | undefined): string | undefined {
  return helpCountry(home, deviceTimeZone());
}

/**
 * «País donde vives» left the birth step (owner, 29 Oct 2026: «Define qué
 * líneas de ayuda ves» did not read). It is set without asking: the country
 * the phone is in, else the country of birth; Perfil still changes it.
 */
export function guessedHomeCountry(birthCountry: string): string {
  return countryFromTimeZone(deviceTimeZone()) ?? birthCountry;
}
