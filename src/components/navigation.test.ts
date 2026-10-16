import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showsNav, showsProfile } from './navigation';
import { TABS } from './tabs';
import { enterTakeover, isTakeoverShown, subscribeTakeover } from './takeover';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { clearAll } from '@/store/db';
import { installMemoryStorage } from '@/store/memory-storage.testing.ts';

describe('where the navigation shows', () => {
  it('shows on the destinations, nested routes included', () => {
    expect(showsNav('/hoy', false)).toBe(true);
    expect(showsNav('/perfil', false)).toBe(true);
    expect(showsNav('/comparacion/resultado/abc', false)).toBe(true);
  });

  it('stays off the linear flows', () => {
    expect(showsNav('/', false)).toBe(false);
    expect(showsNav('/onboarding', false)).toBe(false);
    expect(showsNav('/registro', false)).toBe(false);
  });

  it('gives way only to the takeover screen itself', () => {
    expect(showsNav('/hoy', true)).toBe(false);
    expect(showsNav('/perfil', true)).toBe(false);
  });

  it('is not hidden by an active crisis alone', () => {
    installMemoryStorage();
    clearAll();
    recordCrisisEvent(
      { severity: 'high', category: 'ideacion', layer: 'deterministic', matched: ['x'], excerpt: 'x' },
      'chat',
    );
    expect(showsNav('/perfil', isTakeoverShown())).toBe(true);
  });
});

describe('the profile button', () => {
  it('sits on every destination, the profile itself included', () => {
    for (const path of ['/hoy', '/carta', '/caminos', '/recorrido', '/chat', '/perfil', '/meditaciones']) {
      expect(showsProfile(path, false)).toBe(true);
    }
  });

  it('stays off the linear flows', () => {
    expect(showsProfile('/', false)).toBe(false);
    expect(showsProfile('/onboarding', false)).toBe(false);
    expect(showsProfile('/cuidarte', false)).toBe(false);
  });

  it('stays reachable while a crisis screen hides the bar, wherever it is shown', () => {
    for (const path of ['/hoy', '/caminos', '/onboarding', '/cuidarte']) {
      expect(showsNav(path, true)).toBe(false);
      expect(showsProfile(path, true)).toBe(true);
    }
  });
});

describe('the bar', () => {
  it('carries the six tabs that exist, in the guide order', () => {
    expect(TABS.map((tab) => tab.label)).toEqual(['Hoy', 'Carta', 'Caminos', 'Rutina', 'Bitácora', 'Chat']);
    expect(TABS.map((tab) => tab.to)).toEqual(['/hoy', '/carta', '/caminos', '/recorrido', '/bitacora', '/chat']);
  });

  it('leaves the profile, the meditations and the comparison out of it', () => {
    const targets = TABS.map((tab) => tab.to);
    expect(targets).not.toContain('/perfil');
    expect(targets).not.toContain('/meditaciones');
    expect(targets).not.toContain('/comparacion');
  });

  it('shows itself on every tab it offers', () => {
    for (const tab of TABS) expect(showsNav(tab.to, false)).toBe(true);
  });
});

describe('the takeover signal', () => {
  let leave: (() => void) | null = null;

  beforeEach(() => {
    leave = null;
  });

  afterEach(() => {
    leave?.();
  });

  it('is shown while a takeover is mounted and gone once it leaves', () => {
    expect(isTakeoverShown()).toBe(false);
    leave = enterTakeover();
    expect(isTakeoverShown()).toBe(true);
    leave();
    expect(isTakeoverShown()).toBe(false);
  });

  it('notifies on both edges so the navigation comes back without a reload', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTakeover(listener);
    leave = enterTakeover();
    leave();
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('counts each takeover once, even if left twice', () => {
    const first = enterTakeover();
    const second = enterTakeover();
    first();
    first();
    expect(isTakeoverShown()).toBe(true);
    second();
    expect(isTakeoverShown()).toBe(false);
  });

  it('returns the navigation once the crisis is dismissed and its screen unmounts', () => {
    installMemoryStorage();
    clearAll();
    const event = recordCrisisEvent(
      { severity: 'high', category: 'ideacion', layer: 'deterministic', matched: ['x'], excerpt: 'x' },
      'onboarding',
    );
    leave = enterTakeover();
    expect(showsNav('/hoy', isTakeoverShown())).toBe(false);
    markFalsePositive(event.id);
    leave();
    expect(showsNav('/hoy', isTakeoverShown())).toBe(true);
  });
});
