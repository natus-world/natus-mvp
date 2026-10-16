import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { NatalChart } from './lib/natal-chart.ts';
import { computeNumerology } from './lib/numerology.ts';
import { parseBirthPlace, placeLabel } from './lib/places.ts';
import type { Numerology } from './lib/schemas/index.ts';

/**
 * Everything Davraz may know of the person, read here as the person, under
 * RLS (owner, 16 Oct 2026: «que lea la carta, la numerología y toda la
 * info»). The chart as the chart function stored it, the numbers computed
 * from the birth name and date, where and when they were born, what they told
 * at the start and the routine they have. Never the clinical answers: those
 * stay a derived level (PDR 10.2), and nothing here selects them.
 *
 * A failure reads as «nothing known» rather than failing the answer.
 */
export type PersonContext = {
  chart: NatalChart | null;
  numerology: Numerology | null;
  birth: string;
  told: string;
  routine: string[];
};

const PROFILE = 'legal_birth_name, birth_date, birth_time, birth_city, birth_country, birth_place, presenting_need_text';

type ProfileRow = {
  legal_birth_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_country: string | null;
  birth_place: unknown;
  presenting_need_text: string | null;
};

function isChart(value: unknown): value is NatalChart {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { points?: unknown }).points) &&
    Array.isArray((value as { aspects?: unknown }).aspects)
  );
}

export async function readPersonContext(caller: SupabaseClient, userId: string): Promise<PersonContext> {
  const empty: PersonContext = { chart: null, numerology: null, birth: 'sin datos', told: '', routine: [] };
  try {
    const [account, session, chart, routine] = await Promise.all([
      caller.from('clients').select(PROFILE).eq('user_id', userId).maybeSingle(),
      caller.from('anonymous_sessions').select(PROFILE).eq('user_id', userId).maybeSingle(),
      caller.from('natal_charts').select('chart').eq('user_id', userId).maybeSingle(),
      caller.from('routine_practices').select('title').eq('user_id', userId).eq('is_active', true),
    ]);
    const profile = ((account.error ? null : account.data) ?? (session.error ? null : session.data)) as ProfileRow | null;

    let numerology: Numerology | null = null;
    if (profile?.legal_birth_name && profile.birth_date) {
      try {
        numerology = computeNumerology({ legalBirthName: profile.legal_birth_name, birthDate: profile.birth_date });
      } catch {
        numerology = null;
      }
    }

    const place = parseBirthPlace(profile?.birth_place);
    const where = place
      ? `${placeLabel(place)}, ${place.country}`
      : [profile?.birth_city, profile?.birth_country].filter(Boolean).join(', ');
    const birth = profile?.birth_date
      ? [
          profile.birth_date,
          profile.birth_time ? `a las ${profile.birth_time.slice(0, 5)}` : 'sin hora',
          where ? `en ${where}` : '',
        ]
          .filter(Boolean)
          .join(' ')
      : 'sin datos';

    const stored = chart.error ? null : (chart.data as { chart?: unknown } | null)?.chart;
    return {
      chart: isChart(stored) ? stored : null,
      numerology,
      birth,
      told: (profile?.presenting_need_text ?? '').trim(),
      routine: ((routine.error ? [] : routine.data) ?? []).map((r) => String((r as { title: unknown }).title)),
    };
  } catch {
    return empty;
  }
}
