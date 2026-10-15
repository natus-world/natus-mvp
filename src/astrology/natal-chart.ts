import { isBackendConfigured, supabase } from '@/supabase/client';
import type { NatalChartDraft, OnboardingDraft } from '@/store/session';

type NatalChartResponse = {
  context?: unknown;
  api_version?: unknown;
  error?: unknown;
};

export class NatalChartError extends Error {}

export function natalChartInput(draft: OnboardingDraft) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.birth_date);
  const time = /^(\d{2}):(\d{2})$/.exec(draft.birth_time.trim());
  const nation = draft.birth_country.trim().toUpperCase();
  const city = draft.birth_city.trim();
  const name = draft.legal_birth_name.trim();

  if (!date || !name || !city || !/^[A-Z]{2}$/.test(nation)) {
    throw new NatalChartError(
      'Revisa la fecha, la ciudad y el país de nacimiento antes de calcular tu carta.',
    );
  }

  return {
    name,
    year: Number(date[1]),
    month: Number(date[2]),
    day: Number(date[3]),
    // The hour is optional (PDR US-1.2). Without it the chart is calculated at
    // local noon and the server removes what noon would invent: Ascendant
    // and houses (v1.2 A-01). See `withoutBirthTime`.
    hour: time ? Number(time[1]) : 12,
    minute: time ? Number(time[2]) : 0,
    city,
    nation,
  };
}

export function hasNatalChartInput(draft: OnboardingDraft): boolean {
  try {
    natalChartInput(draft);
    return true;
  } catch (error) {
    if (error instanceof NatalChartError) return false;
    throw error;
  }
}

/** Whether the person gave an hour of birth the chart can rely on. */
export function hasBirthTime(draft: OnboardingDraft): boolean {
  return /^\d{2}:\d{2}$/.test(draft.birth_time.trim());
}

/**
 * Whether the chart should be calculated for this draft. With the hour, always
 * when the birth data is complete. Without it, only if the person said yes:
 * a chart without the hour has no Ascendant and no houses, and it is theirs to
 * decide whether that is worth having (Nico, 15 Oct 2026).
 */
export function shouldCalculateNatalChart(draft: OnboardingDraft): boolean {
  if (!hasNatalChartInput(draft)) return false;
  return hasBirthTime(draft) || draft.chart_without_time === true;
}

export async function calculateNatalChart(draft: OnboardingDraft): Promise<NatalChartDraft> {
  const subject = natalChartInput(draft);
  if (!isBackendConfigured || !supabase) {
    throw new NatalChartError(
      'El cálculo de la carta necesita conexión con el servicio. Puedes seguir sin ella en esta demo.',
    );
  }

  let response;
  try {
    response = await supabase.functions.invoke<NatalChartResponse>('natal-chart', {
      body: { subject, time_known: hasBirthTime(draft) },
    });
  } catch {
    throw new NatalChartError(
      'No pudimos calcular tu carta ahora. El resto de tu mapa puede generarse igual.',
    );
  }

  const { data, error } = response;

  if (error || typeof data?.context !== 'string' || data.context.trim() === '') {
    throw new NatalChartError(
      'No pudimos calcular tu carta con ese lugar. Revisa la ciudad y el país, o sigue sin ella.',
    );
  }

  return {
    provider: 'astrologer',
    api_version: 'v6',
    context: data.context,
    calculated_at: Date.now(),
    parse_status: 'parsed',
  };
}

