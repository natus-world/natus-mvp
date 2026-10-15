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
  const marker = `${NATAL_CHART_VERSION}:${draft.natal_chart.calculated_at}:${draft.natal_chart.context.length}`;
  if (read<string | null>('whole_sign_chart', null) === marker) return;
  try {
    const { error } = await supabase.functions.invoke('natal-chart', { body: { rebuild: true } });
    if (!error) write('whole_sign_chart', marker);
  } catch {
    // Tried again next time.
  }
}
