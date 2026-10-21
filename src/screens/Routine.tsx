import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { CheckIcon } from '@/design/icons';
import { FlowerIcon, SeedIcon, SproutPhaseIcon } from '@/design/brand-icons';
import { PATHS } from '@/components/routes';
import { Ouroboros } from '@/design/Ouroboros';
import { copy } from '@/i18n';
import { modalityBySlug } from '@/lib/catalog';
import type { Practice } from '@/lib/schemas';
import { detectCrisis } from '@/lib/safety';
import { generateRoutine } from '@/ai/routine';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile } from '@/store/account';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import {
  checkInToday,
  currentMatchFor,
  isCheckedToday,
  rateCheckIn,
  isDoneOnce,
  toggleCheckIn,
  toggleOnce,
  totalCheckIns,
} from '@/store/matches';
import { routineFor, saveRoutine } from '@/store/routine';
import { learnFromPending } from '@/store/memory';
import { pendingProposal, requestReview, type RoutineProposal } from '@/store/routine-review';
import { RoutineProposalCard } from '@/screens/RoutineProposalCard';
import { currentSynthesis } from '@/store/soulMap';

/**
 * US-6.3. Practices with an explicit cadence and a check-in.
 *
 * What this screen deliberately lacks, per PDR 12.2 and US-6.3 CA3: streaks,
 * badges, "you're on a 5-day run", and any notification about not breaking a
 * chain. Those mechanics work by making the product harder to leave, and the
 * stated goal here is the opposite — "Natus se crea para dejar de existir".
 *
 * The count shown is a total, not a run. A total is a record; a run is a
 * thing you can lose, and losing it is the pressure the product refuses to
 * apply. If a ticket asks for streaks, this comment is the reason to push
 * back.
 */

const CADENCE_LABEL = copy.practice.cadence;
const text = copy.routine;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** What a practice converses with, in words (guide 9.7). */
export function connectsLabel(practice: Practice): string {
  const therapy = practice.connects_to.modality_slug
    ? (modalityBySlug(practice.connects_to.modality_slug)?.name_es ?? null)
    : null;
  if (therapy && practice.connects_to.soul_map) return text.connectsBoth(therapy);
  if (therapy) return text.connectsTherapy(therapy);
  return text.connectsMap;
}

const RATINGS = [1, 2, 3, 4, 5] as const;

type Phase = 'integracion' | 'exploracion' | 'pregunta';

/** Top to bottom, as the package draws the stem: Flor, Brote, Semilla. */
const STEM: { phase: Phase; Icon: typeof FlowerIcon }[] = [
  { phase: 'integracion', Icon: FlowerIcon },
  { phase: 'exploracion', Icon: SproutPhaseIcon },
  { phase: 'pregunta', Icon: SeedIcon },
];

/**
 * Package 07: the stem with the phase the map reads. The phase on view is
 * large, lit and breathes slowly; the others at 45 %. The line is dotted
 * toward what comes and solid toward what has passed. It is read, never
 * earned — nothing here moves because something was marked.
 *
 * Two geometries, the package's own: the phone's (44 × 156) and the
 * desktop's (80 × 470), each shown at its width by `rutina.css`.
 */
