import { beforeEach, describe, expect, it } from 'vitest';
import { answerYesNo, careDestination, completeCare, hasAnsweredCare, needsCare } from './care';
import { activeProfile, signUp } from './account';
import { activeHighSeverityEvent, listCrisisEvents } from './crisis';
import { getOrCreateSession, updateDraft } from './session';
import { saveSynthesis } from './soulMap';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';
import { ALL_SOUL_MAP_FIXTURES } from '@/ai/fixtures/soul-map';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

const T0 = Date.now();

function withMap(): void {
  getOrCreateSession(T0);
  updateDraft({ legal_birth_name: 'Ana Perez', birth_date: '1990-06-04' }, T0);
  saveSynthesis({
    synthesis: ALL_SOUL_MAP_FIXTURES[0]!,
    numerology: null,
    promptVersion: 'test',
    mode: 'fixture',
    latencyMs: 0,
    now: T0,
  });
}

describe('O-06 — «Para cuidarte» sits between the map and Caminos', () => {
  it('is not asked before there is a map to have seen', () => {
    getOrCreateSession(T0);
    expect(needsCare(T0)).toBe(false);
  });

  it('is asked once the map exists and the answers do not', () => {
    withMap();
    expect(needsCare(T0)).toBe(true);
  });

  it('counts only the ideation answer, the one that cannot be skipped', () => {
    expect(hasAnsweredCare({})).toBe(false);
    expect(hasAnsweredCare({ prefer_not_to_say: ['in_treatment'] })).toBe(false);
    expect(hasAnsweredCare({ ideation_6m: 'no' })).toBe(true);
  });

  it('is not asked again of somebody who answered in the old onboarding', () => {
    withMap();
    updateDraft({ clinical_basics: { ideation_6m: 'fugaces_sin_plan', in_treatment: true } }, T0);
    expect(needsCare(T0)).toBe(false);
  });

  it('reads the account after signup, as every other screen does', () => {
    withMap();
    signUp({ email: 'ana@ejemplo.cl', now: T0 });
    expect(needsCare(T0)).toBe(true);

    completeCare({ ideation_6m: 'no' }, T0);

    expect(activeProfile(T0)?.draft.clinical_basics).toEqual({ ideation_6m: 'no' });
    expect(needsCare(T0)).toBe(false);
  });

  it('stores the answers and continues when nothing in them is a crisis', () => {
    withMap();
    const outcome = completeCare({ ideation_6m: 'frecuentes', prefer_not_to_say: ['psychiatric_medication'] }, T0);

    expect(outcome).toEqual({ next: 'continue' });
    expect(activeProfile(T0)?.draft.clinical_basics.ideation_6m).toBe('frecuentes');
    expect(listCrisisEvents()).toHaveLength(0);
  });

  it('sends ideation with a plan to the crisis screen, not to Caminos', () => {
    withMap();
    const outcome = completeCare({ ideation_6m: 'plan_o_intencion' }, T0);

    expect(outcome.next).toBe('crisis');
    const event = activeHighSeverityEvent(T0);
    expect(outcome.next === 'crisis' && outcome.eventId).toBe(event?.id);
    expect(event?.from_clinical_answer).toBe(true);
    expect(event?.source_surface).toBe('onboarding');
  });

  it('refuses to record answers without the ideation one', () => {
    withMap();
    expect(() => completeCare({ in_treatment: false }, T0)).toThrow();
    expect(needsCare(T0)).toBe(true);
  });

  it('makes «Prefiero no decir» and an answer exclusive of each other', () => {
    const answered = answerYesNo({ ideation_6m: 'no' }, 'in_treatment', true);
    expect(answered).toEqual({ ideation_6m: 'no', in_treatment: true });

    const skipped = answerYesNo(answered, 'in_treatment', 'skip');
    expect(skipped).toEqual({ ideation_6m: 'no', prefer_not_to_say: ['in_treatment'] });

    const both = answerYesNo(skipped, 'psychiatric_medication', 'skip');
    expect(both.prefer_not_to_say).toEqual(['in_treatment', 'psychiatric_medication']);

    expect(answerYesNo(both, 'in_treatment', false)).toEqual({
      ideation_6m: 'no',
      in_treatment: false,
      prefer_not_to_say: ['psychiatric_medication'],
    });
  });

  it('returns only to a destination it gates', () => {
    expect(careDestination('/chat')).toBe('/chat');
    expect(careDestination('/rutina')).toBe('/rutina');
    expect(careDestination('https://example.com')).toBe('/recomendaciones');
    expect(careDestination(undefined)).toBe('/recomendaciones');
  });
});
