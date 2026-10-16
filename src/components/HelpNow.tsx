import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent } from 'react';
import { CrisisResourceList } from '@/components/CrisisResourceList';
import { activeProfile } from '@/store/account';
import { resourcesForCountry } from '@/lib/crisis-resources';
import { copy } from '@/i18n';

const t = copy.chrome.helpNow;

export function HelpNowButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={t.label}
      className="help-pill shrink-0"
    >
      {t.button}
    </button>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** How far the sheet has to be pulled down before it closes. */
const SWIPE_CLOSE_PX = 90;

/** The name of the country whose lines are shown, or null for «Otro país». */
function countryName(country: string | undefined): string | null {
  if (resourcesForCountry(country).resources.length === 0) return null;
  const code = (country ?? '').toUpperCase();
  return copy.onboarding.basicData.countries.find(([c]) => c === code)?.[1] ?? null;
}

/**
 * «Necesito ayuda» (package 12, 16 Oct 2026): a cream sheet over whatever
 * screen is open, rising from the bottom on the phone and centred on desktop,
 * behind it only a neutral black dim. Closed by the ×, by Escape, by touching
 * outside or by pulling it down. Never an offer of anything: lines to call.
 */
export function HelpNowPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ start: number; dy: number } | null>(null);
  const country = activeProfile()?.draft.country;
  const name = countryName(country);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Back to the pill that opened it.
      if (before?.isConnected) before.focus();
    };
  }, [onClose]);

  // Focus stays inside the dialog while it is open.
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !sheetRef.current) return;
    const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    const touch = event.touches[0];
    // Only the phone's sheet rises from the bottom; on desktop it is centred.
    const phone = window.matchMedia('(max-width: 1023.98px)').matches;
    swipe.current = phone && sheet && touch && sheet.scrollTop <= 0 ? { start: touch.clientY, dy: 0 } : null;
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    const touch = event.touches[0];
    if (!swipe.current || !sheet || !touch) return;
    swipe.current.dy = Math.max(0, touch.clientY - swipe.current.start);
    sheet.style.transform = swipe.current.dy > 0 ? `translateY(${swipe.current.dy}px)` : '';
  };

  const onTouchEnd = () => {
    const pulled = swipe.current?.dy ?? 0;
    swipe.current = null;
    if (pulled > SWIPE_CLOSE_PX) {
      onClose();
      return;
    }
    if (sheetRef.current) sheetRef.current.style.transform = '';
  };

  return (
    <div className="pz ayuda-pz capa">
      <div className="velo-a" aria-hidden="true" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-now-title"
        aria-describedby="help-now-body"
        className="hoja-a"
        onKeyDown={trapFocus}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="asa" aria-hidden="true" />
        <div className="fila-t">
          <h2 id="help-now-title" className="t">
            {t.titleLead}
            <em>{t.titleEmphasis}</em>
            {t.titleTail}
          </h2>
          <button ref={closeRef} type="button" className="cerrar-x" aria-label={t.close} onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p id="help-now-body" className="x">
          {t.body}
        </p>

        <CrisisResourceList country={country} tone="paper" />

        <p className="pie-a">
          {name ? `${t.countryLines(name)} ` : ''}
          {t.changeCountry}
        </p>
      </div>
    </div>
  );
}
