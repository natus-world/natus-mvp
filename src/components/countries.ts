import { copy } from '@/i18n';

/**
 * Every country of the world (owner, 16 Oct 2026: anybody may be born or live
 * anywhere). ISO 3166-1 alpha-2, the codes the geocoder and the crisis lines
 * use; the names come from the browser's own Spanish (`Intl.DisplayNames`),
 * so nobody hand-translates 249 names.
 */
const ISO_3166 = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS ' +
  'BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE ' +
  'EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM ' +
  'HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC ' +
  'LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA ' +
  'NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO ' +
  'TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

/** «Otro país», kept for whoever chose it before every country was offered. */
export const ELSEWHERE = 'XX';

/** The five with help lines of their own, in the package's order. */
export const LINES_COUNTRIES = ['CL', 'MX', 'CO', 'PE', 'AR'] as const;

const names = (() => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** «Chile», «España»… or the code itself if the browser cannot name it. */
export function countryName(code: string): string {
  if (code === ELSEWHERE) return copy.onboarding.basicData.elsewhere;
  const known = copy.birthCountries.find(([c]) => c === code)?.[1];
  if (known) return known;
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country, by its Spanish name. */
export const ALL_COUNTRIES: readonly (readonly [string, string])[] = ISO_3166.map(
  (code) => [code, countryName(code)] as const,
).sort(([, a], [, b]) => a.localeCompare(b, 'es'));

/** Where somebody may live: the five with lines first, then everybody else. */
export const LIVING_COUNTRIES = {
  first: LINES_COUNTRIES.map((code) => [code, countryName(code)] as const),
  rest: ALL_COUNTRIES.filter(([code]) => !(LINES_COUNTRIES as readonly string[]).includes(code)),
};
