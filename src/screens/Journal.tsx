import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { MicIcon } from '@/design/icons';
import { PLANET_GLYPHS, type GlyphPlanet } from '@/design/planet-glyphs';
import { useDictation } from '@/components/useDictation';
import { enterTakeover } from '@/components/takeover';
import { copy } from '@/i18n';
import { modalityBySlug } from '@/lib/catalog';
import { buildNatalChart } from '@/lib/natal-chart';
import { lifePath } from '@/lib/numerology';
import { detectCrisis } from '@/lib/safety';
import { hasBirthTime } from '@/astrology/natal-chart';
import { PATHS } from '@/components/routes';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { DESK_MS, markBookMoving, PHONE_MS, playDesk, playPhone, rememberCover } from '@/screens/journal-motion';
import { activeProfile } from '@/store/account';
import { hasRecentLowSeverity, markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { CrisisBanner } from '@/components/CrisisBanner';
import { getPreferences } from '@/store/preferences';
import { learnFromPending } from '@/store/memory';
import { addEntry, deleteEntry, listEntries, MAX_ENTRY_CHARS, type JournalEntry } from '@/store/journal';
import { currentMatch } from '@/store/matches';
import { fetchQuota } from '@/store/quota';
import { listPractices } from '@/store/routine';
import type { OnboardingDraft } from '@/store/session';

/**
 * v1.2 B-01, guide 9.8. The person's diary: what they are living, in their
 * words. Everything written is kept in their record — there is no "only for
 * me" — and every entry goes through the crisis detector before it is saved,
 * the same as a chat turn.
 *
 * Like the routine, it counts nothing: no streak, no "you wrote 5 days in a
 * row", no reminder about a day without an entry.
 *
 * Drawn as a book (branding package 08 and 09, 16 Oct 2026): closed on the
 * burnt wood, with the tab bar; opened, the app is the book — on the phone one
 * page at a time (the first page with the wheel of moons, the days, a day, a
 * new page), on desktop two at a time. The paper takes no veil and no shadow.
 */

const text = copy.journal;
const MOODS = [1, 2, 3, 4, 5] as const;
const BANCO = `${import.meta.env.BASE_URL}img/banco/`;
const DESK = '(min-width: 1024px)';

/** The person's own calendar day, not UTC's: an entry at 11 p.m. is today's. */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function partsOf(iso: string): { year: number; month: number; day: number } {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return { year, month, day };
}

function weekdayOf(iso: string): string {
  const { year, month, day } = partsOf(iso);
  return text.weekdays[new Date(year, month - 1, day).getDay()] ?? '';
}

type About = { kind: 'practice'; id: string; label: string } | { kind: 'therapy'; slug: string; label: string };

/** What an entry can be about: the practices of the routine and the therapies kept. */
function linkOptions(): About[] {
  const match = currentMatch();
  if (!match) return [];
  const practices: About[] = listPractices()
    .filter((p) => p.match_id === match.id && p.is_active)
    .map((p) => ({ kind: 'practice', id: p.id, label: p.title }));
  const therapies: About[] = match.result.matched_modalities
    .filter((m) => match.reactions[m.modality_slug]?.reaction !== 'dismissed')
    .map((m) => ({ kind: 'therapy', slug: m.modality_slug, label: modalityBySlug(m.modality_slug)?.name_es ?? m.modality_slug }));
  return [...practices, ...therapies];
}

function linkedLabel(entry: JournalEntry): string | null {
  if (entry.practice_id) return listPractices().find((p) => p.id === entry.practice_id)?.title ?? null;
  if (entry.modality_slug) return modalityBySlug(entry.modality_slug)?.name_es ?? null;
  return null;
}

// ── Plan: the notice and the microphone ─────────────────────────────────────

type Plan = { tier: 'free' | 'premium' | null; offerPremium: boolean };

function usePlan(): Plan {
  const [plan, setPlan] = useState<Plan>({ tier: null, offerPremium: true });
  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (live) setPlan({ tier: q?.tier ?? null, offerPremium: q?.offerPremium ?? true });
    });
    return () => {
      live = false;
    };
  }, []);
  return plan;
}

/**
 * Guide 9.8's honest notice, by plan and by whether the memory reads the
 * journal. Free is told what Premium would do — except while the server says
 * Premium is not to be offered (after a crisis alert, 15 Oct 2026).
 */
function noticeFor(plan: Plan): string {
  if (plan.tier === 'premium') return getPreferences().memory_consent_at ? text.noticePremium : text.notice;
  if (plan.tier === 'free' && plan.offerPremium) return text.noticeFree;
  return text.notice;
}

