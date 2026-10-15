import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { copy } from '@/i18n';
import { Constellation } from '@/components/Constellation';
import { ModalityCard } from '@/components/ModalityCard';
import { modalityBySlug } from '@/lib/catalog';
import { filterModalities, poolFraming, type PoolFraming } from '@/lib/matching';
import { isClinicallyVulnerable } from '@/lib/safety';
import { matchModalities } from '@/ai/match';
import { AiError } from '@/ai/client';
import { isDemoMode } from '@/supabase/client';
import { currentSynthesis } from '@/store/soulMap';
import { activeProfile } from '@/store/account';
import { hadCrisisWithin30Days } from '@/store/crisis';
import {
  clearReaction,
  currentMatch,
  currentMatchFor,
  recentlyDismissedSlugs,
  saveMatch,
  setReaction,
  type StoredMatch,
  type UserReaction,
} from '@/store/matches';

/**
 * PDR 7, the recommendation surface.
 *
 * The hard filter runs here, in the client, deterministically — the model
 * only ever orders and explains what the filter already allowed. That
 * division is what makes the clinical exclusions trustworthy: they are not a
 * prompt instruction the model might overlook on a bad day.
 */
const text = copy.recommendations;

export function Recommendations() {
  // Only a match computed from the *current* synthesis counts as present.
  // Redoing onboarding used to land here on the previous recommendations,
  // which is the kind of staleness nobody notices until it is embarrassing.
  const [match, setMatch] = useState<StoredMatch | undefined>(() => {
    const stored = currentSynthesis();
    const found = stored ? currentMatchFor(stored.id) : undefined;
    return found && !excludedNow(found) ? found : undefined;
  });
  const [loading, setLoading] = useState(!match);
  const [framing, setFraming] = useState<PoolFraming>('ordered');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const stored = currentSynthesis();
    // Not `getSession`: after signup the anonymous record is claimed and stops
    // answering reads, which would empty the pool for anyone with an account.
    const profile = activeProfile();
    if (!stored || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const outcome = filterModalities({
      openness: profile.draft.openness_to_modalities,
      inferredTopics: stored.synthesis.inferred_topics,
      clinicallyVulnerable: isClinicallyVulnerable({
        clinicalBasics: profile.draft.clinical_basics,
        recentCrisisWithin30Days: hadCrisisWithin30Days(),
      }),
      dismissedSlugs: recentlyDismissedSlugs(),
    });

    setFraming(poolFraming(outcome));

    // PDR 7.2: never truncate in silence. The person is told, not just the log.
    setNotice(
      outcome.droppedForSize > 0
        ? text.truncated(outcome.poolBeforeTruncation, outcome.candidates.length)
        : null,
    );

    let result;
    try {
      result = await matchModalities({
        synthesis: stored.synthesis,
        outcome,
        presentingNeedText: profile.draft.presenting_need_text,
      });
    } catch (err) {
      setError(
        err instanceof AiError && err.kind === 'spend_limit'
          ? text.spendLimit
          : err instanceof AiError && err.kind === 'crisis'
            ? text.crisis
            : copy.chrome.aiError.message,
      );
      setLoading(false);
      return;
    }

    setMatch(
      saveMatch({
        result: result.value,
        strategy: outcome.strategy,
        usedFallback: result.usedFallback,
        synthesisId: stored.id,
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!match && error === null) void run();
  }, [match, error, run]);

  const react = (slug: string, reaction: UserReaction) => {
    const existing = match?.reactions[slug]?.reaction;
    if (existing === reaction) clearReaction(slug);
    else setReaction(slug, reaction);
    setMatch(currentMatch());
  };

  if (!currentSynthesis()) {
    return (
      <Screen backdrop="canon" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {text.empty}
          </p>
          <Link to="/onboarding" className="cta no-underline">
            {text.start}
          </Link>
        </div>
      </Screen>
    );
  }

  if (error && !loading) {
    return (
      <Screen backdrop="canon" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p role="alert" className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/75">
            {error}
          </p>
          <button type="button" className="cta" onClick={() => void run()}>
            {copy.chrome.aiError.retry}
          </button>
        </div>
      </Screen>
    );
  }

  if (loading || !match) {
    return (
      <Screen backdrop="canon" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center sm:min-h-0 sm:flex-1">
          <Ouroboros size={88} />
          <p role="status" className="font-serif text-[length:var(--fs-voice-19)] font-light text-blanco">{text.loading}</p>
        </div>
      </Screen>
    );
  }

  const cards = match.result.matched_modalities
    .map((entry) => ({ entry, modality: modalityBySlug(entry.modality_slug) }))
    .filter((c): c is { entry: (typeof match.result.matched_modalities)[number]; modality: NonNullable<ReturnType<typeof modalityBySlug>> } =>
      Boolean(c.modality),
    );

  return (
    <Screen backdrop="canon" scrim="heavy" opacity={PHOTO.content40}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3 text-center">{text.kicker}</p>

        <Constellation modalities={cards.map((c) => c.modality)} />

        <h1 className="mt-2 mb-2 text-center text-[length:var(--fs-title-27)] leading-[var(--lh-heading-1_15)] text-blanco">
          {text.titleCount(cards.length)}
          {text.titleMiddle}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
          {text.titleTail}
        </h1>
        <p className="mx-auto mb-6 max-w-[280px] text-center text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
          {text.subtitle}
        </p>

        {text.framing[framing] && (
          <p className="mb-4 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-2.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {text.framing[framing]}
          </p>
        )}

        {notice && (
          <p className="mb-4 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-2.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {notice}
          </p>
        )}

        {match.used_fallback && (
          <p className="mb-4 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-2.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {text.usedFallback}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {cards.map(({ entry, modality }) => (
            <ModalityCard
              key={entry.modality_slug}
              modality={modality}
              rank={entry.rank}
              reasoning={entry.reasoning}
              cautionNote={entry.caution_note}
              reaction={match.reactions[entry.modality_slug]?.reaction}
              onReact={(reaction) => react(entry.modality_slug, reaction)}
            />
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link to="/recorrido" className="cta no-underline">
            {text.toRoutine}
            <span aria-hidden="true">→</span>
          </Link>

          <button
            type="button"
            onClick={() => void run()}
            className="chip chip-p10 text-crema/60"
          >
            {text.searchAgain}
          </button>

          {isDemoMode && (
            <p className="px-1 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
              {match.result.prompt_version} · {copy.demo.pool} {match.strategy}
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}

function excludedNow(match: StoredMatch): boolean {
  const vulnerable = isClinicallyVulnerable({
    clinicalBasics: activeProfile()?.draft.clinical_basics ?? {},
    recentCrisisWithin30Days: hadCrisisWithin30Days(),
  });
  return (
    vulnerable &&
    match.result.matched_modalities.some((m) => modalityBySlug(m.modality_slug)?.requires_clinical_support)
  );
}
