/**
 * Narrowing an untrusted birth subject before it can consume a provider call.
 *
 * Pure, and here rather than beside the Edge Function because the browser
 * validates the same shape before sending it and the server validates it
 * again on arrival. Two copies of a bounds check drift, and the one that
 * drifts loose is the one that spends money.
 */

export type AstrologerSubject = {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city: string;
  nation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown, min: number, max: number): number | null {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
    ? Number(value)
    : null;
}

/** Narrows an untrusted request body before it can consume a provider call. */
export function parseAstrologerSubject(value: unknown): AstrologerSubject | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const city = typeof value.city === 'string' ? value.city.trim() : '';
  const nation = typeof value.nation === 'string' ? value.nation.trim().toUpperCase() : '';
  const year = integer(value.year, 1, 3000);
  const month = integer(value.month, 1, 12);
  const day = integer(value.day, 1, 31);
  const hour = integer(value.hour, 0, 23);
  const minute = integer(value.minute, 0, 59);

  if (
    !name ||
    name.length > 160 ||
    !city ||
    city.length > 120 ||
    !/^[A-Z]{2}$/.test(nation) ||
    year === null ||
    month === null ||
    day === null ||
    hour === null ||
    minute === null
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { name, year, month, day, hour, minute, city, nation };
}

/** The four points the hour of birth decides. */
const ANGLES = ['Ascendant', 'Descendant', 'Medium_Coeli', 'Imum_Coeli'];

/**
 * A chart calculated without the hour of birth, minus what the hour decides.
 *
 * v1.2 A-01 and PDR US-1.2 CA2: without the hour there is no Ascendant and
 * there are no houses. The chart is still calculated — at local noon, the
 * usual convention — so the signs of the planets reach the Soul Map, but
 * everything that noon would merely invent is removed here, before it is
 * stored, rather than left in the text for the prompt to be asked to ignore.
 *
 * Works on the provider's `context` XML as text. What goes: the four angles,
 * the house list, every `house="…"` attribute, every aspect to an angle, the
 * angles in `active_points`, the hour in `birth_data`, the house system in
 * `config`, and the three summaries computed with the angles counted in
 * (element and quality distribution, active aspect counts) along with the
 * aspect total, which no longer matches the list beneath it.
 */
export function withoutBirthTime(context: string): string {
  const angle = ANGLES.join('|');
  return context
    .replace(new RegExp(`\\s*<point name="(?:${angle})"[^>]*/>`, 'g'), '')
    .replace(/\s*<houses>[\s\S]*?<\/houses>/g, '')
    .replace(/\s+house="[^"]*"/g, '')
    .replace(new RegExp(`\\s*<aspect [^>]*p[12]="(?:${angle})"[^>]*/>`, 'g'), '')
    .replace(/<active_points>([^<]*)<\/active_points>/g, (_, list: string) => {
      const kept = list
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== '' && !ANGLES.includes(name));
      return `<active_points>${kept.join(', ')}</active_points>`;
    })
    .replace(/(<birth_data [^>]*date="\d{4}-\d{2}-\d{2}) \d{2}:\d{2}"/g, '$1"')
    .replace(/\s+house_system="[^"]*"/g, '')
    .replace(/\s*<(?:element_distribution|quality_distribution)\b[^>]*\/>/g, '')
    .replace(/\s*<active_aspects>[^<]*<\/active_aspects>/g, '')
    .replace(/(<aspects) count="\d+"/g, '$1');
}
