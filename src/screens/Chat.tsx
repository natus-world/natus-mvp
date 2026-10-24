import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { PayPalSubscribe } from '@/components/PayPalSubscribe';
import { modalityBySlug } from '@/lib/catalog';
import { resourcesForCountry, telHref } from '@/lib/crisis-resources';
import { linesCountry } from '@/components/help-country';
import { detectCrisis, isClinicallyVulnerable, riskLevel } from '@/lib/safety';
import { chartPlacements } from '@/astrology/natal-chart';
import { askChat } from '@/ai/chat';
import { AiError } from '@/ai/client';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { currentMatchFor } from '@/store/matches';
import { activeHighSeverityEvent, hadCrisisWithin30Days, markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import { track } from '@/store/funnel';
import { listFriends } from '@/store/friends';
import {
  appendAssistantMessage,
  appendUserMessage,
  conversationFor,
  dropMessage,
  listMessages,
  remainingQuestions,
  type StoredMessage,
} from '@/store/chat';

/**
 * The conversation of PDR section 10, drawn as package 10 (16 Oct 2026):
 * Davraz's answer as a verse, and on the phone a focus mode — «Salir» in the
 * header, no tab bar — once there is a conversation or the line is touched.
 *
 * Layer 1 runs on every message before it reaches the model — not as a filter
 * on the way back, which would mean the crisis text had already been generated
 * by then. A high-severity signal puts the screen into containment: the thread
 * stays, the composer goes, and no interpretation of any kind is offered. PDR
 * 1.6 is explicit that this moment has no commercial fallback, which is why
 * the paywall check runs after the safety check and not before it.
 *
 * The remaining count is always on screen. A counter that only appears when it
 * runs out is a trap, and this product's whole claim is that it is not one.
 */

const text = copy.chat;

const CONTAINMENT_TEXT = text.containmentMessage;

export const TYPE_LABEL: Record<NonNullable<StoredMessage['type']>, string> = text.typeLabel;

/** What a crisis turn answers: containment for a high signal, the package's
 *  softer reply for a low one. Neither is charged. */
export function crisisAnswer(severity: 'high' | 'low') {
  return {
    type: 'crisis' as const,
    message_text: severity === 'high' ? CONTAINMENT_TEXT : text.crisisReply,
    linked_modality_slugs: [],
  };
}

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function SendIcon() {
  return (
    <svg {...svg} strokeWidth={1.6}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg {...svg} strokeWidth={1.2}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...svg} strokeWidth={1.4}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

/** The Moon's sign in Spanish, for the example that comes from the chart. */
function moonSign(draft: Parameters<typeof chartPlacements>[0]): string | null {
  const moon = chartPlacements(draft)?.find((p) => p.name === 'Moon');
  return moon ? (text.signs[moon.sign] ?? null) : null;
}

/**
 * The lines to call, under a crisis turn: the person's country, then the
 * international directory, then the notice when a number is unverified.
 */
export function HelpLines({ country }: { country: string | undefined }) {
  const set = resourcesForCountry(linesCountry(country));
  return (
    <div className="lineas" role="region" aria-label={text.crisisLines}>
      <p className="lt">{text.crisisLines}</p>
      {set.resources.map((r) => (
        <div key={`${r.country}-${r.name}`} className="linea-a">
          <div className="tx">
            <p className="nm">{r.name}</p>
            {r.note && <p className="ds">{r.note}</p>}
          </div>
          <a href={telHref(r.contact)} className="llamar" aria-label={text.call(r.name, r.contact)}>
            <PhoneIcon />
            {r.contact}
          </a>
        </div>
      ))}
      {/* PDR 6.4: never leave the list empty, and always offer a way out of
          the five MVP countries. */}
      <a href={set.fallback.url} target="_blank" rel="noreferrer noopener" className="linea-a">
        <div className="tx">
          <p className="nm">{set.fallback.name}</p>
          <p className="ds">{set.fallback.note}</p>
        </div>
        <span className="ir" aria-hidden="true">
          ↗
        </span>
      </a>
      {set.unverified && (
        <p className="sin-verificar">
          {copy.crisisResources.unverifiedLead}
          {copy.crisisResources.unverifiedSite}
          {copy.crisisResources.unverifiedTail}
        </p>
      )}
    </div>
  );
}

/**
 * «Seguir conversando», the sheet over the chat when the questions run out.
 *
 * It never appears over a crisis turn — the caller checks safety first. After
 * a crisis alert the server holds the offer back for seven days (decided 15
 * Oct 2026): what is used up is still said, Premium is not. Unknown until the
 * server answers, so the offer never flashes. What the person typed stays in
 * the line behind it.
 */
export function ChatPaywall({ quota, onDismiss }: { quota: Quota | null; onDismiss: () => void }) {
  const pw = text.paywall;
  const [offer, setOffer] = useState<boolean | null>(null);
  const [trying, setTrying] = useState(false);
  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (live) setOffer(q ? q.offerPremium : true);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (offer) track('paywall_seen', 'chat');
  }, [offer]);

  if (offer === null) return null;
  const next = quota && quota.tier === 'free' && quota.renewsOn ? pw.next(renewalDate(quota.renewsOn)) : null;

  return (
    <>
      <div className="velo-p" aria-hidden="true" />
      <div className="hoja-p" role="dialog" aria-label={offer ? `${pw.titleLead}${pw.titleEmphasis}` : copy.paywall.label}>
        {offer ? (
          <>
            <p className="t">
              {pw.titleLead}
              <em>{pw.titleEmphasis}</em>
            </p>
            <p className="x">{pw.body}</p>
            <div className="precio">
              <b>{pw.price}</b>
              <span>
                {pw.period}
                <br />
                {pw.cancel}
              </span>
            </div>
            <div className="bts">
              {trying ? (
                <div className="pago">
                  <PayPalSubscribe place="chat" />
                </div>
              ) : (
                <button type="button" className="bt-c" onClick={() => setTrying(true)}>
                  {pw.trial}
                </button>
              )}
              <button type="button" className="bt-o" onClick={onDismiss}>
                {pw.notNow}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="t">{copy.paywall.title.chat}</p>
            <p className="x">{copy.paywall.body.chat}</p>
            <div className="bts">
              <button type="button" className="bt-o" onClick={onDismiss}>
                {copy.paywall.back}
              </button>
            </div>
          </>
        )}
        {next && <p className="prox">{next}</p>}
      </div>
    </>
  );
}

