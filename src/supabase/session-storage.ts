/**
 * Where the sign-in session is kept: the browser's localStorage, with a copy
 * held in memory for the life of the page.
 *
 * On launch night (22–23 Oct 2026) four people on iPhone browsers other than
 * Safari — Chrome and Ecosia — lost their session about two seconds after the
 * app opened: the first requests went out as the person, and from then on
 * every request carried only the public key and the database refused it.
 * No sign-out was asked for; the session read back from storage was simply
 * gone. They could fill in their data, but nothing was kept and no map could
 * be written. Supabase reads the session from storage on every request, so a
 * value that vanishes from localStorage ends the session there and then.
 *
 * localStorage stays the source whenever it answers, so several tabs keep
 * agreeing on one session (a refresh in one is read by the others). Only when
 * it comes back empty for a session this page still holds is the copy used,
 * written back, and the loss reported once — so the next night says how
 * often it happens. A sign-out in another tab clears the copy too (the
 * `storage` event), so it is never brought back from the dead.
 */
export type SessionStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

let onLost: ((key: string) => void) | null = null;

/** Told once per page, the first time a session had to be taken from memory. */
export function setSessionLostHandler(handler: (key: string) => void): void {
  onLost = handler;
}

export function resilientStorage(
  store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  events: Pick<Window, 'addEventListener'> | null = typeof window === 'undefined' ? null : window,
): SessionStorage {
  const memory = new Map<string, string>();
  let told = false;

  events?.addEventListener('storage', (event: Event) => {
    const change = event as StorageEvent;
    if (change.key === null) {
      memory.clear();
    } else if (change.newValue === null) {
      memory.delete(change.key);
    } else {
      memory.set(change.key, change.newValue);
    }
  });

  return {
    getItem(key) {
      let value: string | null = null;
      try {
        value = store?.getItem(key) ?? null;
      } catch {
        value = null;
      }
      if (value !== null) {
        memory.set(key, value);
        return value;
      }
      const kept = memory.get(key) ?? null;
      if (kept !== null) {
        try {
          store?.setItem(key, kept);
        } catch {
          /* the copy in memory is enough for this page */
        }
        if (!told) {
          told = true;
          onLost?.(key);
        }
      }
      return kept;
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        store?.setItem(key, value);
      } catch {
        /* kept in memory */
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        store?.removeItem(key);
      } catch {
        /* nothing left to remove */
      }
    },
  };
}

/** The browser's localStorage, or null where touching it throws. */
export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether this browser arrives with nothing: no stored auth session, no
 * onboarding begun, and not on the way back from Google (a `code` or a token
 * in the address). Only such a visit may see the welcome before hydration
 * ends (QA-02, owner, 23 Oct 2026): for it, the fourteen reads find nothing,
 * so waiting for them showed an empty screen for nothing.
 */
export function arrivesWithNothing(storage: Storage | null, address: { search: string; hash: string }): boolean {
  if (!storage) return false;
  if (/[?&](code|error)=/.test(address.search) || /(access_token|error)=/.test(address.hash)) return false;
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i) ?? '';
      if (/^sb-.+-auth-token/.test(key) || key.startsWith('natus:')) return false;
    }
  } catch {
    return false;
  }
  return true;
}
