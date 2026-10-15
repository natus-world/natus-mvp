import { detectCrisis, type ClinicalBasics } from '@/lib/safety';
import { activeProfile, updateClientProfile } from './account';
import { currentSynthesis } from './soulMap';
import { updateDraft } from './session';
import { recordCrisisEvent } from './crisis';

export const CARE_PATH = '/cuidarte';

export const CARE_DESTINATIONS = ['/recomendaciones', '/rutina', '/chat'] as const;
export type CareDestination = (typeof CARE_DESTINATIONS)[number];

export function careDestination(value: unknown): CareDestination {
  return CARE_DESTINATIONS.find((path) => path === value) ?? '/recomendaciones';
}

export function hasAnsweredCare(basics: ClinicalBasics | undefined): boolean {
  return basics?.ideation_6m !== undefined;
}

export type Skippable = 'in_treatment' | 'psychiatric_medication';

export function answerYesNo(basics: ClinicalBasics, field: Skippable, value: boolean | 'skip'): ClinicalBasics {
  const next: ClinicalBasics = { ...basics };
  delete next[field];
  if (value !== 'skip') next[field] = value;

  const skipped = new Set(basics.prefer_not_to_say ?? []);
  if (value === 'skip') skipped.add(field);
  else skipped.delete(field);

  delete next.prefer_not_to_say;
  if (skipped.size > 0) next.prefer_not_to_say = [...skipped];
  return next;
}

export function needsCare(now = Date.now()): boolean {
  const profile = activeProfile(now);
  if (!profile || currentSynthesis() === undefined) return false;
  return !hasAnsweredCare(profile.draft.clinical_basics);
}

export type CareOutcome = { next: 'crisis'; eventId: string } | { next: 'continue' };

export function completeCare(basics: ClinicalBasics, now = Date.now()): CareOutcome {
  if (basics.ideation_6m === undefined) throw new Error('The ideation answer is required.');

  if (!updateClientProfile({ clinical_basics: basics })) {
    updateDraft({ clinical_basics: basics }, now);
  }

  const verdict = detectCrisis({ clinicalBasics: basics });
  if (verdict.crisis && verdict.severity === 'high') {
    return { next: 'crisis', eventId: recordCrisisEvent(verdict, 'onboarding', now).id };
  }
  return { next: 'continue' };
}
