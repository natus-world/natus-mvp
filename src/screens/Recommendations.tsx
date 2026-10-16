import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { ArrowIcon } from '@/design/icons';
import { copy } from '@/i18n';
import { ModalityCard } from '@/components/ModalityCard';
import { PATHS } from '@/components/routes';
import { modalityBySlug } from '@/lib/catalog';
import { filterModalities, poolFraming, type PoolFraming } from '@/lib/matching';
import { isClinicallyVulnerable } from '@/lib/safety';
import { matchModalities } from '@/ai/match';
import { chartPlacements } from '@/astrology/natal-chart';
import { AiError } from '@/ai/client';
import { isDemoMode } from '@/supabase/client';
import { currentSynthesis } from '@/store/soulMap';
import { activeProfile } from '@/store/account';
import { hadCrisisWithin30Days } from '@/store/crisis';
import { track } from '@/store/funnel';
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
        // v1.2 R-02: what the full why may cite.
        symbols: { numerology: stored.numerology, chart: chartPlacements(profile.draft) },
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

  // The funnel: Caminos was seen, once there is something on it.
  const hasMatch = Boolean(match);
  useEffect(() => {
    if (hasMatch) track('paths_seen');
  }, [hasMatch]);

  const react = (slug: string, reaction: UserReaction) => {
    const existing = match?.reactions[slug]?.reaction;
    if (existing === reaction) clearReaction(slug);
    else setReaction(slug, reaction);
    setMatch(currentMatch());
    if (reaction === 'dismissed' && openSlug === slug) setOpenSlug(null);
  };

  // Package 06: a carousel with snap. The dots follow at once; which cards
  // are whole follows when the scroll settles.
  const desktop = useDesktop();
  const carr = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(0);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);

  const cardStarts = () => {
    const el = carr.current;
    if (!el) return { el, starts: [] as number[] };
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const starts = Array.from(el.querySelectorAll<HTMLElement>(':scope > [data-cam]'), (c) => c.offsetLeft - pad);
    return { el, starts };
  };

  // A faint card touched is brought in whole, even where the row cannot
  // scroll it to the start (the last ones, on desktop); a hand on the row
  // lets go of it.
  const pinned = useRef<number | null>(null);
  const release = () => {
    pinned.current = null;
  };

  const place = (n: number) => {
    const p = pinned.current;
    const whole = p === null ? n : desktop ? Math.max(n, p - 2) : Math.max(n, p);
    setIdx(whole);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => setSettled(whole), 140);
  };

  const nearest = () => {
    const { el, starts } = cardStarts();
    if (!el || starts.length === 0) return 0;
    let n = 0;
    starts.forEach((x, i) => {
      if (Math.abs(x - el.scrollLeft) < Math.abs((starts[n] ?? 0) - el.scrollLeft)) n = i;
    });
    return n;
  };

  const follow = () => place(nearest());

  const goTo = (i: number) => {
    const { el, starts } = cardStarts();
    if (!el || starts[i] === undefined) return;
    pinned.current = i;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: starts[i], behavior: still ? 'auto' : 'smooth' });
    place(nearest());
  };

  // v1.2 R-02: touching a card opens its full why in place. On desktop the
  // first one starts open and wide, as the package shows it.
  const [chosenOpen, setOpenSlug] = useState<string | null | undefined>(undefined);
  const firstKept = match?.result.matched_modalities.find(
    (m) => match.reactions[m.modality_slug]?.reaction !== 'dismissed',
  )?.modality_slug;
  const openSlug = chosenOpen === undefined ? (desktop ? (firstKept ?? null) : null) : chosenOpen;

  const shell = (children: ReactNode) => (
    <Screen photo="rocaBlanca" veil={0.62} glassAlpha={0.8}>
      <div className="pz caminos">{children}</div>
    </Screen>
  );

  if (!currentSynthesis()) {
    return shell(
      <div className="estado">
        <p className="cuerpo">{text.empty}</p>
        <Link to="/onboarding" className="p1">
          {text.start}
        </Link>
      </div>,
    );
  }

  if (error && !loading) {
    return shell(
      <div className="estado">
        <p role="alert" className="cuerpo">
          {error}
        </p>
        <button type="button" className="p1" onClick={() => void run()}>
          {copy.chrome.aiError.retry}
        </button>
      </div>,
    );
  }

  // The serpent in place of the carousel, only past 0.3 s (guide §7).
  if (loading || !match) {
    return shell(
      <div className="estado">
        <Ouroboros size={88} />
        <p role="status" className="cuerpo">
          {text.loading}
        </p>
      </div>,
    );
  }

  const cards = match.result.matched_modalities
    .map((entry) => ({ entry, modality: modalityBySlug(entry.modality_slug) }))
    .filter((c): c is { entry: (typeof match.result.matched_modalities)[number]; modality: NonNullable<ReturnType<typeof modalityBySlug>> } =>
      Boolean(c.modality),
    );

  // v1.2 R-05 (owner, 16 Oct 2026): a therapy the person took off leaves the
  // count too; «Deshacer» brings it back everywhere. Should every one be
  // taken off, the count stays on what was proposed rather than claim one
  // that is not there.
  const kept = cards.filter((c) => match.reactions[c.entry.modality_slug]?.reaction !== 'dismissed');
  const shown = kept.length > 0 ? kept : cards;

  // The card in view is whole; the next one peeks, faint and summarised. On
  // desktop three are whole from the one in view.
  const faintFrom = (i: number) => (desktop ? i < settled || i > settled + 2 : i !== settled);

  return shell(
    <>
      <div className="scroll">
        <div className="col1">
          <p className="k">{text.kicker}</p>
          <h1 className="t">
            {text.titleCount(shown.length)}
            {text.titleMiddle}
            <em>{text.titleEmphasis}</em>
            {text.titleTail}
          </h1>
          <p className="sub">{text.subtitle}</p>
        </div>

        <div className="fila-cam">
          <div className="carr" ref={carr} onScroll={follow} onWheel={release} onTouchStart={release} onPointerDown={release}>
            {cards.map(({ entry, modality }, i) => (
              <ModalityCard
                key={entry.modality_slug}
                modality={modality}
                position={i + 1}
                total={cards.length}
                summary={entry.summary ?? null}
                reasoning={entry.reasoning}
                cautionNote={entry.caution_note}
                reaction={match.reactions[entry.modality_slug]?.reaction}
                onReact={(reaction) => react(entry.modality_slug, reaction)}
                open={openSlug === entry.modality_slug}
                onToggle={() => setOpenSlug(openSlug === entry.modality_slug ? null : entry.modality_slug)}
                faint={faintFrom(i)}
                onGo={() => goTo(i)}
              />
            ))}
          </div>

          {/* What the screen said before the package and still has to say:
              PDR 7.2 never truncates in silence. */}
          <div className="avisos">
            {text.framing[framing] && <p>{text.framing[framing]}</p>}
            {notice && <p>{notice}</p>}
            {match.used_fallback && <p>{text.usedFallback}</p>}
            <button type="button" className="txtbtn" onClick={() => void run()}>
              {text.searchAgain}
            </button>
            {isDemoMode && (
              <p className="demo">
                {match.result.prompt_version} · {copy.demo.pool} {match.strategy}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="fijo">
        <div className="puntos" aria-hidden="true">
          {cards.map((c, i) => (
            <i key={c.entry.modality_slug} className={i === idx ? 'on' : undefined} />
          ))}
        </div>
        <span className="esp-pie" />
        <Link to={PATHS.journey} className="p1">
          {text.toRoutine}
          <ArrowIcon />
        </Link>
      </div>
    </>,
  );
}

/** True from the desktop width on, where the cards lie in a row. */
function useDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setDesktop(list.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, []);
  return desktop;
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
