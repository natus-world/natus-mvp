import { isBackendConfigured, supabase } from '@/supabase/client.ts';
import { read, write } from './db.ts';
import type { OnboardingDraft } from './session.ts';
import { NATAL_CHART_VERSION } from '@/lib/natal-chart.ts';

/**
 * v1.2 A-01: charts calculated before houses became whole-sign are rebuilt
 * from the stored text, once per stored chart, with no call to the provider.
 * Run after the session is hydrated; a failure is simply tried again on the
 * next visit.
 */
export async function ensureWholeSignChart(draft: OnboardingDraft): Promise<void> {
  if (!isBackendConfigured || !supabase || !draft.natal_chart) return;
  // A new version of the calculation rebuilds every stored chart once more.
  // Without the hour, the Moon's rule and day or night (owner, 22 Oct 2026)
  // rebuild those charts only: a chart with the hour is unchanged by it, and
  // rebuilding it would make its readings stale for nothing.
  const noHour = /^\d{2}:\d{2}$/.test(draft.birth_time.trim()) ? '' : `:sin-hora-v1:${draft.birth_daynight ?? ''}`;
  const marker = `${NATAL_CHART_VERSION}:${draft.natal_chart.calculated_at}:${draft.natal_chart.context.length}${noHour}`;
  if (read<string | null>('whole_sign_chart', null) === marker) return;
  try {
    const { error } = await supabase.functions.invoke('natal-chart', { body: { rebuild: true } });
    if (!error) write('whole_sign_chart', marker);
  } catch {
    // Tried again next time.
  }
}
