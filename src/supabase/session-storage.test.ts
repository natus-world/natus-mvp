import { describe, expect, it, vi } from 'vitest';
import { resilientStorage, setSessionLostHandler } from './session-storage';

/** A storage that can lose what it holds, as some iPhone browsers did (launch night). */
function leaky() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function events() {
  const listeners: ((e: Event) => void)[] = [];
  return {
    addEventListener: (_: string, fn: (e: Event) => void) => void listeners.push(fn),
    fire: (key: string | null, newValue: string | null) =>
      listeners.forEach((fn) => fn({ key, newValue } as unknown as Event)),
  };
}

describe('the session survives a storage that loses it', () => {
  it('CONTROL: reads and writes through to localStorage', () => {
    const store = leaky();
    const s = resilientStorage(store, events());
    s.setItem('sb', 'session-1');
    expect(store.map.get('sb')).toBe('session-1');
    expect(s.getItem('sb')).toBe('session-1');
  });

  it('keeps the session when localStorage drops it, writes it back and reports once', () => {
    const lost = vi.fn();
    setSessionLostHandler(lost);
    const store = leaky();
    const s = resilientStorage(store, events());
    s.setItem('sb', 'session-1');
    store.map.clear();
    expect(s.getItem('sb')).toBe('session-1');
    expect(store.map.get('sb')).toBe('session-1');
    store.map.clear();
    s.getItem('sb');
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('keeps it when localStorage throws', () => {
    const s = resilientStorage(
      {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
      events(),
    );
    s.setItem('sb', 'session-1');
    expect(s.getItem('sb')).toBe('session-1');
  });

  it('prefers what another tab wrote, so the tabs agree on one session', () => {
    const store = leaky();
    const s = resilientStorage(store, events());
    s.setItem('sb', 'session-1');
    store.map.set('sb', 'session-2');
    expect(s.getItem('sb')).toBe('session-2');
  });

  it('never brings back a session signed out here or in another tab', () => {
    const store = leaky();
    const ev = events();
    const s = resilientStorage(store, ev);
    s.setItem('sb', 'session-1');
    s.removeItem('sb');
    expect(s.getItem('sb')).toBeNull();

    s.setItem('sb', 'session-2');
    store.map.delete('sb');
    ev.fire('sb', null);
    expect(s.getItem('sb')).toBeNull();
  });
});
