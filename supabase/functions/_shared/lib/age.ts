/**
 * Natus is for adults (owner, 16 Oct 2026: «no entran a la plataforma menores
 * de 18»). The birth date decides, in the person's own calendar: whole years
 * on the date, not on the instant.
 */
export const MINIMUM_AGE = 18;

/** The latest birth date that is 18 today, as YYYY-MM-DD. */
export function latestAdultBirthDate(today: Date): string {
  const y = today.getFullYear() - MINIMUM_AGE;
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  // 29 February resolves to the 28th in a year without it: string order does it.
  return `${y}-${m}-${d}`;
}

export function isAdultOn(isoBirthDate: string, today: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoBirthDate)) return false;
  return isoBirthDate <= latestAdultBirthDate(today);
}
