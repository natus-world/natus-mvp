import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showsNav } from './navigation';
import { enterTakeover, isTakeoverShown, subscribeTakeover } from './takeover';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { clearAll } from '@/store/db';
import { installMemoryStorage } from '@/store/memory-storage.testing.ts';

describe('where the navigation shows', () => {
  it('shows on the destinations, nested routes included', () => {
    expect(showsNav('/inicio', false)).toBe(true);
    expect(showsNav('/cuenta', false)).toBe(true);
    expect(showsNav('/comparacion/resultado/abc', false)).toBe(true);
  });

  it('stays off the linear flows', () => {
    expect(showsNav('/', false)).toBe(false);
    expect(showsNav('/onboarding', false)).toBe(false);
    expect(showsNav('/registro', false)).toBe(false);
  });

  it('gives way only to the takeover screen itself', () => {
    expect(showsNav('/inicio', true)).toBe(false);
    expect(showsNav('/cuenta', true)).toBe(false);
  });

  it('is not hidden by an active crisis alone', () => {
    installMemoryStorage();
    clearAll();
    recordCrisisEvent(
      { severity: 'high', category: 'ideacion', layer: 'deterministic', matched: ['x'], excerpt: 'x' },
      'chat',
    );
    expect(showsNav('/cuenta', isTakeoverShown())).toBe(true);
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
    expect(showsNav('/inicio', isTakeoverShown())).toBe(false);
    markFalsePositive(event.id);
    leave();
    expect(showsNav('/inicio', isTakeoverShown())).toBe(true);
  });
});
