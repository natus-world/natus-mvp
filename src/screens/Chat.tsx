import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { Paywall } from '@/components/Paywall';
import { CrisisResourceList } from '@/components/CrisisResourceList';
import { modalityBySlug } from '@/lib/catalog';
import { detectCrisis, isClinicallyVulnerable, riskLevel } from '@/lib/safety';
import { askChat } from '@/ai/chat';
import { AiError } from '@/ai/client';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { currentMatchFor } from '@/store/matches';
import { activeHighSeverityEvent, hadCrisisWithin30Days, markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
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
 * The conversation of PDR section 10.
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

const TYPE_LABEL: Record<NonNullable<StoredMessage['type']>, string> = text.typeLabel;

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
      <Screen backdrop="ojo" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex flex-col justify-center gap-6 px-6 text-center flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {text.empty_noMap}
          </p>
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
      appendAssistantMessage(conversation.id, {
        type: 'crisis',
        message_text: CONTAINMENT_TEXT,
        linked_modality_slugs: [],
      });
      setMessages(listMessages(conversation.id));
      setDraft('');
      if (verdict.severity === 'high') setContainment(event.id);
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

    const user = appendUserMessage(conversation.id, question);
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
      appendAssistantMessage(conversation.id, result.value);
      setMessages(listMessages(conversation.id));
      void fetchQuota('chat').then(setQuota);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'crisis' && err.crisis) {
        const event = recordCrisisEvent(
          { ...err.crisis, layer: 'deterministic', matched: [], excerpt: '' },
          'chat',
        );
        appendAssistantMessage(conversation.id, {
          type: 'crisis',
          message_text: CONTAINMENT_TEXT,
          linked_modality_slugs: [],
        });
        setMessages(listMessages(conversation.id));
        if (err.crisis.severity === 'high') setContainment(event.id);
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

  return (
    <Screen backdrop="ojo" scrim="heavy" opacity={PHOTO.content40}>
      <div className="flex flex-col px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] h-full">
        <div className="mb-3 flex shrink-0 flex-col gap-2">
          <p className="eyebrow">{text.kicker}</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[length:var(--fs-voice-19)] font-light text-blanco">{text.name}</h1>
              <span className="badge shrink-0 px-2 text-crema/70">{text.aiLabel}</span>
            </div>
            {Number.isFinite(remaining) && (
              <span className="shrink-0 text-[length:var(--fs-body-11)] text-crema/70">{text.remaining(remaining)}</span>
            )}
          </div>
          {aboutFriend && (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-2">
              <span className="text-[length:var(--fs-body-11_5)] leading-snug text-crema/75">
                {text.aboutComparison(aboutFriend)}
              </span>
              <button
                type="button"
                className="shrink-0 text-[length:var(--fs-body-11)] text-crema/60 underline-offset-4 hover:text-crema hover:underline"
                onClick={() => setParams({}, { replace: true })}
              >
                {text.aboutComparisonRemove}
              </button>
            </div>
          )}
          {quota && quota.tier === 'free' && quota.newThisMonth > 0 && (
            // Guide 9.9: said once the month has renewed it, never as pressure.
            <p className="text-right text-[length:var(--fs-body-11)] text-crema/60">
              {text.newThisMonth(quota.newThisMonth)}
            </p>
          )}
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {messages.length === 0 && (
            <p className="mt-4 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
              {text.empty}
            </p>
          )}

          <div className="flex flex-col gap-3 py-2">
            {messages.map((message) =>
              message.role === 'user' ? (
                <p
                  key={message.id}
                  className="self-end rounded-[var(--radius-option)] rounded-br-sm bg-verde/70 px-3.5 py-2.5 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema"
                >
                  {message.text}
                </p>
              ) : (
                <article
                  key={message.id}
                  className={[
                    message.type === 'crisis'
                      ? 'bubble-bare border border-error/30'
                      : 'bubble rounded-bl-sm',
                  ].join(' ')}
                >
                  <p className="eyebrow mb-1.5">{TYPE_LABEL[message.type ?? 'reflection']}</p>
                  <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-blanco/85">{message.text}</p>

                  {message.linked_modality_slugs.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {message.linked_modality_slugs.map((slug) => (
                        <Link
                          key={slug}
                          to="/caminos"
                          className="pill text-[length:var(--fs-body-10_5)] text-crema/75 no-underline"
                        >
                          {modalityBySlug(slug)?.name_es ?? slug}
                        </Link>
                      ))}
                    </div>
                  )}

                  {message.type === 'crisis' && (
                    <div className="mt-3">
                      <CrisisResourceList country={profile.draft.country} compact />
                    </div>
                  )}
                </article>
              ),
            )}

            {thinking && (
              <p aria-live="polite" className="text-[length:var(--fs-body-12)] text-crema/55">
                {text.thinking}
              </p>
            )}
          </div>
          <div ref={endRef} />
        </div>

        {error && (
          <div role="alert" className="flex shrink-0 items-center gap-3 pt-2">
            <p className="flex-1 text-[length:var(--fs-body-11_5)] leading-relaxed text-error">{error}</p>
            {error === copy.chrome.aiError.message && (
              <button type="button" onClick={() => void send()} className="chip shrink-0 text-crema/75">
                {copy.chrome.aiError.retry}
              </button>
            )}
          </div>
        )}

        <div className="shrink-0 pt-3">
          {containment ? (
            <div className="rounded-[var(--radius-option)] border border-error/30 px-4 py-3.5">
              <p className="mb-2.5 text-[length:var(--fs-body-12)] leading-relaxed text-crema/75">
                {text.containmentNote}
              </p>
              <button
                type="button"
                onClick={() => {
                  markFalsePositive(containment);
                  setContainment(null);
                }}
                className="text-[length:var(--fs-body-11)] text-crema/55 underline underline-offset-4 hover:text-crema/70"
              >
                {text.notMyCase}
              </button>
            </div>
          ) : showPaywall ? (
            <Paywall feature="chat" onDismiss={() => setShowPaywall(false)} />
          ) : null}

          {!containment && (
            <div className="mt-2.5 flex items-end gap-2">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={text.placeholder}
                aria-label={text.messageLabel}
                className="field max-h-28 min-h-[52px] flex-1 resize-none px-3.5 text-[length:var(--fs-body-12_5)] placeholder:text-crema/55"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={draft.trim() === '' || thinking}
                aria-label={text.send}
                className="circle-chip flex size-11 shrink-0 items-center justify-center text-crema disabled:opacity-40"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}