function useDesk(): boolean {
  const [desk, setDesk] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESK).matches);
  useEffect(() => {
    const list = window.matchMedia(DESK);
    const on = () => setDesk(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return desk;
}

/** With the book open the app is the book: no NATUS, no tab bar (package 08). */
function useBookOpen(open: boolean): void {
  useEffect(() => (open ? enterTakeover() : undefined), [open]);
}

function stillMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Small drawings of the package ───────────────────────────────────────────

function Line({ children, width = 1.2 }: { children: ReactNode; width?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const BookIcon = () => (
  <Line>
    <path d="M5 4.5h11A1.5 1.5 0 0 1 17.5 6v13.5H6.5A1.5 1.5 0 0 1 5 18z" />
    <path d="M5 18a1.5 1.5 0 0 1 1.5-1.5h11" />
  </Line>
);

const BackIcon = () => (
  <Line>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Line>
);

const QuillIcon = () => (
  <Line width={1.1}>
    <path d="M19 4c-5 1-9 5-11 11l-2 5 5-2c6-2 10-6 11-11z" />
    <path d="M8 15l5-5" />
  </Line>
);

function Flor() {
  return (
    <svg className="flor" viewBox="0 0 90 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7c10-5 20 5 30 0M56 7c10-5 20 5 30 0" />
      <circle cx="45" cy="7" r="2.2" />
    </svg>
  );
}

/** The ink: the type takes the paper's grain (package filters #tinta and #tintaMapa). */
function InkFilters() {
  return (
    <svg width="0" height="0" className="filtros" aria-hidden="true">
      <filter id="bit-tinta" x="-5%" y="-10%" width="110%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={2} result="m" />
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.3" result="ma" />
        <feComposite in="d" in2="ma" operator="in" />
      </filter>
      <filter id="bit-tinta-1" x="-5%" y="-10%" width="110%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={2} result="m" />
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="ma" />
        <feComposite in="d" in2="ma" operator="in" />
      </filter>
      <filter id="bit-tinta-mapa" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves={2} seed={4} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={9} result="m" />
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.3" result="ma" />
        <feComposite in="d" in2="ma" operator="in" />
      </filter>
    </svg>
  );
}

function Moons({ n }: { n: number }) {
  return (
    <span className="lunas" role="img" aria-label={text.moodLabel(n)}>
      {MOODS.map((i) => (
        <i key={i} className={i <= n ? 'll' : undefined} />
      ))}
    </span>
  );
}

function entryNotes(entry: JournalEntry): ReactNode[] {
  const notes: ReactNode[] = [];
  if (entry.mood !== null) {
    notes.push(
      <Fragment key="mood">
        <span className="anota">{text.mood}</span> <Moons n={entry.mood} />
      </Fragment>,
    );
  }
  const linked = linkedLabel(entry);
  if (linked) {
    notes.push(
      <span key="linked" className="anota">
        {linked}
      </span>,
    );
  }
  return notes;
}

// ── The first page: the wheel of moons, written with the person's sky ───────

/** Where the wheel sits in the photograph (px of the 1760 × 2400 page). */
const CX = 925;
const CY = 912;
const R1 = 738;
const R2 = 617;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const WHEEL_PLANETS: GlyphPlanet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const GLYPH_SIZE = 33;
const GLYPH_GAP = 8.6;

type Sky = {
  name: string;
  arrival: ReturnType<typeof text.arrival>;
  /** Ecliptic longitudes; the Ascendant only with the hour of birth. */
  ascendant: number | null;
  sun: number | null;
  moon: number | null;
  planets: { name: GlyphPlanet; longitude: number }[];
  number: number | null;
};

/** Everything written on the first page comes from the person's own data. */
function skyOf(draft: OnboardingDraft | undefined): Sky {
  const name = draft?.legal_birth_name.trim().split(/\s+/)[0] ?? '';
  let chart: ReturnType<typeof buildNatalChart> | null = null;
  if (draft?.natal_chart) {
    try {
      chart = buildNatalChart(draft.natal_chart.context, hasBirthTime(draft));
    } catch {
      chart = null;
    }
  }
  const at = (point: string) => chart?.points.find((p) => p.name === point)?.longitude ?? null;
  let number: number | null = null;
  try {
    number = draft ? lifePath(draft.birth_date) : null;
  } catch {
    number = null;
  }
  return {
    name,
    arrival: draft ? text.arrival(draft.birth_date, draft.birth_time, draft.birth_place?.name ?? draft.birth_city) : null,
    ascendant: chart?.ascendant ? at('Ascendant') : null,
    sun: at('Sun'),
    moon: at('Moon'),
    planets: WHEEL_PLANETS.flatMap((planet) => {
      const longitude = at(planet);
      return longitude === null ? [] : [{ name: planet, longitude }];
    }),
    number,
  };
}

function Glyphs({ planets, x, y }: { planets: GlyphPlanet[]; x: number; y: number }) {
  const scale = GLYPH_SIZE / 1000;
  const widths = planets.map((p) => PLANET_GLYPHS[p].advance * scale);
  const total = widths.reduce((a, b) => a + b, 0) + GLYPH_GAP * (planets.length - 1);
  const baseline = y + GLYPH_SIZE * 0.35;
  let left = x - total / 2;
  return (
    <g className="gl">
      {planets.map((p, i) => {
        const at = left;
        left += (widths[i] ?? 0) + GLYPH_GAP;
        return <path key={p} d={PLANET_GLYPHS[p].d} fillRule={p === 'Sun' ? 'evenodd' : undefined} transform={`translate(${at.toFixed(1)} ${baseline.toFixed(1)}) scale(${scale} ${-scale})`} />;
      })}
    </g>
  );
}

function Wheel({ sky, cx }: { sky: Sky; cx: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const w = text.wheel;
  const base = sky.ascendant !== null ? Math.floor(sky.ascendant / 30) * 30 : 0;
  const th = (l: number) => (((180 - (l - base)) % 360) + 360) % 360;
  const arc = (r: number, up: boolean) => `M${cx - r} ${CY} A${r} ${r} 0 0 ${up ? 1 : 0} ${cx + r} ${CY}`;
  const put = (key: string, label: string, angle: number, ring: 'r1' | 'r2', className: string) => {
    const up = angle > 180 && angle < 360;
    const pct = up ? (angle - 180) / 180 : (180 - angle) / 180;
    return (
      <text key={key} className={className} textAnchor="middle">
        <textPath href={`#${id}${ring}${up ? 'a' : 'b'}`} startOffset={`${(pct * 100).toFixed(2)}%`}>
          {label}
        </textPath>
      </text>
    );
  };
  const signOf = (l: number | null) => (l === null ? -1 : Math.floor(l / 30));
  const sS = signOf(sky.sun);
  const sL = signOf(sky.moon);
  const sA = signOf(sky.ascendant);

  const houses: ReactNode[] = [];
  if (sA >= 0) {
    for (let k = 0; k < 12; k++) {
      const h = (k - sA + 12) % 12;
      const angle = th(k * 30 + 15);
      const right = Math.cos((angle * Math.PI) / 180) >= 0;
      const inSign = sky.planets.filter((p) => Math.floor(p.longitude / 30) === k);
      const rot = right ? angle : angle - 180;
      const x = right ? cx + 272 : cx - 272;
      houses.push(
        <g key={`h${k}`} transform={`rotate(${rot.toFixed(1)} ${cx} ${CY})`}>
          <text className="casa" x={x} y={CY - (inSign.length ? 20 : 0)} textAnchor="middle">
            {`${ROMAN[h]} · ${w.houses[h]}`}
          </text>
          {inSign.length > 0 && inSign.length < 3 && (
            <text className="pl" x={x} y={CY + 22} textAnchor="middle">
              {inSign.map((p) => w.planets[p.name]).join(w.and)}
            </text>
          )}
          {inSign.length >= 3 && <Glyphs planets={inSign.map((p) => p.name)} x={x} y={CY + 22} />}
        </g>,
      );
    }
  }

  return (
    <svg className="mapa" viewBox="0 0 1760 2400" aria-hidden="true">
      <defs>
        <path id={`${id}r1a`} d={arc(R1, true)} />
        <path id={`${id}r1b`} d={arc(R1, false)} />
        <path id={`${id}r2a`} d={arc(R2, true)} />
        <path id={`${id}r2b`} d={arc(R2, false)} />
        <mask id={`${id}serp`} maskUnits="userSpaceOnUse" x="0" y="0" width="1760" height="2400">
          <image href={`${import.meta.env.BASE_URL}ouroboros.svg`} x={cx - 175} y={CY - 175} width="350" height="350" />
        </mask>
      </defs>
      {w.signs.map((sign, k) =>
        put(`s${k}`, sign, th(k * 30 + 15), 'r1', k === sS || k === sL || k === sA ? 'sig suyo' : 'sig'),
      )}
      {sS >= 0 && put('sun', w.sun, th(sS * 30 + 8), 'r2', 'nota')}
      {sL >= 0 && put('moon', w.moon, th(sL * 30 + 15), 'r2', 'nota')}
      {sA >= 0 && put('asc', w.ascendant, th(sA * 30 + 15), 'r2', 'nota')}
      {sky.number !== null && put('num', w.number(sky.number), 90, 'r2', 'nota')}
      {houses}
      <rect x={cx - 175} y={CY - 175} width="350" height="350" className="serp" mask={`url(#${id}serp)`} />
    </svg>
  );
}

/** Clean paper under the snake, so the rays do not cross it. */
function Patch({ cx }: { cx: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg className="parche" viewBox="0 0 1760 2400" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset=".72" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id={`${id}m`}>
          <circle cx={cx} cy={CY} r="192" fill={`url(#${id}g)`} />
        </mask>
      </defs>
      <image href={`${BANCO}hoja-vacia.avif`} x="0" y="0" width="1760" height="2400" preserveAspectRatio="none" mask={`url(#${id}m)`} />
    </svg>
  );
}

function Written({ sky }: { sky: Sky }) {
  if (!sky.name) return null;
  return (
    <div className="escrito vC tinta">
      <p className="de">{text.bookOf}</p>
      <h1 className="nom">
        <span className="cap">{sky.name.charAt(0)}</span>
        <span>{sky.name.slice(1)}</span>
      </h1>
      {sky.arrival && (
        <p className="col">
          {sky.arrival.lead}
          <b>{sky.arrival.date}</b>
          {sky.arrival.tail}
        </p>
      )}
    </div>
  );
}

// ── The days ────────────────────────────────────────────────────────────────

function Days({
  entries,
  notice,
  selected,
  onOpen,
}: {
  entries: JournalEntry[];
  notice: string;
  selected?: string | undefined;
  onOpen: (id: string) => void;
}) {
  const thisYear = new Date().getFullYear();
  return (
    <>
      <h1 className="ptit tinta mx">
        {text.titleLead}
        <em>{text.titleEmphasis}</em>
      </h1>
      <p className="paviso mx">{notice}</p>
      <Flor />
      {entries.length === 0 ? (
        <p className="etx tinta mx">{text.empty}</p>
      ) : (
        entries.map((entry, i) => {
          const { year, month, day } = partsOf(entry.entry_date);
          const notes = entryNotes(entry);
          const monthName = copy.quota.months[month - 1] ?? '';
          return (
            <Fragment key={entry.id}>
              {i > 0 && <Flor />}
              <button
                type="button"
                className={entry.id === selected ? 'dA mx sel' : 'dA mx'}
                aria-current={entry.id === selected ? 'true' : undefined}
                onClick={() => onOpen(entry.id)}
              >
                <span className="fe tinta">
                  <span className="n">{day}</span>
                  <span className="d">
                    {weekdayOf(entry.entry_date)}
                    <br />
                    {year === thisYear ? monthName : `${monthName} ${year}`}
                  </span>
                </span>
                <span className="etx tinta">{entry.body}</span>
                {notes.length > 0 && <span className="pie-e">{notes}</span>}
              </button>
            </Fragment>
          );
        })
      )}
    </>
  );
}

function Day({
  entry,
  onAll,
  onPrevious,
  onNext,
  onDelete,
}: {
  entry: JournalEntry;
  onAll?: (() => void) | undefined;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onDelete: () => void;
}) {
  const notes = entryNotes(entry);
  return (
    <>
      <div className="cuerpo">
        <article className="dB mx">
          {onAll && (
            <button type="button" className="volver-l" onClick={onAll}>
              ← {text.allDays}
            </button>
          )}
          <p className="d">{weekdayOf(entry.entry_date)}</p>
          <h1 className="f tinta">{text.dayTitle(entry.entry_date, new Date().getFullYear())}</h1>
          <Flor />
          <p className="etx tinta">{entry.body}</p>
          {notes.length > 0 && <div className="pie-e">{notes}</div>}
        </article>
      </div>
      <div className="hojear">
        <button type="button" disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          ← {text.previousDay}
        </button>
        <button type="button" disabled={!onNext} onClick={onNext ?? undefined}>
          {text.nextDay} →
        </button>
      </div>
      <div className="borrar-l">
        <button type="button" onClick={onDelete}>
          <span>{text.delete}</span>
        </button>
      </div>
    </>
  );
}

function ConfirmDelete({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  const titleId = useId();
  const noRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    noRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNo]);
  return (
    <>
      <div className="velo-b" aria-hidden="true" onClick={onNo} />
      <div className="hoja-b" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 className="t" id={titleId}>
          {text.deleteTitleLead}
          <em>{text.deleteTitleEmphasis}</em>
          {text.deleteTitleTail}
        </h2>
        <p className="x">{text.deleteConfirm}</p>
        <div className="bts">
          <button type="button" className="bt-osc" onClick={onYes}>
            {text.deleteYes}
          </button>
          <button ref={noRef} type="button" className="bt-cla" onClick={onNo}>
            {text.deleteNo}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * The foot of a page: the one dark button and the microphone. Voice is
 * premium (B-01): free sees it locked with the guide's line; premium dictates
 * with the browser, where the browser can.
 */
function Foot({
  label,
  icon,
  onPrimary,
  disabled = false,
  plan,
  voice,
}: {
  label: string;
  icon?: ReactNode;
  onPrimary: () => void;
  disabled?: boolean;
  plan: Plan;
  voice: { supported: boolean; listening: boolean; onToggle: () => void };
}) {
  const premium = plan.tier === 'premium';
  const locked = !premium;
  const showMic = locked || voice.supported;
  const note = locked ? (plan.offerPremium ? text.voicePremium : null) : voice.listening ? text.voiceListening : null;
  return (
    <div className={note ? 'pie con-nota' : 'pie'}>
      <div className="fila">
        <button type="button" className="escribir" disabled={disabled} onClick={onPrimary}>
          {icon}
          {label}
        </button>
        {showMic && (
          <button
            type="button"
            className={locked ? 'voz bloq' : voice.listening ? 'voz on' : 'voz'}
            disabled={locked}
            aria-pressed={locked ? undefined : voice.listening}
            aria-label={voice.listening ? text.voiceStop : text.voiceLabel}
            onClick={voice.onToggle}
          >
            <MicIcon />
          </button>
        )}
      </div>
      {note && (
        <p className="vnota" role={voice.listening ? 'status' : undefined}>
          {note}
        </p>
      )}
    </div>
  );
}

function BookButton({ back, onClick }: { back: boolean; onClick: () => void }) {
  return (
    <div className="cab">
      <button type="button" className={back ? 'volver' : 'cerrar'} onClick={onClick}>
        {back ? <BackIcon /> : <BookIcon />}
        {back ? text.cancel : text.close}
      </button>
    </div>
  );
}

/** The paper's photographs, from the bank, handed to the CSS. */
const PAPER = {
  '--hoja-vacia': `url(${BANCO}hoja-vacia.avif)`,
  '--hoja-lunas': `url(${BANCO}hoja-lunas.avif)`,
  '--hoja-lunas-alta': `url(${BANCO}hoja-lunas-alta.avif)`,
  '--tapa': `url(${BANCO}tapa-real.avif)`,
} as CSSProperties;

/** Outside the book, as in the chat (package 08): the banner after a signal. */
function OutsideBanner() {
  if (!hasRecentLowSeverity()) return null;
  return (
    <div className="fuera">
      <CrisisBanner country={activeProfile()?.draft.country} />
    </div>
  );
}

// ── The book, closed ────────────────────────────────────────────────────────

function Closed({ onOpen }: { onOpen: () => void }) {
  const cover = useRef<HTMLDivElement>(null);
  // Where the cover lies, for the book to travel from it and back to it.
  useLayoutEffect(() => {
    const el = cover.current;
    if (!el) return;
    const remember = () => rememberCover(el);
    remember();
    window.addEventListener('resize', remember);
    return () => window.removeEventListener('resize', remember);
  }, []);
  return (
    <div className="pz bitacora cerrado" style={PAPER}>
      {hasRecentLowSeverity() && <CrisisBanner country={activeProfile()?.draft.country} />}
      <div className="mesaR">
        <div ref={cover} className="tapaR" aria-hidden="true" onClick={onOpen} />
        <button type="button" className="tocaR" onClick={onOpen}>
          {text.open}
        </button>
      </div>
    </div>
  );
}

// ── Routes ──────────────────────────────────────────────────────────────────

const ignore = () => undefined;

type View = { kind: 'closed' } | { kind: 'first' } | { kind: 'list' } | { kind: 'day'; id: string };
type BookState = { view?: 'list' } | { view: 'day'; id: string } | { voice?: boolean } | null;

function viewFrom(state: unknown): View {
  const s = state as BookState;
  if (s && 'view' in s && s.view === 'day' && 'id' in s) return { kind: 'day', id: s.id };
  if (s && 'view' in s && s.view === 'list') return { kind: 'list' };
  return { kind: 'closed' };
}

export function Journal() {
  const location = useLocation();
  const navigate = useNavigate();
  const desk = useDesk();
  const plan = usePlan();
  const [view, setView] = useState<View>(() => viewFrom(location.state));
  const [motion, setMotion] = useState<'opening' | 'closing' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [, force] = useState(0);
  const entries = listEntries();
  const notice = noticeFor(plan);
  const profile = activeProfile();
  const sky = skyOf(profile?.draft);
  // The app's chrome leaves when the book has opened, and comes back as it closes.
  useBookOpen(view.kind !== 'closed' && motion === null);

  const bookRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const rightShadeRef = useRef<HTMLDivElement>(null);
  const turnShadeRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Set before the chrome mounts again, so it comes back faded and rises.
  useLayoutEffect(() => {
    markBookMoving(motion !== null);
    return () => markBookMoving(false);
  }, [motion]);

  useLayoutEffect(() => {
    if (motion === null) return;
    const forward = motion === 'opening';
    const book = bookRef.current;
    let played: Promise<void> | null = null;
    if (desk && book && turnRef.current && rightRef.current) {
      played = playDesk(
        {
          book,
          turn: turnRef.current,
          rightPage: rightRef.current,
          rightShade: rightShadeRef.current,
          turnShade: turnShadeRef.current,
          close: book.parentElement?.querySelector<HTMLElement>(':scope > .cab') ?? null,
        },
        forward,
      );
    } else if (!desk && pageRef.current && sceneRef.current) {
      played = playPhone(pageRef.current, sceneRef.current, forward);
    }
    if (!played) {
      if (!forward) setView({ kind: 'closed' });
      setMotion(null);
      return;
    }
    let live = true;
    // Closing, the chrome starts to rise in the last quarter, before the book lands.
    const rise = forward ? 0 : window.setTimeout(() => markBookMoving(false), (desk ? DESK_MS : PHONE_MS) * 0.72);
    void played.then(() => {
      if (!live) return;
      if (!forward) setView({ kind: 'closed' });
      setMotion(null);
    });
    return () => {
      live = false;
      window.clearTimeout(rise);
    };
    // Runs once per change of `motion`, on the view mounted at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

  const { supported } = useDictation(ignore);
  const write = () => navigate(`${PATHS.journal}/nueva`);
  // The days' microphone opens a new page already listening (premium).
  const voice = { supported, listening: false, onToggle: () => navigate(`${PATHS.journal}/nueva`, { state: { voice: true } }) };
  const open = (id: string) => {
    setConfirming(false);
    setView({ kind: 'day', id });
  };

  const closedScene = (onOpen: () => void) => (
    <Screen photo="maderaQuemada" veil={0.25}>
      <Closed onOpen={onOpen} />
    </Screen>
  );

  if (view.kind === 'closed') {
    return closedScene(() => {
      if (motion) return;
      setView(sky.name ? { kind: 'first' } : { kind: 'list' });
      if (!stillMotion()) setMotion('opening');
    });
  }

  const index = view.kind === 'day' ? entries.findIndex((e) => e.id === view.id) : -1;
  const entry = index >= 0 ? entries[index] : undefined;
  const older = index >= 0 ? entries[index + 1] : undefined;
  const newer = index > 0 ? entries[index - 1] : undefined;
  const close = () => {
    if (motion) return;
    setConfirming(false);
    if (stillMotion()) setView({ kind: 'closed' });
    else setMotion('closing');
  };

  const day = entry ? (
    <Day
      entry={entry}
      onAll={desk ? undefined : () => setView({ kind: 'list' })}
      onPrevious={older ? () => open(older.id) : null}
      onNext={newer ? () => open(newer.id) : null}
      onDelete={() => setConfirming(true)}
    />
  ) : null;
  const confirm = entry && confirming && (
    <ConfirmDelete
      onYes={() => {
        deleteEntry(entry.id);
        setConfirming(false);
        setView({ kind: 'list' });
        force((n) => n + 1);
      }}
      onNo={() => setConfirming(false)}
    />
  );
  const foot = <Foot label={text.write} icon={<QuillIcon />} onPrimary={write} plan={plan} voice={voice} />;
  const list = (selected?: string) => (
    <div className="cuerpo">
      <Days entries={entries} notice={notice} selected={selected} onOpen={open} />
    </div>
  );

  if (desk) {
    const showFirst = !entry;
    return (
      <Screen photo="maderaQuemada" veil={0.25}>
        <div className="bitacora libro libroD" style={PAPER}>
          <InkFilters />
          <BookButton back={false} onClick={close} />
          <div ref={bookRef} className={motion ? 'abierto moviendo' : 'abierto'} inert={motion ? true : undefined}>
            <div ref={turnRef} className="giro">
              {showFirst ? (
                <div className="pg izq lunasP">
                  <Patch cx={1760 - CX} />
                  <Wheel sky={sky} cx={1760 - CX} />
                  <Written sky={sky} />
                  <span className="folio">{text.folios[0]}</span>
                  <div ref={turnShadeRef} className="sombra-giro" />
                </div>
              ) : (
                <div className="pg izq">
                  <div className="velo-p" />
                  {list(entry?.id)}
                  <span className="folio">{text.folios[1]}</span>
                  {foot}
                  <div ref={turnShadeRef} className="sombra-giro" />
                </div>
              )}
              <div className="dorso" />
            </div>
            <div ref={rightRef} className="pg der">
              <div ref={rightShadeRef} className="sombra-giro" />
              <div className="velo-p" />
              {showFirst ? (
                <>
                  {list()}
                  <span className="folio">{text.folios[1]}</span>
                  {foot}
                </>
              ) : (
                <>
                  {day}
                  <span className="folio">{text.folios[2]}</span>
                </>
              )}
            </div>
            {confirm}
          </div>
          <OutsideBanner />
        </div>
      </Screen>
    );
  }

  const freeNote = plan.tier !== 'premium' && plan.offerPremium;
  const page = (
    <div ref={pageRef} className={motion ? 'bitacora libro desliza' : 'bitacora libro'} style={PAPER} inert={motion ? true : undefined}>
      <InkFilters />
      {view.kind === 'first' ? (
        <div className="hojaL">
          {/* The page as drawn, never shorter than the package's frame: on a
              phone whose browser bars eat the height, it scrolls instead of
              laying the writing under «pasar la página». */}
          <div className="hojaL-dibujo">
            <Patch cx={CX} />
            <Wheel sky={sky} cx={CX} />
            <Written sky={sky} />
            <span className="folio">{text.folios[0]}</span>
            <div className="pasar">
              <button type="button" className="tinta-1" onClick={() => setView({ kind: 'list' })}>
                {text.turnPage}
                <svg viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 6.5c6-1.5 12 .5 22-.5M18.5 2l5 4-5 4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : entry ? (
        <div className="pag">
          {day}
          {confirm}
        </div>
      ) : (
        <div className="pag">
          {list()}
          <span className={freeNote ? 'folio alto' : 'folio'}>{text.folios[1]}</span>
          {foot}
        </div>
      )}
      <BookButton back={false} onClick={close} />
      <OutsideBanner />
    </div>
  );
  // While it slides, the closed book stays underneath and moves aside.
  if (motion) {
    return (
      <>
        <div ref={sceneRef} className="bitacora-escena">
          {closedScene(ignore)}
        </div>
        {page}
      </>
    );
  }
  return (
    <Screen photo="maderaQuemada" veil={0.25}>
      {page}
    </Screen>
  );
}

export function NewJournalEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const desk = useDesk();
  const plan = usePlan();
  const premium = plan.tier === 'premium';
  const [date, setDate] = useState(localToday);
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [link, setLink] = useState<About | null>(null);
  const [linkChosen, setLinkChosen] = useState(false);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [dictated, setDictated] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const moodId = useId();
  const options = linkOptions();
  const entries = listEntries();
  const notice = noticeFor(plan);
  useBookOpen(crisisEventId === null);
  const dictation = useDictation(
    useCallback((said: string) => {
      if (!said) return;
      setDictated(true);
      setBody((current) => (current.trim() ? `${current.trimEnd()} ${said}` : said).slice(0, MAX_ENTRY_CHARS));
    }, []),
  );

  // Asked for from the days' microphone: dictation starts once premium is known.
  const askedVoice = Boolean((location.state as { voice?: boolean } | null)?.voice);
  const started = useRef(false);
  useEffect(() => {
    if (!askedVoice || started.current || !premium || !dictation.supported) return;
    started.current = true;
    dictation.start();
  }, [askedVoice, premium, dictation]);

  const toList = () => navigate(PATHS.journal, { state: { view: 'list' } });

  const save = () => {
    const value = body.trim();
    if (!value) return;
    dictation.stop();
    const verdict = detectCrisis({ texts: [value] });
    // Kept either way — it is their diary — and marked, so the memory never
    // reads an entry that raised a signal (M-01).
    addEntry({
      entryDate: date,
      body: value,
      mood,
      practiceId: link?.kind === 'practice' ? link.id : null,
      modalitySlug: link?.kind === 'therapy' ? link.slug : null,
      crisisFlagged: verdict.crisis,
      source: dictated && premium ? 'voz' : 'escrito',
    });
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'journal');
      if (verdict.severity === 'high') {
        setCrisisEventId(event.id);
        return;
      }
    }
    // Premium with consent: the memory learns from it, in the background.
    void learnFromPending();
    toList();
  };

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={activeProfile()?.draft.country}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          navigate(PATHS.journal);
        }}
        onBack={() => navigate(PATHS.journal)}
      />
    );
  }

  const isLinked = (o: About) =>
    link !== null &&
    o.kind === link.kind &&
    (o.kind === 'practice' ? o.id === (link as typeof o).id : o.slug === (link as typeof o).slug);
  const pickDate = () => {
    const input = dateRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };
  const voice = {
    supported: dictation.supported,
    listening: dictation.listening,
    onToggle: dictation.listening ? dictation.stop : dictation.start,
  };

  const page = (
    <>
      <div className="cuerpo">
        <div className="nueva mx">
          <div className="fecha">
            <p className="d">{weekdayOf(date)}</p>
            <h1 className="f tinta">{text.dayTitle(date, new Date().getFullYear())}</h1>
            <button type="button" className="cambiar" onClick={pickDate}>
              {text.changeDate}
            </button>
            <input
              ref={dateRef}
              type="date"
              className="oculto"
              aria-label={text.dateLabel}
              value={date}
              max={localToday()}
              onChange={(e) => setDate(e.target.value || localToday())}
            />
            <p className="paviso">{notice}</p>
          </div>
          <Flor />
          <textarea
            className="escribe tinta"
            aria-label={text.bodyLabel}
            rows={5}
            maxLength={MAX_ENTRY_CHARS}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={text.placeholder}
          />
          <div className="campo">
            <p className="q" id={moodId}>
              {text.moodQuestion}
            </p>
            <div className="lunas-g">
              <span className="ex" aria-hidden="true">
                {text.moodLow}
              </span>
              <span className="ls" role="radiogroup" aria-labelledby={moodId}>
                {MOODS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={mood === n}
                    aria-label={text.moodLabel(n)}
                    className={mood !== null && n <= mood ? 'luna ll' : 'luna'}
                    onClick={() => setMood(mood === n ? null : n)}
                  />
                ))}
              </span>
              <span className="ex" aria-hidden="true">
                {text.moodHigh}
              </span>
            </div>
          </div>
          {options.length > 0 && (
            <div className="campo">
              <p className="q">{text.linkLabel}</p>
              <div className="chips">
                {options.map((o) => {
                  const on = isLinked(o);
                  return (
                    <button
                      key={o.kind === 'practice' ? o.id : o.slug}
                      type="button"
                      aria-pressed={on}
                      className={on ? 'bchip on' : 'bchip'}
                      onClick={() => {
                        setLinkChosen(true);
                        setLink(on ? null : o);
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={linkChosen && link === null}
                  className={linkChosen && link === null ? 'bchip on' : 'bchip'}
                  onClick={() => {
                    setLinkChosen(true);
                    setLink(null);
                  }}
                >
                  {text.linkNone}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Foot label={text.save} onPrimary={save} disabled={!body.trim()} plan={plan} voice={voice} />
    </>
  );

  if (desk) {
    return (
      <Screen photo="maderaQuemada" veil={0.25}>
        <div className="bitacora libro libroD" style={PAPER}>
          <InkFilters />
          <BookButton back={false} onClick={() => navigate(PATHS.journal)} />
          <div className="abierto">
            <div className="pg izq">
              <div className="velo-p" />
              <div className="cuerpo">
                <Days
                  entries={entries}
                  notice={notice}
                  onOpen={(id) => navigate(PATHS.journal, { state: { view: 'day', id } })}
                />
              </div>
              <span className="folio">{text.folios[1]}</span>
              <Foot
                label={text.write}
                icon={<QuillIcon />}
                onPrimary={() => undefined}
                plan={plan}
                voice={{ supported: dictation.supported, listening: false, onToggle: voice.onToggle }}
              />
            </div>
            <div className="pg der">
              <div className="velo-p" />
              {page}
            </div>
          </div>
          <OutsideBanner />
        </div>
      </Screen>
    );
  }

  return (
    <Screen photo="maderaQuemada" veil={0.25}>
      <div className="bitacora libro" style={PAPER}>
        <InkFilters />
        <div className="pag">{page}</div>
        <BookButton back onClick={toList} />
        <OutsideBanner />
      </div>
    </Screen>
  );
}
