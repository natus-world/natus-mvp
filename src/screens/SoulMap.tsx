import { useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '@/supabase/client';
import { PHOTO, Screen } from '@/design/Screen';
import { ChevronIcon, DropIcon, SproutIcon, WaterIcon } from '@/design/icons';
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

type SectionKey = keyof typeof SECTION_TITLES;

/** The icons of the approved Carta capture, one per reading. */
const SECTION_ICONS: Record<SectionKey, ComponentType<{ size?: number; className?: string }>> = {
  tu_camino: WaterIcon,
  lo_que_estas_trabajando: DropIcon,
  que_necesitas_ahora: SproutIcon,
};

/**
 * The first sentence of a reading, shown while its row is closed. It is the
 * model's own text, cut where the model ended a sentence — nothing is written
 * for the preview that the reading does not already say.
 */
function firstSentence(text: string): string {
  const match = /^.+?[.!?…](?=\s|$)/s.exec(text.trim());
  return (match ? match[0] : text).trim();
}

/** The five numbers in one row, as in the approved Carta capture. */
function NumberRow({ numerology }: { numerology: Numerology }) {
  return (
    <dl className="grid grid-cols-5 gap-1 text-center">
      {NUMBER_ORDER.map((key) => (
        <div key={key} className="flex flex-col items-center gap-1">
          <dt className="text-[length:var(--fs-label-10)] tracking-[0.12em] text-crema/60 uppercase">
            <span aria-hidden="true">{text.numberShort[key]}</span>
            <span className="sr-only">{copy.practice.numberLabels[key]}</span>
          </dt>
          <dd className="font-serif text-[length:var(--fs-numeral-24)] leading-8 font-light text-crema">
            {numerology[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The three readings as one card of rows, as in the approved capture: an
 * icon, the title, the first sentence and a chevron. A row opens in place to
 * the full reading — the whole row is the control, not only the chevron.
 */
function Readings({ synthesis }: { synthesis: Record<SectionKey, string> }) {
  const [open, setOpen] = useState<Partial<Record<SectionKey, boolean>>>({});

  return (
    <div className="surface rows px-0">
      {(Object.keys(SECTION_TITLES) as SectionKey[]).map((key) => {
        const Icon = SECTION_ICONS[key];
        const isOpen = open[key] === true;
        const regionId = `lectura-${key}`;
        return (
          <section key={key}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={regionId}
              onClick={() => setOpen((state) => ({ ...state, [key]: !isOpen }))}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
            >
              <Icon size={24} className="shrink-0 text-crema/80" />
              <span className="min-w-0 flex-1">
                <span className="block text-[length:var(--fs-heading-15)] leading-snug text-blanco">
                  {SECTION_TITLES[key]}
                </span>
                {!isOpen && (
                  <span className="mt-0.5 line-clamp-2 block text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/60">
                    {firstSentence(synthesis[key])}
                  </span>
                )}
              </span>
              <span className="circle-chip flex size-9 shrink-0 items-center justify-center text-crema/80">
                <ChevronIcon
                  size={16}
                  className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                />
              </span>
            </button>
            <div id={regionId} hidden={!isOpen} className="px-4 pb-4 pl-[3.875rem]">
              <p className="text-[length:var(--fs-body-13_5)] leading-relaxed text-blanco/85">
                {synthesis[key]}
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NumberNotes({ numerology }: { numerology: Numerology }) {
  return (
    <>
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
      <Screen backdrop="mar" scrim="heavy" opacity={PHOTO.content45}>
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
    <Screen backdrop="mar" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{text.kicker}</p>

        <h1 className="mb-7 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {firstName ? text.titleWithName(firstName) : text.titleWithoutName}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
        </h1>

        {/* Order of the approved Carta capture: the numbers in one row, then
            the three readings as a card. The chart wheel goes above the
            numbers once the backend stores positions (Carta B). */}
        <h2 className="sr-only">{text.numbers}</h2>
        {numerology ? (
          <>
            <NumberRow numerology={numerology} />
            <NumberNotes numerology={numerology} />
          </>
        ) : (
          <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
            {text.numbersFailed}
          </p>
        )}

        <div className="mt-6">
          <Readings synthesis={synthesis.soul_map_synthesis} />
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