export function Chat() {
  const synthesis = currentSynthesis();
  const profile = activeProfile();
  const conversation = synthesis ? conversationFor(synthesis.id) : null;

  const [messages, setMessages] = useState<StoredMessage[]>(() =>
    conversation ? listMessages(conversation.id) : [],
  );
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [containment, setContainment] = useState<string | null>(
    () => activeHighSeverityEvent()?.id ?? null,
  );
  // A low signal this session, so its turn can carry «Esto no aplica a mi caso».
  const [lowSignal, setLowSignal] = useState<string | null>(null);
  // Package 10: on the phone, a conversation is read in focus mode — «Salir»
  // in the header and no tab bar. Desktop has no focus mode.
  const [focus, setFocus] = useState(() => messages.length > 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // v1.2 F-01: what the plan has left, as the server counts it. Null in the
  // fixture demo, which counts on its own.
  const [quota, setQuota] = useState<Quota | null>(null);
  // A comparison with a friend to talk over, from its result screen. Shown
  // only once the friendship is confirmed; the server checks it again.
  const [params, setParams] = useSearchParams();
  const aboutId = params.get('comparacion');
  const [aboutFriend, setAboutFriend] = useState<string | null>(null);
  useEffect(() => {
    if (!aboutId) {
      setAboutFriend(null);
      return;
    }
    let live = true;
    void listFriends()
      .then((friends) => {
        if (live) setAboutFriend(friends.find((f) => f.friendshipId === aboutId)?.firstName ?? null);
      })
      .catch(() => {
        if (live) setAboutFriend(null);
      });
    return () => {
      live = false;
    };
  }, [aboutId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, thinking]);

  useEffect(() => {
    void fetchQuota('chat').then(setQuota);
  }, []);

  if (!synthesis || !profile || !conversation) {
    return (
      <Screen photo="marProfundo" veil={0.52} glassAlpha={0.5} tone="6 12 18">
        <div className="pz chat-sin scroll">
          <p className="k">{text.kicker}</p>
          <p className="t">
            {text.titleLead}
            <em>{text.titleEmphasis}</em>
          </p>
          <p className="cuerpo">{text.empty_noMap}</p>
          <Link to="/onboarding" className="cta no-underline">
            {text.start}
          </Link>
        </div>
      </Screen>
    );
  }

  const remaining = quota ? (quota.remaining ?? Number.POSITIVE_INFINITY) : remainingQuestions();
  const match = currentMatchFor(synthesis.id);
  const vulnerable = isClinicallyVulnerable({
    clinicalBasics: profile.draft.clinical_basics,
    recentCrisisWithin30Days: hadCrisisWithin30Days(),
  });
  const recommendedSlugs = (match?.result.matched_modalities.map((m) => m.modality_slug) ?? []).filter(
    (slug) => !(vulnerable && modalityBySlug(slug)?.requires_clinical_support),
  );

  const send = async () => {
    const question = draft.trim();
    if (question === '' || thinking) return;

    // Safety first, and before the quota. Someone in crisis must not be met by
    // a payment screen — PDR 1.6.
    const verdict = detectCrisis({ texts: [question] });
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'chat');
      appendUserMessage(conversation.id, question);
      appendAssistantMessage(conversation.id, crisisAnswer(verdict.severity === 'high' ? 'high' : 'low'));
      setMessages(listMessages(conversation.id));
      setDraft('');
      if (verdict.severity === 'high') setContainment(event.id);
      else setLowSignal(event.id);
      return;
    }

    // Read the quota now rather than trusting the value this render closed
    // over: a subscription the server activated arrives with the next load,
    // and a stale zero would bounce the person back to the paywall.
    const left = quota ? (quota.remaining ?? Number.POSITIVE_INFINITY) : remainingQuestions();
    if (left <= 0) {
      // The draft is deliberately left where it is.
      setShowPaywall(true);
      return;
    }

    // A turn about a comparison keeps which friendship, for the admin panel.
    const about = aboutFriend ? aboutId : null;
    const user = appendUserMessage(conversation.id, question, Date.now(), about);
    setMessages(listMessages(conversation.id));
    setDraft('');
    setThinking(true);
    setError(null);

    try {
      const result = await askChat({
        question,
        synthesis: synthesis.synthesis,
        numerology: synthesis.numerology,
        // PDR 10.2: a derived level, never the clinical answers themselves.
        risk: riskLevel({
          clinicalBasics: profile.draft.clinical_basics,
          recentCrisisWithin30Days: hadCrisisWithin30Days(),
        }),
        recommendedSlugs,
        country: profile.draft.country,
        comparisonFriendshipId: aboutFriend ? aboutId : null,
        history: listMessages(conversation.id)
          .filter((m) => m.id !== user.id)
          .map((m) => ({ role: m.role, text: m.text })),
      });
      appendAssistantMessage(conversation.id, result.value, Date.now(), about);
      setMessages(listMessages(conversation.id));
      void fetchQuota('chat').then(setQuota);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'crisis' && err.crisis) {
        const event = recordCrisisEvent(
          { ...err.crisis, layer: 'deterministic', matched: [], excerpt: '' },
          'chat',
        );
        appendAssistantMessage(conversation.id, crisisAnswer(err.crisis.severity === 'high' ? 'high' : 'low'));
        setMessages(listMessages(conversation.id));
        if (err.crisis.severity === 'high') setContainment(event.id);
        else setLowSignal(event.id);
        return;
      }

      // A failed turn costs nothing: the half-exchange is removed and the text
      // comes back so retrying is one tap rather than retyping.
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
      setError(
        err instanceof AiError && err.kind === 'spend_limit'
          ? text.spendLimit
          : copy.chrome.aiError.message,
      );
    } finally {
      setThinking(false);
    }
  };

  const empty = messages.length === 0;
  const last = messages[messages.length - 1];
  const lastCrisisId = [...messages].reverse().find((m) => m.type === 'crisis')?.id;
  // A crisis turn is not charged, and the package shows no counter under it.
  const showCount = Number.isFinite(remaining) && !containment && last?.type !== 'crisis';
  const paywallOpen = showPaywall && !containment;
  const pick = (question: string) => {
    setDraft(question);
    setFocus(true);
    inputRef.current?.focus();
  };

  return (
    <Screen photo="marProfundo" veil={0.52} glassAlpha={0.5} tone="6 12 18">
      <div
        className="pz chat"
        data-focus={focus || paywallOpen ? 'true' : 'false'}
        data-empty={empty ? 'true' : 'false'}
      >
        <div className="salir-fila">
          <button
            type="button"
            className="salir"
            onClick={() => {
              setFocus(false);
              inputRef.current?.blur();
            }}
          >
            <BackIcon />
            {text.exit}
          </button>
        </div>

        <div className="scroll">
          <div className="titulo">
            <p className="k">{text.kicker}</p>
            <h1 className="t">
              {text.titleLead}
              <em>{text.titleEmphasis}</em>
            </h1>
            <div className="quien">
              <span className="davraz">
                {text.name} <span className="ia">{text.aiLabel}</span>
              </span>
            </div>
          </div>

          <div className="empuje" aria-hidden="true" />

          {aboutFriend && (
            <div className="sobre">
              <p>{text.aboutComparison(aboutFriend)}</p>
              <button type="button" className="mini" onClick={() => setParams({}, { replace: true })}>
                {text.aboutComparisonRemove}
              </button>
            </div>
          )}

          {empty && (
            <div className="ejemplos">
              <p className="lb">{text.examplesLabel}</p>
              {text.examples(moonSign(profile.draft)).map((example) => (
                <button key={example} type="button" className="ej" onClick={() => pick(example)}>
                  {example}
                </button>
              ))}
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <p key={message.id} className="yo-v">
                {message.text}
              </p>
            ) : message.type === 'crisis' ? (
              <div key={message.id} className="contencion">
                <p>{message.text}</p>
                <HelpLines country={profile.draft.country} />
                {message.id === lastCrisisId && lowSignal && !containment && (
                  <button
                    type="button"
                    className="no-aplica"
                    onClick={() => {
                      markFalsePositive(lowSignal);
                      setLowSignal(null);
                    }}
                  >
                    {text.notMyCase}
                  </button>
                )}
              </div>
            ) : (
              <article key={message.id} className="verso">
                <span className="et">{TYPE_LABEL[message.type ?? 'reflection']}</span>
                <p>{message.text}</p>
                {message.linked_modality_slugs.length > 0 && (
                  <div className="caminos-l">
                    {message.linked_modality_slugs.map((slug) => (
                      <Link key={slug} to="/caminos" className="mini">
                        {modalityBySlug(slug)?.name_es ?? slug}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ),
          )}

          {thinking && (
            <div className="escribiendo" role="status">
              <span className="sr-only">{text.thinking}</span>
              <i />
              <i />
              <i />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="abajo">
          {quota && quota.tier === 'free' && quota.newThisMonth > 0 && (
            // Guide 9.9: said once the month has renewed it, never as pressure.
            <p className="cupo">{text.newThisMonth(quota.newThisMonth)}</p>
          )}
          {showCount && <p className="cupo">{text.remaining(remaining)}</p>}

          {error && (
            <div role="alert" className="aviso">
              <p>{error}</p>
              {error === copy.chrome.aiError.message && (
                <button type="button" onClick={() => void send()} className="mini">
                  {copy.chrome.aiError.retry}
                </button>
              )}
            </div>
          )}

          {containment ? (
            <div className="contenida">
              <p>{text.containmentNote}</p>
              <button
                type="button"
                className="no-aplica"
                onClick={() => {
                  markFalsePositive(containment);
                  setContainment(null);
                }}
              >
                {text.notMyCase}
              </button>
            </div>
          ) : (
            <div className="linea">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setFocus(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={text.placeholder}
                aria-label={text.messageLabel}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={draft.trim() === '' || thinking}
                aria-label={text.send}
                className="env"
              >
                <SendIcon />
              </button>
            </div>
          )}
        </div>

        {paywallOpen && <ChatPaywall quota={quota} onDismiss={() => setShowPaywall(false)} />}
      </div>
    </Screen>
  );
}
