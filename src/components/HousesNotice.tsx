import { useState } from 'react';
import { copy } from '@/i18n';
import { activeProfile, getClient } from '@/store/account';
import { getSession } from '@/store/session';
import { browserStorage } from '@/supabase/session-storage';

const text = copy.housesNotice;
// A new key for «ya está»: whoever saw «muy pronto» is told once more.
const SEEN_KEY = 'natus.houses-notice-placidus-seen';

function seen(): boolean {
  try {
    return browserStorage()?.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    browserStorage()?.setItem(SEEN_KEY, '1');
  } catch {
    // Without storage it may show again on the next visit; nothing breaks.
  }
}

/** When the houses moved to Placidus. Whoever arrives after never saw them by whole sign. */
const PLACIDUS_SINCE = Date.parse('2026-10-31T03:00:00Z');

/**
 * Everybody who was here before the change sees it, with or without the hour
 * (owner, 30 Oct 2026: without houses, it may move them to give it).
 */
function hasProfile(): boolean {
  return activeProfile() !== null;
}

/** Somebody who was here before the change, so had seen their houses by whole sign. */
function cameBefore(): boolean {
  const since = getClient()?.created_at ?? getSession()?.created_at;
  return typeof since === 'number' && since < PLACIDUS_SINCE;
}

/**
 * The houses are in Placidus, with whole sign still available (owner, 27–30
 * Oct 2026, after people asked for it). Told once, on entering the app, to
 * whoever was here before the change; somebody new has not seen any yet. Kept in the
 * browser: on another device it may be told once more.
 */
export function HousesNotice() {
  const [open, setOpen] = useState(() => !seen() && hasProfile() && cameBefore());
  if (!open) return null;
  const close = () => {
    markSeen();
    setOpen(false);
  };
  return (
    <div className="pz aviso-casas">
      <div className="velo-a" aria-hidden="true" onClick={close} />
      <div className="hoja-a" role="dialog" aria-modal="true" aria-labelledby="aviso-casas-t">
        <h2 id="aviso-casas-t" className="t">
          {text.title}
        </h2>
        <p className="nota fuerte">{text.body}</p>
        <p className="nota">{text.unchanged}</p>
        <button type="button" className="p1a" onClick={close} autoFocus>
          {text.ok}
        </button>
      </div>
    </div>
  );
}
