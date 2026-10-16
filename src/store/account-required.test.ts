import { beforeEach, describe, expect, it } from 'vitest';
import { accountRequired, clearAccountRequirement, requireAccount } from './account-required';
import { signUp } from './account';
import { attachSoulMap, getOrCreateSession, updateDraft } from './session';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

describe('Google before the map (owner, 16 Oct 2026)', () => {
  it('asks nobody who made their map before it was required', () => {
    expect(accountRequired()).toBe(false);
  });

  it('asks a new map to be saved until there is an account', () => {
    requireAccount();
    expect(accountRequired()).toBe(true);

    getOrCreateSession(1);
    updateDraft({ legal_birth_name: 'Ana Perez', birth_date: '1990-06-04' }, 1);
    attachSoulMap('synthesis-1', 1);
    signUp({ email: 'ana@example.test' });
    expect(accountRequired()).toBe(false);
  });

  it('stops asking once cleared', () => {
    requireAccount();
    clearAccountRequirement();
    expect(accountRequired()).toBe(false);
  });
});
