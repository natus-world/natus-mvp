import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { SuggestIcon } from '@/design/brand-icons';
import { CrisisBanner } from '@/components/CrisisBanner';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { detectCrisis } from '@/lib/safety';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { activeProfile } from '@/store/account';
import {
  hasUnreadFromTeam,
  loadFeedback,
  markTeamRead,
  screenOf,
  sendFeedback,
  type FeedbackMessage,
} from '@/store/feedback';
import { copy } from '@/i18n';

const t = copy.suggestions;

/**
 * Suggestions during the beta (owner, 18 Oct 2026): a small conversation with
 * the team, in the header of every screen, beside «Necesito ayuda». What the
 * person writes is scanned for crisis before it is sent, as the journal is,
 * and kept either way, marked; a high signal opens the crisis screen.
 */
export function SuggestionsButton({ onOpen, unread }: { onOpen: () => void; unread: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={unread ? `${t.button}. ${t.unread}` : t.button}
      className="suggest-button"
      data-unread={unread ? '' : undefined}
    >
      <SuggestIcon size={18} />
    </button>
  );
}

/** Whether the team answered something not yet seen; checked on each screen. */
export function useTeamUnread(pathname: string): [boolean, () => void] {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    let live = true;
    void hasUnreadFromTeam().then((u) => live && setUnread(u));
    return () => {
      live = false;
    };
  }, [pathname]);
  return [unread, () => setUnread(false)];
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export function SuggestionsSheet({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const country = activeProfile()?.draft.country;
  const [messages, setMessages] = useState<FeedbackMessage[] | null>(null);
  const [failed, setFailed] = useState<'load' | 'send' | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [thanked, setThanked] = useState(false);
  const [lowSignal, setLowSignal] = useState(false);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    loadFeedback()
      .then((list) => {
        if (!live) return;
        setMessages(list);
        void markTeamRead();
      })
      .catch(() => live && setFailed('load'));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, thanked]);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fieldRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (before?.isConnected) before.focus();
    };
  }, [onClose]);

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

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    const verdict = detectCrisis({ texts: [body] });
    setSending(true);
    setFailed(null);
    try {
      const sent = await sendFeedback({ body, screen: screenOf(pathname), crisisFlagged: verdict.crisis });
      setMessages((list) => [...(list ?? []), sent]);
      setText('');
      setThanked(true);
    } catch {
      setFailed('send');
      setSending(false);
      return;
    }
    setSending(false);
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'feedback');
      if (verdict.severity === 'high') setCrisisEventId(event.id);
      else setLowSignal(true);
    }
  }, [text, sending, pathname]);

  if (crisisEventId) {
    return (
      <div className="pz sugerencias capa crisis">
        <CrisisScreen
          country={country}
          onNotMyCase={() => {
            markFalsePositive(crisisEventId);
            setCrisisEventId(null);
          }}
          onBack={() => setCrisisEventId(null)}
        />
      </div>
    );
  }

  return (
    <div className="pz sugerencias capa">
      <div className="velo-s" aria-hidden="true" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sugerencias-titulo"
        className="hoja-s"
        onKeyDown={trapFocus}
      >
        <div className="agarre-s" aria-hidden="true" />
        <div className="cabeza">
          <div>
            <p className="k">{t.kicker}</p>
            <h2 id="sugerencias-titulo" className="t">
              {t.titleLead}
              <em>{t.titleEmphasis}</em>
              {t.titleTail}
            </h2>
          </div>
          <button type="button" className="cerrar-s" aria-label={t.close} onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="hilo" aria-live="polite">
          <p className="intro">{t.intro}</p>
          {failed === 'load' && <p className="error">{t.unavailable}</p>}
          {messages?.map((m) =>
            m.author === 'team' ? (
              <div key={m.id} className="del-equipo">
                <p className="quien">{t.team}</p>
                <p className="texto">{m.body}</p>
              </div>
            ) : (
              <p key={m.id} className="mio">
                {m.body}
              </p>
            ),
          )}
          {thanked && <p className="gracias">{t.thanks}</p>}
          {lowSignal && (
            <div className="aviso-s">
              <CrisisBanner country={country} />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {failed === 'send' && <p className="error">{t.failed}</p>}
        <div className="linea-s">
          <textarea
            ref={fieldRef}
            rows={1}
            value={text}
            maxLength={4000}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            onChange={(e) => {
              setText(e.target.value);
              setThanked(false);
            }}
          />
          <button
            type="button"
            className="env-s"
            aria-label={t.send}
            disabled={!text.trim() || sending}
            onClick={() => void send()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
