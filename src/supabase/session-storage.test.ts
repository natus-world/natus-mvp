import { describe, expect, it, vi } from 'vitest';
import { arrivesWithNothing, resilientStorage, setSessionLostHandler } from './session-storage';

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

describe('arrivesWithNothing (QA-02)', () => {
  const store = (keys: string[]): Storage => {
    const map = new Map(keys.map((k) => [k, '1']));
    return {
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    };
  };
  const plain = { search: '', hash: '' };

  it('is true for a browser with nothing stored', () => {
    expect(arrivesWithNothing(store([]), plain)).toBe(true);
    expect(arrivesWithNothing(store(['unrelated']), plain)).toBe(true);
  });

  it('is false with a stored session or anything of Natus', () => {
    expect(arrivesWithNothing(store(['sb-khwrauqgwopkgyvbonmp-auth-token']), plain)).toBe(false);
    expect(arrivesWithNothing(store(['natus:anonymous_session']), plain)).toBe(false);
  });

  it('is false on the way back from Google', () => {
    expect(arrivesWithNothing(store([]), { search: '?code=abc', hash: '' })).toBe(false);
    expect(arrivesWithNothing(store([]), { search: '', hash: '#access_token=x' })).toBe(false);
    expect(arrivesWithNothing(store([]), { search: '?error=access_denied', hash: '' })).toBe(false);
  });

  it('is false where storage cannot be read', () => {
    expect(arrivesWithNothing(null, plain)).toBe(false);
  });
});
