import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { copy } from '@/i18n';
import { modalityBySlug } from '@/lib/catalog';
import type { Practice } from '@/lib/schemas';
import { generateRoutine } from '@/ai/routine';
import { currentMatch, isCheckedToday, toggleCheckIn, totalCheckIns } from '@/store/matches';
import { routineFor, saveRoutine } from '@/store/routine';
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

export function Routine() {
  const match = currentMatch();
  const [, force] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
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
    } catch {
      setFailed(true);
    } finally {
      setGenerating(false);
    }
  }, [match]);

  const needsRoutine = Boolean(match) && practices.length === 0;
  useEffect(() => {
    if (needsRoutine && !generating && !failed) void generate();
  }, [needsRoutine, generating, failed, generate]);

  if (!match) {
    return (
      <Screen backdrop="hoja" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {text.empty}
          </p>
          <Link to="/caminos" className="cta no-underline">
            {text.toPaths}
          </Link>
        </div>
      </Screen>
    );
  }

  if (practices.length === 0) {
    return (
      <Screen backdrop="hoja" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center sm:min-h-0 sm:flex-1">
          {failed ? (
            <>
              <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/75">{copy.chrome.aiError.message}</p>
              <button type="button" className="cta" onClick={() => void generate()}>
                {copy.chrome.aiError.retry}
              </button>
            </>
          ) : (
            <>
              <Ouroboros size={88} />
              <p role="status" className="font-serif text-[length:var(--fs-voice-19)] font-light text-blanco">
                {text.generating}
              </p>
            </>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen backdrop="hoja" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{text.kicker}</p>
        <h1 className="mb-2 text-[length:var(--fs-title-28)] leading-[var(--lh-heading-1_15)] text-blanco">
          {text.titleLead}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
        </h1>
        <p className="mb-6 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
          {text.helper}
        </p>

        <div className="flex flex-col gap-2.5">
          {practices.map((practice) => {
            const done = isCheckedToday(practice.title, date);
            const total = totalCheckIns(practice.title);

            return (
              <article key={practice.title} className="surface surface-p16">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-[length:var(--fs-heading-14)] leading-snug text-blanco">{practice.title}</h2>
                  <span className="shrink-0 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
                    {CADENCE_LABEL[practice.cadence]}
                  </span>
                </div>

                <p className="mb-2 text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">
                  {connectsLabel(practice)}
                </p>
                <p className="mb-3 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/65">{practice.body}</p>

                <p className="mb-3.5 font-serif text-[length:var(--fs-voice-15)] leading-snug text-crema italic">
                  {practice.invitation}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      toggleCheckIn(practice.title, date);
                      force((n) => n + 1);
                    }}
                    aria-pressed={done}
                    className={[
                      'chip-p8 flex-1 transition-colors',
                      done ? 'chip chip-on' : 'chip text-crema/70 hover:text-crema',
                    ].join(' ')}
                  >
                    {done ? text.doneToday : text.markToday}
                  </button>

                  {total > 0 && (
                    // A total, never a consecutive run. See the note above.
                    <span className="shrink-0 text-[length:var(--fs-body-11)] text-crema/55">
                      {copy.practice.totalDays(total)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-7">
          <Link to="/caminos" className="cta no-underline">
            {text.backToPaths}
          </Link>
        </div>
      </div>
    </Screen>
  );
}