function Stem({ phase, desk }: { phase: Phase; desk: boolean }) {
  const H = desk ? 470 : 156;
  const W = desk ? 80 : 44;
  const cx = W / 2;
  const nodes = desk ? [40, 235, 430] : [16, 78, 140];
  const y = (i: number) => nodes[i] ?? 0;
  const glow = desk ? 38 : 26;
  const current = STEM.findIndex((s) => s.phase === phase);
  const words = desk ? text.phaseLong : text.phaseShort;
  const segment = (i: number) => {
    const solid = current <= i;
    return solid ? (
      <line key={i} x1={cx} y1={y(i)} x2={cx} y2={y(i + 1)} stroke="#ECE2D0" strokeWidth={desk ? 1.4 : 1.2} />
    ) : (
      <line
        key={i}
        x1={cx}
        y1={y(i)}
        x2={cx}
        y2={y(i + 1)}
        stroke="rgba(236,226,208,.3)"
        strokeDasharray={`1 ${desk ? 7 : 5}`}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className={desk ? 'tallo solo-pc' : 'tallo solo-cel'}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {segment(0)}
        {segment(1)}
        {STEM.map(({ phase: p, Icon }, i) => {
          const on = i === current;
          const r = desk ? (on ? 27 : 22) : on ? 19 : 16;
          const size = desk ? (on ? 36 : 32) : on ? 26 : 22;
          // What has passed (below) keeps a firmer ring than what comes.
          const ring = on ? 1 : i > current ? 0.55 : 0.3;
          return (
            <g key={p}>
              {on && <circle className="brillo" cx={cx} cy={y(i)} r={glow} fill="rgba(236,226,208,.18)" />}
              <circle cx={cx} cy={y(i)} r={r} fill={`rgba(0,0,0,${on ? 0.4 : 0.35})`} stroke={`rgba(236,226,208,${ring})`} />
              <Icon x={cx - size / 2} y={y(i) - size / 2} size={size} color={`rgba(236,226,208,${on ? 1 : 0.6})`} />
            </g>
          );
        })}
      </svg>
      <div className="fases">
        {STEM.map(({ phase: p }, i) => (
          <div
            key={p}
            className={i === current ? 'fase on' : 'fase off'}
            style={{ top: `${(y(i) / H) * 100}%` }}
            aria-current={i === current ? 'step' : undefined}
          >
            <b>{text.phase[p]}</b>
            <small>{words[p]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * v1.2 R-03: once a practice is marked, how useful it was, 1 to 5, and an
 * optional comment — package 07's sheet, from below on the phone and centred
 * on desktop. Five plain pills with the two ends named: no stars, no colour
 * that reads as a grade, nothing that looks like an achievement.
 *
 * The comment is free text, so it goes through the crisis detector before it
 * is saved; a high-severity match opens the crisis screen and neither the
 * comment nor the rating is kept.
 */
/** R-03, shared with Hoy and Carta: mounted inside an element with `.rutina`. */
export function FeedbackSheet({
  title,
  date,
  onCrisis,
  onClose,
}: {
  title: string;
  date: string;
  onCrisis: (eventId: string) => void;
  onClose: () => void;
}) {
  const checkIn = checkInToday(title, date);
  const [rating, setRating] = useState<number | null>(checkIn?.rating ?? null);
  const [comment, setComment] = useState(checkIn?.comment ?? '');
  const firstRef = useRef<HTMLButtonElement>(null);
  const r = text.rating;

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    if (rating === null) return;
    const value = comment.trim();
    if (value) {
      const verdict = detectCrisis({ texts: [value] });
      if (verdict.crisis) {
        const event = recordCrisisEvent(verdict, 'practice_comment');
        if (verdict.severity === 'high') {
          onCrisis(event.id);
          return;
        }
      }
    }
    rateCheckIn(title, date, rating, value);
    // v1.2 M-01: a rated practice, with what the person said about it.
    void learnFromPending({ checkinsToday: true });
    onClose();
  };

  return (
    <>
      <div className="scrim-fb" onClick={onClose} aria-hidden="true" />
      <div className="hoja-fb" role="dialog" aria-modal="true" aria-label={r.question}>
        <span className="agarre-fb" aria-hidden="true" />
        <p className="cad">{title}</p>
        <p className="fbt">
          {r.questionLead}
          <em>{r.questionEmphasis}</em>
          {r.questionTail}
        </p>
        <div className="escala" role="radiogroup" aria-label={r.question}>
          {RATINGS.map((n) => (
            <button
              key={n}
              ref={n === 1 ? firstRef : undefined}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={r.option(n)}
              className={rating === n ? 'p2 on' : 'p2'}
              onClick={() => setRating(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="extremos" aria-hidden="true">
          <span>{r.low}</span>
          <span>{r.high}</span>
        </div>
        <label className="cad" htmlFor="fbtxt">
          {r.commentLabel}
        </label>
        <textarea
          id="fbtxt"
          className="fbtxt"
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={r.commentPlaceholder}
        />
        <button type="button" className="p1" disabled={rating === null} onClick={save}>
          {r.save}
        </button>
        <button type="button" className="txtbtn" onClick={onClose}>
          {r.skip}
        </button>
      </div>
    </>
  );
}

export function Routine() {
  // The match of the current map: after the birth data changes (M-02) the
  // paths are chosen again, and until they are there is no routine to show.
  const synthesisNow = currentSynthesis();
  const match = synthesisNow ? currentMatchFor(synthesisNow.id) : undefined;
  const navigate = useNavigate();
  const [, force] = useState(0);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  // R-03: the practice whose feedback sheet is open, and the button that
  // opened it, to give the focus back when it closes.
  const [sheet, setSheet] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeSheet = useCallback(() => {
    setSheet(null);
    force((n) => n + 1);
    opener.current?.focus();
  }, []);
  const date = today();
  const practices = routineFor(match);

  // v1.2 R-01: the routine is written after the therapies, the first time the
  // person comes to see it, so it sees which ones they set aside.
  const generate = useCallback(async () => {
    const synthesis = currentSynthesis();
    if (!match || !synthesis) return;
    setGenerating(true);
    setFailed(false);
    try {
      const kept = match.result.matched_modalities.filter(
        (m) => match.reactions[m.modality_slug]?.reaction !== 'dismissed',
      );
      const modalitySlugs = kept.map((m) => m.modality_slug);
      // The why of each therapy travels with it, so the routine understands
      // the choice and not only the therapy.
      const reasons = Object.fromEntries(kept.map((m) => [m.modality_slug, m.reasoning]));
      const result = await generateRoutine({ synthesis: synthesis.synthesis, modalitySlugs, reasons });
      saveRoutine(match.id, result.value);
      // The practices live in the store, not in state. When the answer comes
      // back at once (a fixture), generating goes true and false in the same
      // batch, React sees no state change and drops the render; this makes
      // sure the routine just saved is shown.
      force((n) => n + 1);
    } catch {
      setFailed(true);
    } finally {
      setGenerating(false);
    }
  }, [match]);

  // v1.2 R-04: the server decides whether a review is due; a proposal it
  // wrote waits here for an answer.
  const [proposal, setProposal] = useState<RoutineProposal | null>(null);
  const [answered, setAnswered] = useState<'accepted' | 'kept' | null>(null);
  const hasPractices = practices.length > 0;
  useEffect(() => {
    if (!hasPractices) return;
    let live = true;
    void requestReview()
      .then(pendingProposal)
      .then((p) => {
        if (live) setProposal(p);
      });
    return () => {
      live = false;
    };
  }, [hasPractices]);

  const needsRoutine = Boolean(match) && practices.length === 0;
  useEffect(() => {
    if (needsRoutine && !generating && !failed) void generate();
  }, [needsRoutine, generating, failed, generate]);

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={activeProfile()?.draft.country}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          setCrisisEventId(null);
        }}
        onBack={() => {
          setCrisisEventId(null);
          navigate('/hoy');
        }}
      />
    );
  }

  if (!match) {
    return (
      <Screen photo="hojasPlatano" veil={0.28} glassAlpha={0.32}>
        <div className="pz rutina scroll">
          <p className="k">{text.kicker}</p>
          <h1 className="t">
            {text.titleLead}
            <em>{text.titleEmphasis}</em>
          </h1>
          <div className="vclaro pr">
            <p className="pc">{text.empty}</p>
            <Link to={PATHS.paths} className="p2 on">
              {text.toPaths}
            </Link>
          </div>
        </div>
      </Screen>
    );
  }

  if (practices.length === 0) {
    return (
      <Screen photo="hojasPlatano" veil={0.28} glassAlpha={0.32}>
        <div className="pz rutina scroll items-center justify-center text-center">
          {failed ? (
            <>
              <p className="nose">{copy.chrome.aiError.message}</p>
              <button type="button" className="p2 on" onClick={() => void generate()}>
                {copy.chrome.aiError.retry}
              </button>
            </>
          ) : (
            <>
              <Ouroboros size={88} />
              <p role="status" className="fr">
                {text.generating}
              </p>
            </>
          )}
        </div>
      </Screen>
    );
  }

  const phase = synthesisNow?.synthesis.detected_phase ?? 'pregunta';

  return (
    <Screen photo="hojasPlatano" veil={0.28} glassAlpha={0.32}>
      <div className="pz rutina scroll">
        <div className="col1">
          <p className="k">{text.kicker}</p>
          <h1 className="t">
            {text.titleLead}
            <em>{text.titleEmphasis}</em>
          </h1>
          <p className="sub solo-pc">{text.notEarnedLong}</p>
          <Stem phase={phase} desk={false} />
          <Stem phase={phase} desk />
          <p className="nose solo-cel">{text.notEarned}</p>
        </div>

        <div className="col2">
          <p className="k solo-pc">{text.fromPaths}</p>

          {proposal && (
            <RoutineProposalCard
              proposal={proposal}
              onAnswered={(accepted) => {
                setProposal(null);
                setAnswered(accepted ? 'accepted' : 'kept');
                force((n) => n + 1);
              }}
            />
          )}
          {answered && (
            <p className="prop-ok" role="status">
              {answered === 'accepted' ? text.review.accepted : text.review.kept}
            </p>
          )}

          <div className="vclaro">
            {practices.map((practice) => {
              // «Una vez» is done once and stays done, with no count of days
              // (owner, 21 Oct 2026); the rest are marked day by day.
              const once = practice.cadence === 'one_off';
              const done = once ? isDoneOnce(practice.title) : isCheckedToday(practice.title, date);
              // A total, never a consecutive run. See the note above.
              const total = totalCheckIns(practice.title);

              return (
                <article key={practice.title} className="pr">
                  <div>
                    <p className="cad">{CADENCE_LABEL[practice.cadence]}</p>
                    <h2 className="pt">{practice.title}</h2>
                    <p className="pc solo-pc">{practice.body}</p>
                    <p className="cv">{connectsLabel(practice)}</p>
                    {!once && <p className="pd">{copy.practice.totalDays(total)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (once) toggleOnce(practice.title, date);
                      else toggleCheckIn(practice.title, date);
                      // R-03: marking asks how useful it was; unmarking takes
                      // the rating with it.
                      if (!done) {
                        opener.current = e.currentTarget;
                        setSheet(practice.title);
                      }
                      force((n) => n + 1);
                    }}
                    aria-pressed={done}
                    className={done ? 'p2 on' : 'p2'}
                  >
                    {done && <CheckIcon />}
                    {once
                      ? done
                        ? text.doneOnce
                        : text.markOnce
                      : done
                        ? text.doneToday
                        : text.markToday}
                  </button>
                </article>
              );
            })}
          </div>

          <p className="nota-r solo-pc">{text.helper}</p>
          <Link to={PATHS.paths} className="p2 volver-caminos">
            {text.backToPaths}
          </Link>
        </div>

        {sheet && (
          <FeedbackSheet
            key={sheet}
            title={sheet}
            date={date}
            onCrisis={(id) => {
              setSheet(null);
              setCrisisEventId(id);
            }}
            onClose={closeSheet}
          />
        )}
      </div>
    </Screen>
  );
}
