import { hasBirthTime, shouldCalculateNatalChart } from '@/astrology/natal-chart';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '@/supabase/client';
import { Screen } from '@/design/Screen';
import { ChartWheel } from '@/design/ChartWheel';
import { CheckIcon, ChevronIcon } from '@/design/icons';
import { copy } from '@/i18n';
import { buildNatalChart, type NatalChart } from '@/lib/natal-chart';
import { activeProfile, isSignedIn } from '@/store/account';
import { currentSynthesis, listSyntheses, type StoredSynthesis } from '@/store/soulMap';
import { currentMatchFor, isCheckedToday, toggleCheckIn, totalCheckIns } from '@/store/matches';
import { routineFor } from '@/store/routine';
import type { OnboardingDraft } from '@/store/session';
import { PATHS } from '@/components/routes';
import { connectsLabel } from '@/screens/Routine';
import type { Numerology } from '@/lib/schemas';

/**
 * Carta, level 1 (package 04, 16 Oct 2026): the wheel in simple mode, the
 * Sun, Moon and Ascendant in words, then the five numbers, Davraz's three
 * readings, the practices of the routine that converse with the chart, and
 * when the map was written.
 *
 * «Ver mi carta completa» is the package's one primary pill; it opens level 2,
 * which is not built yet, so it is left out until it is. The first showing of
 * the map (the revelation) is its own screen.
 */

const text = copy.soulMap;
const SIGN_NAMES = copy.chat.signs;

const NUMBER_ORDER: (keyof typeof copy.practice.numberLabels)[] = [
  'life_path',
  'expression',
  'soul_urge',
  'personality',
  'birthday',
];

const SECTION_TITLES = text.sections;
const SECTION_KEYS = Object.keys(SECTION_TITLES) as (keyof typeof SECTION_TITLES)[];

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function dayOf(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return copy.journal.date(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, new Date().getFullYear());
}

/** The stored chart, read the same way the prompts read it. Null when there is none to draw. */
function chartOf(draft: OnboardingDraft): NatalChart | null {
  const stored = draft.natal_chart;
  if (!stored || stored.parse_status !== 'parsed') return null;
  try {
    return buildNatalChart(stored.context, hasBirthTime(draft));
  } catch {
    return null;
  }
}

function signOf(chart: NatalChart, name: string): string | null {
  const sign = chart.points.find((p) => p.name === name)?.sign;
  return sign ? (SIGN_NAMES[sign] ?? sign) : null;
}

function Wheel({ chart }: { chart: NatalChart }) {
  const sun = signOf(chart, 'Sun');
  const moon = signOf(chart, 'Moon');
  const ascendant = chart.ascendant ? (SIGN_NAMES[chart.ascendant.sign] ?? chart.ascendant.sign) : null;
  return (
    <>
      <div className="rueda">
        <ChartWheel
          chart={chart}
          labels={{ label: text.wheelLabel(sun, moon, ascendant), signs: SIGN_NAMES, axes: text.wheelAxes }}
        />
      </div>
      <div className="trio">
        {sun && (
          <div>
            <b>{sun}</b>
            {text.trio.sun}
          </div>
        )}
        {moon && (
          <div>
            <b>{moon}</b>
            {text.trio.moon}
          </div>
        )}
        {ascendant && (
          <div>
            <b>{ascendant}</b>
            {text.trio.ascendant}
          </div>
        )}
      </div>
      {/* Without the hour: no Ascendant and no houses, and it says so. */}
      {!ascendant && <p className="aviso">{copy.onboarding.basicData.notice}</p>}
    </>
  );
}

function Numbers({ numerology }: { numerology: Numerology | null }) {
  return (
    <section className="vid">
      <div className="cabv">
        <h2 className="k">{text.numbers}</h2>
      </div>
      {numerology ? (
        <>
          {NUMBER_ORDER.map((key) => {
            const value = numerology[key];
            return (
              <div key={key} className="nfila">
                <b>{value}</b>
                <p className="ft">{copy.practice.numberLabels[key]}</p>
                {numerology.master_numbers_present.includes(value) ? <span className="maestro">{text.master}</span> : <span />}
              </div>
            );
          })}
        </>
      ) : (
        <div className="nfila">
          <span />
          <p className="fd">{text.numbersFailed}</p>
        </div>
      )}
    </section>
  );
}

/** What the numbers are: kept from the screen before the package, at the end. */
function NumbersNote({ numerology }: { numerology: Numerology | null }) {
  if (!numerology) return null;
  return (
    <div className="nnota">
      {numerology.master_numbers_present.length > 0 && (
        <p>
          {text.masterNumbersLead}
          {numerology.master_numbers_present.join(', ')}
          {text.masterNumbersTail}
        </p>
      )}
      <p>{text.numbersNote}</p>
    </div>
  );
}

function Readings({ stored }: { stored: StoredSynthesis }) {
  const [open, setOpen] = useState<string | null>(null);
  const { synthesis } = stored;
  return (
    <section className="vid lect">
      <div className="cabv">
        <h2 className="k">{text.readings}</h2>
        <p className="ia">
          {text.readingsBy} <b>{text.readingsAi}</b>
        </p>
      </div>
      {SECTION_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className="fila"
          aria-expanded={open === key}
          onClick={() => setOpen((o) => (o === key ? null : key))}
        >
          <div>
            <h3 className="ft">{SECTION_TITLES[key]}</h3>
            <p className="fd">{synthesis.soul_map_synthesis[key]}</p>
          </div>
          <span className="chev" aria-hidden="true">
            <ChevronIcon />
          </span>
        </button>
      ))}
      <div className="fila">
        <p className="tip">{synthesis.follow_up_invitation}</p>
      </div>
    </section>
  );
}

