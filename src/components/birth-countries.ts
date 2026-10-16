import { ALL_COUNTRIES } from './countries';
import { copy } from '@/i18n';

/**
 * The countries the birth place can be in: all of them (owner, 16 Oct 2026).
 * `Open-Meteo` geocodes anywhere, inside the country chosen.
 */
export const BIRTH_COUNTRIES: readonly (readonly [string, string])[] = [
  ['', copy.onboarding.basicData.birthCountryPlaceholder],
  ...ALL_COUNTRIES,
];
