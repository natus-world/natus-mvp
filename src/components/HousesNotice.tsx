import { useState } from 'react';
import { copy } from '@/i18n';
import { hasBirthTime } from '@/astrology/natal-chart';
import { activeProfile } from '@/store/account';
import { browserStorage } from '@/supabase/session-storage';

const text = copy.housesNotice;
const SEEN_KEY = 'natus.houses-notice-seen';

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

/** Somebody whose chart has houses: it was cast and they gave the hour. */
function hasHouses(): boolean {
  const draft = activeProfile()?.draft;
  if (!draft) return false;
  return draft.natal_chart?.parse_status === 'parsed' && hasBirthTime(draft);
}

/**
 * The houses are moving to Placidus, with whole sign still available (owner,
 * 27 Oct 2026, after people asked for it). Told once, on entering the app, to
 * whoever already has houses; somebody new has not seen any yet. Kept in the
 * browser: on another device it may be told once more.
 */
export function HousesNotice() {
  const [open, setOpen] = useState(() => !seen() && hasHouses());
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
