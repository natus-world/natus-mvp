import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '@/i18n';
import { ChatTabIcon } from '@/design/brand-icons';
import { ArrowIcon } from '@/design/icons';
import { PATHS } from '@/components/routes';
import { detectCrisis, riskLevel } from '@/lib/safety';
import { chartPlacements, hasBirthTime } from '@/astrology/natal-chart';
import { askChat } from '@/ai/chat';
import { AiError } from '@/ai/client';
import { activeProfile } from '@/store/account';
import type { StoredSynthesis } from '@/store/soulMap';
import { hadCrisisWithin30Days, markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import {
  appendAssistantMessage,
  appendUserMessage,
  chartConversationFor,
  dropMessage,
  listMessages,
  remainingQuestions,
  type StoredMessage,
} from '@/store/chat';
import { ChatPaywall, HelpLines, SendIcon, TYPE_LABEL, crisisAnswer } from '@/screens/Chat';

const text = copy.chartChat;
const chat = copy.chat;

/**
 * A planet's sign in Spanish, for the questions made from the chart. Without
 * the hour the Moon's sign is not named: on the day it changes sign, the noon
 * that stands in for the hour can get it wrong, and nothing is guessed (owner,
 * 22 Oct 2026).
 */
function signOf(planet: 'Moon' | 'Mars'): string | null {
  const draft = activeProfile()?.draft;
  if (!draft || (planet === 'Moon' && !hasBirthTime(draft))) return null;
  const placement = chartPlacements(draft)?.find((p) => p.name === planet);
  return placement ? (chat.signs[placement.sign] ?? null) : null;
}

/**
 * «Pregúntale a tu carta» (owner, 22 Oct 2026; mockup option B): a pill on
 * Carta, fixed over the tab bar on the right, that turns into a circle once
 * the person scrolls down. It opens a sheet (a side panel on desktop) with a
 * conversation about the chart only — kept apart from the Chat's, read by the
 * memory like any other, and counted against the same quota.
 *
 * The order of the Chat holds here too: safety first, then the quota, then
 * the model. A high signal hands over to Carta's crisis screen; a low one
 * answers with the help lines in the sheet. Neither is charged.
 */
export function ChartChat({ stored, onCrisis }: { stored: StoredSynthesis; onCrisis: (id: string) => void }) {
  const profile = activeProfile();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const conversation = chartConversationFor(stored.id);
  const [messages, setMessages] = useState<StoredMessage[]>(() => listMessages(conversation.id));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [lowSignal, setLowSignal] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  // The pill says what it is at the top of Carta, and keeps out of the way
  // once the person reads further down.
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLElement && el.closest('.carta')) setCompact(el.scrollTop > 24);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchQuota('chat').then(setQuota);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages.length, thinking]);

  if (!profile) return null;

  const close = () => {
    setOpen(false);
    setShowPaywall(false);
    bubbleRef.current?.focus();
  };

  const remaining = quota ? (quota.remaining ?? Number.POSITIVE_INFINITY) : remainingQuestions();
  const last = messages[messages.length - 1];
  const lastCrisisId = [...messages].reverse().find((m) => m.type === 'crisis')?.id;
  const showCount = Number.isFinite(remaining) && last?.type !== 'crisis';

  const send = async (asked?: string) => {
    const question = (asked ?? draft).trim();
    if (question === '' || thinking) return;

    // Safety first, and before the quota — PDR 1.6, as in the Chat.
    const verdict = detectCrisis({ texts: [question] });
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'chat');
      appendUserMessage(conversation.id, question);
      appendAssistantMessage(conversation.id, crisisAnswer(verdict.severity === 'high' ? 'high' : 'low'));
      setMessages(listMessages(conversation.id));
      setDraft('');
      if (verdict.severity === 'high') onCrisis(event.id);
      else setLowSignal(event.id);
      return;
    }

    const left = quota ? (quota.remaining ?? Number.POSITIVE_INFINITY) : remainingQuestions();
    if (left <= 0) {
      // What the person typed stays in the line.
      if (asked) setDraft(question);
      setShowPaywall(true);
      return;
    }

    const user = appendUserMessage(conversation.id, question);
    setMessages(listMessages(conversation.id));
    setDraft('');
    setThinking(true);
    setError(null);

    try {
      const result = await askChat({
        question,
        synthesis: stored.synthesis,
        numerology: stored.numerology,
        // PDR 10.2: a derived level, never the clinical answers themselves.
        risk: riskLevel({
          clinicalBasics: profile.draft.clinical_basics,
          recentCrisisWithin30Days: hadCrisisWithin30Days(),
        }),
        recommendedSlugs: [],
        country: profile.draft.country,
        focus: 'carta',
        history: listMessages(conversation.id)
          .filter((m) => m.id !== user.id)
          .map((m) => ({ role: m.role, text: m.text })),
      });
      appendAssistantMessage(conversation.id, { ...result.value, linked_modality_slugs: [] });
      setMessages(listMessages(conversation.id));
      void fetchQuota('chat').then(setQuota);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'crisis' && err.crisis) {
        const event = recordCrisisEvent({ ...err.crisis, layer: 'deterministic', matched: [], excerpt: '' }, 'chat');
        appendAssistantMessage(conversation.id, crisisAnswer(err.crisis.severity === 'high' ? 'high' : 'low'));
        setMessages(listMessages(conversation.id));
        if (err.crisis.severity === 'high') onCrisis(event.id);
        else setLowSignal(event.id);
        return;
      }

      // A failed turn costs nothing: the half-exchange goes and the text comes back.
      dropMessage(user.id);
      setMessages(listMessages(conversation.id));
      setDraft(question);

      if (err instanceof AiError && err.kind === 'quota') {
        void fetchQuota('chat').then(setQuota);
        setShowPaywall(true);
        return;
      }
      if (err instanceof AiError && err.kind === 'plan_cap') {
        setError(copy.quota.cap(renewalDate(err.renewsOn ?? '')));
        return;
      }
      setError(err instanceof AiError && err.kind === 'spend_limit' ? chat.spendLimit : copy.chrome.aiError.message);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="pz carta-chat">
      {!open && (
        <button
          ref={bubbleRef}
          type="button"
          className="burbuja"
          data-compact={compact ? 'true' : 'false'}
          aria-label={text.bubble}
          onClick={() => setOpen(true)}
        >
          <ChatTabIcon />
          <span className="rotulo">{text.bubble}</span>
        </button>
      )}

      {open && (
        <>
          <div className="velo-c" aria-hidden="true" onClick={close} />
          <section className="hoja-c" role="dialog" aria-modal="true" aria-label={text.bubble}>
            <div className="asa" aria-hidden="true" />
            <div className="cab">
              <span className="quien">
                {chat.name} <span className="ia">{chat.aiLabel}</span>
              </span>
              <button ref={closeRef} type="button" className="cerrar" aria-label={text.close} onClick={close}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="hilo">
              {messages.length === 0 && (
                <>
                  <p className="saludo">
                    {text.greetingLead}
                    <em>{text.greetingEmphasis}</em>
                  </p>
                  <p className="sub">{text.sub}</p>
                  <p className="k">{text.startLabel}</p>
                  <div className="qs">
                    {text.questions(signOf('Moon'), signOf('Mars')).map((q) => (
                      <button key={q} type="button" className="q" onClick={() => void send(q)}>
                        <span>{q}</span>
                        <span className="chev" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="m10 7.5 4.5 4.5-4.5 4.5" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((message) =>
                message.role === 'user' ? (
                  <p key={message.id} className="yo">
                    {message.text}
                  </p>
                ) : message.type === 'crisis' ? (
                  <div key={message.id} className="chat">
                    <div className="contencion">
                      <p>{message.text}</p>
                      <HelpLines country={profile.draft.country} />
                      {message.id === lastCrisisId && lowSignal && (
                        <button
                          type="button"
                          className="no-aplica"
                          onClick={() => {
                            markFalsePositive(lowSignal);
                            setLowSignal(null);
                          }}
                        >
                          {chat.notMyCase}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <article key={message.id} className="verso">
                    <span className="et">{TYPE_LABEL[message.type ?? 'reflection']}</span>
                    <p>{message.text}</p>
                    {message.type === 'off_chart' && (
                      <Link to={PATHS.chat} className="al-chat">
                        {text.toChat}
                        <ArrowIcon />
                      </Link>
                    )}
                  </article>
                ),
              )}

              {thinking && (
                <div className="escribiendo" role="status">
                  <span className="sr-only">{chat.thinking}</span>
                  <i />
                  <i />
                  <i />
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="abajo">
              {showCount && <p className="cupo">{chat.remaining(remaining)}</p>}
              {error && (
                <div role="alert" className="aviso">
                  <p>{error}</p>
                </div>
              )}
              <div className="linea">
                <textarea
                  id="pregunta-carta"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={text.placeholder}
                  aria-label={text.placeholder}
                />
                <button
                  type="button"
                  className="env"
                  onClick={() => void send()}
                  disabled={draft.trim() === '' || thinking}
                  aria-label={chat.send}
                >
                  <SendIcon />
                </button>
              </div>
            </div>

            {showPaywall && (
              <div className="chat">
                <ChatPaywall quota={quota} onDismiss={() => setShowPaywall(false)} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
