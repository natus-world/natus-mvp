import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_TTL_MS,
  attachSoulMap,
  claimSession,
  emptyDraft,
  getOrCreateSession,
  getSession,
  isDraftComplete,
  restartOnboarding,
  setStep,
  updateDraft,
} from './session';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

const T0 = 1_000_000;

describe('US-1.1 — reaching the Soul Map without an account', () => {
  it('CA2: a session with a soul map exists by the end of onboarding', () => {
    getOrCreateSession(T0);
    updateDraft({ legal_birth_name: 'Ana Perez' }, T0);
    const session = attachSoulMap('soul-map-1', T0);
    expect(session.soul_map_id).toBe('soul-map-1');
  });

  it('CA3: the session survives a closed browser inside seven days', () => {
    getOrCreateSession(T0);
    updateDraft({ presenting_need_text: 'no se por donde empezar' }, T0);

    const later = getSession(T0 + SESSION_TTL_MS - 1);
    expect(later?.draft.presenting_need_text).toBe('no se por donde empezar');
  });

  it('CA3: and is gone once seven days have passed', () => {
    getOrCreateSession(T0);
    expect(getSession(T0 + SESSION_TTL_MS)).toBeNull();
  });

  it('CA4: claiming at signup makes the anonymous record unusable', () => {
    getOrCreateSession(T0);
    const claimed = claimSession('client-1', T0 + 1000);

    expect(claimed?.claimed_by).toBe('client-1');
    // Reads stop serving it immediately — the row exists, claimed, and no
    // longer answers. Deleting it would lose the fact that it was claimed.
    expect(getSession(T0 + 1000)).toBeNull();
  });

  it('claiming when there is nothing to claim is a no-op', () => {
    expect(claimSession('client-1', T0)).toBeNull();
  });
});

describe('US-1.2 — skipping birth time and city must not block', () => {
  const base = {
    ...emptyDraft(),
    legal_birth_name: 'Ana Perez',
    birth_date: '1990-06-04',
    presenting_need_text: 'algo tiene que cambiar',
    openness_to_modalities: ['terapia-somatica'],
    clinical_basics: { ideation_6m: 'no' as const },
  };

  it('CA1: a draft with no birth time or city is complete', () => {
    expect(isDraftComplete({ ...base, birth_time: '', birth_city: '' })).toBe(true);
  });

  it('is incomplete without a name', () => {
    expect(isDraftComplete({ ...base, legal_birth_name: '  ' })).toBe(false);
  });

  it('O-06: is complete without the clinical answers, which come after the map', () => {
    expect(isDraftComplete({ ...base, clinical_basics: {} })).toBe(true);
  });

  it('accepts a shortcut instead of free text', () => {
    expect(
      isDraftComplete({ ...base, presenting_need_text: '', presenting_need_slugs: ['perdida'] }),
    ).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(isDraftComplete({ ...base, birth_date: '04/06/1990' })).toBe(false);
  });
});

describe('step tracking', () => {
  it('only ever advances, so reviewing an earlier answer loses nothing', () => {
    getOrCreateSession(T0);
    setStep(4, T0);
    const back = setStep(1, T0);
    expect(back.step).toBe(4);
  });
});

describe('S-08 — «Empezar de nuevo» empties the form', () => {
  it('clears every answer of the three steps and the step counter', () => {
    getOrCreateSession(T0);
    updateDraft(
      {
        legal_birth_name: 'Ana Perez',
        grammatical_gender: 'femenino',
        birth_date: '1990-06-04',
        birth_time: '08:15',
        birth_city: 'Valparaíso',
        birth_country: 'CL',
        country: 'MX',
        presenting_need_text: 'algo tiene que cambiar',
        presenting_need_slugs: ['perdida'],
        openness_to_modalities: ['reiki'],
      },
      T0,
    );
    setStep(3, T0);

    const restarted = restartOnboarding(T0);

    expect(restarted.step).toBe(0);
    expect(restarted.draft).toEqual(emptyDraft());
    expect(getSession(T0)?.draft).toEqual(emptyDraft());
  });

  it('keeps «Para cuidarte» answered, so nobody is asked those questions twice', () => {
    getOrCreateSession(T0);
    updateDraft({ legal_birth_name: 'Ana Perez', clinical_basics: { ideation_6m: 'no' } }, T0);

    const restarted = restartOnboarding(T0);

    expect(restarted.draft.legal_birth_name).toBe('');
    expect(restarted.draft.clinical_basics).toEqual({ ideation_6m: 'no' });
  });

  it('keeps the existing map attached until a new one replaces it', () => {
    getOrCreateSession(T0);
    attachSoulMap('soul-map-1', T0);
    expect(restartOnboarding(T0).soul_map_id).toBe('soul-map-1');
  });
});
