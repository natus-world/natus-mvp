import { detectCrisis, type ClinicalBasics } from '@/lib/safety';
import { activeProfile, updateActiveProfile, updateClientProfile } from './account';
import { currentSynthesis } from './soulMap';
import { updateDraft } from './session';
import { recordCrisisEvent } from './crisis';

export const CARE_PATH = '/cuidarte';

export const CARE_DESTINATIONS = ['/caminos', '/recorrido', '/chat'] as const;
export type CareDestination = (typeof CARE_DESTINATIONS)[number];

export function careDestination(value: unknown): CareDestination {
  return CARE_DESTINATIONS.find((path) => path === value) ?? '/caminos';
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

/**
 * «Cómo trabajar» now opens «Para cuidarte», right before Caminos (owner,
 * 20 Oct 2026): asked of whoever has not answered it — every new map since,
 * and nobody from before, who answered it in the onboarding.
 */
export function needsOpenness(openness: readonly string[] | undefined): boolean {
  return (openness?.length ?? 0) === 0;
}

export function saveOpenness(openness: string[], now = Date.now()): void {
  updateActiveProfile({ openness_to_modalities: openness }, now);
}

export function needsCare(now = Date.now()): boolean {
  const profile = activeProfile(now);
  if (!profile || currentSynthesis() === undefined) return false;
  return !hasAnsweredCare(profile.draft.clinical_basics);
}

/** `alerted`: a low signal was recorded — nothing commercial follows it. */
export type CareOutcome = { next: 'crisis'; eventId: string } | { next: 'continue'; alerted: boolean };

export function completeCare(basics: ClinicalBasics, now = Date.now()): CareOutcome {
  if (basics.ideation_6m === undefined) throw new Error('The ideation answer is required.');

  if (!updateClientProfile({ clinical_basics: basics })) {
    updateDraft({ clinical_basics: basics }, now);
  }

  // The free-text note is read like any other text the person writes (PDR
  // 6.4, Capa 1). High severity stops the flow; a low signal is recorded, as
  // it is in the chat, so the clinical exclusions see it for thirty days.
  const verdict = detectCrisis({ texts: [basics.additional_notes], clinicalBasics: basics });
  if (verdict.crisis && verdict.severity === 'high') {
    return { next: 'crisis', eventId: recordCrisisEvent(verdict, 'onboarding', now).id };
  }
  if (verdict.crisis) recordCrisisEvent(verdict, 'onboarding', now);
  return { next: 'continue', alerted: verdict.crisis };
}

/**
 * The epilepsy answer, asked before the first meditation (owner, 29 Oct
 * 2026): the music is binaural, which is not advised with epilepsy.
 */
export function saveEpilepsy(has: boolean, now = Date.now()): void {
  const profile = activeProfile(now);
  if (!profile) return;
  updateActiveProfile({ clinical_basics: { ...profile.draft.clinical_basics, epilepsy: has } }, now);
}

/** Only an explicit «No» hears the binaural music; unanswered hears mono. */
export function hearsBinaural(basics: ClinicalBasics | undefined): boolean {
  return basics?.epilepsy === false;
}