function ToTry({ synthesisId }: { synthesisId: string }) {
  const [, force] = useState(0);
  const practices = routineFor(currentMatchFor(synthesisId));
  // v1.2 O-07: the same routine, seen from the chart — not a second list.
  const toTry = practices.filter((p) => p.connects_to.soul_map);
  const date = new Date().toISOString().slice(0, 10);

  if (practices.length === 0) {
    return (
      <section className="vid">
        <div className="cabv">
          <h2 className="k">{text.toTry}</h2>
        </div>
        <Link to={PATHS.paths} className="fila">
          <p className="ft">{text.toTryEmpty}</p>
          <span className="chev">
            <ChevronIcon />
          </span>
        </Link>
      </section>
    );
  }
  // None converses with the chart: no empty card.
  if (toTry.length === 0) return null;

  return (
    <section className="vid">
      <div className="cabv">
        <h2 className="k">{text.toTry}</h2>
      </div>
      {toTry.map((practice) => {
        const done = isCheckedToday(practice.title, date);
        return (
          <div key={practice.title} className="fila">
            <div>
              <p className="fk">{copy.practice.cadence[practice.cadence]}</p>
              <h3 className="ft">{practice.title}</h3>
              {/* A total, never a consecutive run. */}
              <p className="conv">
                {connectsLabel(practice)} · {copy.practice.totalDays(totalCheckIns(practice.title))}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={done}
              className={done ? 'p2 on' : 'p2'}
              onClick={() => {
                toggleCheckIn(practice.title, date);
                force((n) => n + 1);
              }}
            >
              {done && <CheckIcon />}
              {done ? copy.routine.doneToday : copy.routine.markToday}
            </button>
          </div>
        );
      })}
    </section>
  );
}

function Updated({ stored, previous }: { stored: StoredSynthesis; previous: StoredSynthesis | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="actu">
        <span>{previous ? text.updatedOn(dayOf(stored.created_at)) : text.generatedOn(dayOf(stored.created_at))}</span>
        {previous && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? text.previousHide : text.previousShow}
          </button>
        )}
      </div>
      {open && previous && (
        <section className="vid anterior">
          <div className="cabv">
            <h2 className="k">{text.previousFrom(dayOf(previous.created_at))}</h2>
          </div>
          {SECTION_KEYS.map((key) => (
            <div key={key} className="fila">
              <div>
                <h3 className="ft">{SECTION_TITLES[key]}</h3>
                <p className="fd">{previous.synthesis.soul_map_synthesis[key]}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export function SoulMap() {
  const profile = activeProfile();
  const stored = currentSynthesis();

  if (!stored) {
    return (
      <Screen photo="cieloEstrellas" veil={0.15} glassAlpha={0.32}>
        <div className="pz carta scroll vacio">
          <p className="cuerpo">{text.empty}</p>
          <Link to="/onboarding" className="p1">
            {text.start}
          </Link>
        </div>
      </Screen>
    );
  }

  const name = firstNameOf(profile?.draft.legal_birth_name ?? '');
  const chart = profile ? chartOf(profile.draft) : null;
  // The chart was asked for and is not there: said, not hidden (16 Oct 2026).
  const chartMissing = profile !== null && !chart && shouldCalculateNatalChart(profile.draft) && !profile.draft.natal_chart;
  // v1.2 M-02: the version before this one, if the map has been written again.
  const previous = listSyntheses()
    .filter((s) => s.id !== stored.id && s.created_at < stored.created_at)
    .sort((a, b) => b.created_at - a.created_at)[0];

  return (
    <Screen photo="cieloEstrellas" veil={0.15} glassAlpha={0.32}>
      <div className="pz carta scroll">
        <div className="col1">
          <p className="k">{text.kicker}</p>
          <h1 className="t">
            {name ? text.titleWithName(name) : text.titleWithoutName}
            <em>{text.titleEmphasis}</em>
          </h1>

          {chart && <Wheel chart={chart} />}

          {chartMissing && (
            <div className="vid pad falta">
              <p className="cuerpo">{text.chartMissing}</p>
              <Link to={`${PATHS.profile}/nacimiento`} className="p2">
                {text.chartMissingCta}
              </Link>
            </div>
          )}
        </div>

        <div className="col2">
          <Numbers numerology={stored.numerology} />
          <Readings stored={stored} />
          <ToTry synthesisId={stored.id} />
          <Updated stored={stored} previous={previous} />
          <NumbersNote numerology={stored.numerology} />

          <div className="pie">
            <Link to={PATHS.paths} className="p2">
              {text.toPaths}
              <span aria-hidden="true">→</span>
            </Link>

            {/* PDR section 3: the account is offered, never required here. */}
            {!isSignedIn() && (
              <Link to="/registro" className="p2">
                {text.save}
              </Link>
            )}
          </div>

          {isDemoMode && (
            <p className="demo">
              {stored.mode === 'fixture' ? copy.demo.fixture : copy.demo.generated} · {stored.prompt_version}
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}
