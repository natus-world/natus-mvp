import { helpCountry } from '@/lib/crisis-resources';

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
