import { beforeEach, describe, expect, it } from 'vitest';
import { accountRequired, clearAccountRequirement, requireAccount, sendsToSignup } from './account-required';
import { signUp } from './account';
import { attachSoulMap, getOrCreateSession, updateDraft } from './session';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';
import { saveSynthesis } from './soulMap';
import type { SoulMapSynthesis } from '@/lib/schemas';

const aMap = () =>
  saveSynthesis({ synthesis: {} as SoulMapSynthesis, numerology: null, promptVersion: 'v', mode: 'server', latencyMs: 1 });

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

describe('Google before the map (owner, 16 Oct 2026)', () => {
  it('asks nobody who made their map before it was required', () => {
    expect(accountRequired()).toBe(false);
  });

  it('asks a new map to be saved until there is an account', () => {
    aMap();
    requireAccount();
    expect(accountRequired()).toBe(true);

    getOrCreateSession(1);
    updateDraft({ legal_birth_name: 'Ana Perez', birth_date: '1990-06-04' }, 1);
    attachSoulMap('synthesis-1', 1);
    signUp({ email: 'ana@example.test' });
    expect(accountRequired()).toBe(false);
  });

  it('stops asking once cleared', () => {
    aMap();
    requireAccount();
    clearAccountRequirement();
    expect(accountRequired()).toBe(false);
  });
});

describe('the preview before the account (owner, 20–21 Oct 2026)', () => {
  it('lets only the preview on screen stand in front of «Guarda tu mapa»', () => {
    aMap();
    requireAccount();
    expect(sendsToSignup('/carta', true)).toBe(false);
    expect(sendsToSignup('/carta', false)).toBe(true);
    expect(sendsToSignup('/caminos', true)).toBe(true);
    expect(sendsToSignup('/cuidarte', true)).toBe(true);
    expect(sendsToSignup('/hoy', false)).toBe(true);
  });

  it('keeps the form and the policies open while the account is owed', () => {
    aMap();
    requireAccount();
    for (const path of ['/registro', '/privacidad', '/terminos']) expect(sendsToSignup(path, false)).toBe(false);
  });

  it('sends nobody anywhere once nothing is owed', () => {
    expect(sendsToSignup('/caminos', false)).toBe(false);
  });

  it('asks nothing when there is no map to save: «Empezar» opens the steps (owner, 22 Oct 2026)', () => {
    // An account deleted, and the mark left behind in the browser.
    requireAccount();
    expect(accountRequired()).toBe(false);
    expect(sendsToSignup('/onboarding', false)).toBe(false);
    aMap();
    expect(sendsToSignup('/onboarding', false)).toBe(true);
  });
});
