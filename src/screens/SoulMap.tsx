import { Link } from 'react-router-dom';
import { isDemoMode } from '@/supabase/client';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { activeProfile, isSignedIn } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import type { Numerology } from '@/lib/schemas';

/**
 * Screen 8 of PDR 6.1: the narrative synthesis in three sections, the tips,
 * and the five numbers underneath.
 *
 * The account is asked for after this screen, never before — PDR section 3.
 * The person has already put in the time and now has something to lose.
 */

const text = copy.soulMap;

const NUMBER_ORDER: (keyof typeof copy.practice.numberLabels)[] = [
  'life_path',
  'expression',
  'soul_urge',
  'personality',
  'birthday',
];

const SECTION_TITLES = text.sections;

function Numbers({ numerology }: { numerology: Numerology }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        {NUMBER_ORDER.map((key) => (
          <div
            key={key}
            className="surface surface-p12 flex items-center justify-between"
          >
            <span className="text-[length:var(--fs-body-13)] text-blanco/85">{copy.practice.numberLabels[key]}</span>
            <span className="font-serif text-[length:var(--fs-numeral-24)] leading-8 font-light text-crema">{numerology[key]}</span>
          </div>
        ))}
      </div>

      {numerology.master_numbers_present.length > 0 && (
        <p className="mt-4 px-1 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
          {text.masterNumbersLead}
          <span className="text-crema">{numerology.master_numbers_present.join(', ')}</span>
          {text.masterNumbersTail}
        </p>
      )}

      <p className="mt-3 px-1 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
        {text.numbersNote}
      </p>
    </>
  );
}

export function SoulMap() {
  const profile = activeProfile();
  const stored = currentSynthesis();
  const firstName = (profile?.draft.legal_birth_name ?? '').trim().split(/\s+/)[0] ?? '';

  if (!stored) {
    return (
      <Screen backdrop="palm" scrim="heavy" opacity={PHOTO.content45}>
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

  const { synthesis, numerology } = stored;

  return (
    <Screen backdrop="palm" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{text.kicker}</p>

        <h1 className="mb-7 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {firstName ? text.titleWithName(firstName) : text.titleWithoutName}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
        </h1>

        <div className="flex flex-col gap-6">
          {(Object.keys(SECTION_TITLES) as (keyof typeof SECTION_TITLES)[]).map((key) => (
            <section key={key}>
              <h2 className="eyebrow mb-2.5">{SECTION_TITLES[key]}</h2>
              <p className="text-[length:var(--fs-body-13_5)] leading-relaxed text-blanco/85">
                {synthesis.soul_map_synthesis[key]}
              </p>
            </section>
          ))}
        </div>

        <div className="my-7 h-px w-10 bg-crema/25" />

        <h2 className="eyebrow mb-3">{text.toTry}</h2>
        <div className="flex flex-col gap-2.5">
          {synthesis.tips.map((tip) => (
            <article key={tip.title} className="surface surface-p14">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <h3 className="text-[length:var(--fs-heading-13)] text-blanco">{tip.title}</h3>
                <span className="shrink-0 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
                  {copy.practice.cadence[tip.cadence]}
                </span>
              </div>
              <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/65">{tip.body}</p>
              {/* PDR 1.5: every tip closes on a micro-invitation. It is set in
                  the serif italic so it reads as a question, not a step. */}
              <p className="mt-2.5 font-serif text-[length:var(--fs-voice-15)] leading-snug text-crema italic">
                {tip.invitation}
              </p>
            </article>
          ))}
        </div>

        <div className="my-7 h-px w-10 bg-crema/25" />

        <h2 className="eyebrow mb-3">{text.numbers}</h2>
        {numerology ? (
          <Numbers numerology={numerology} />
        ) : (
          <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
            {text.numbersFailed}
          </p>
        )}

        <p className="mt-8 mb-3 px-1 font-serif text-[length:var(--fs-voice-17)] leading-snug text-crema/80 italic">
          {synthesis.follow_up_invitation}
        </p>

        <div className="mt-auto flex flex-col gap-2.5 pt-4">
          <Link to="/caminos" className="cta no-underline">
            {text.toPaths}
            <span aria-hidden="true">→</span>
          </Link>

          {/* PDR section 3: the account is offered here and nowhere earlier —
              the person now has something they would rather not lose. It is a
              secondary control, not a gate; the flow continues without it. */}
          {!isSignedIn() && (
            <Link
              to="/registro"
              className="chip chip-p10 text-center text-crema/60 no-underline"
            >
              {text.save}
            </Link>
          )}

          {isDemoMode && (
            <p className="px-1 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
              {stored.mode === 'fixture' ? copy.demo.fixture : copy.demo.generated} ·{' '}
              {stored.prompt_version}
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}
