import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { PLANET_GLYPHS } from '@/design/planet-glyphs';
import { SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';
import { useTakeover } from '@/components/takeover';
import { PATHS } from '@/components/routes';
import { hasBirthTime } from '@/astrology/natal-chart';
import { buildNatalChart, SIGNS, type NatalChart } from '@/lib/natal-chart';
import { activeProfile } from '@/store/account';
import { accountRequired } from '@/store/account-required';
import { CARE_PATH } from '@/store/care';
import { currentSynthesis, type StoredSynthesis } from '@/store/soulMap';
import {
  endRevelation,
  markWelcomeOfferDue,
  revelationPending,
  startRevelation,
  takeReopenedRevelation,
} from '@/store/revelation';
import { copy } from '@/i18n';
import { leadSentences, PREVIEW_SENTENCES } from './revelation-preview';

/**
 * The revelation of the map (package 02, option B «Un punto de luz», chosen
 * by Nico, 16 Oct 2026). Seen once, right after «Generando», and since the
 * reorder of 20–21 Oct 2026 it is the preview that comes before the account:
 * each reading shows its first sentence and fades into lines that carry none
 * of the rest — the full text is not on the page — and every way out leads to
 * «Guarda tu mapa», or to «Cómo trabajar» for somebody who already has an
 * account. Premium's welcome offer no longer opens here; it comes after
 * «Para cuidarte».
 *
 * Under the starry sky of Carta since 21 Oct 2026 (owner; the package drew a
 * plain night), on desktop in two columns.
 * A point of light is born in the centre, the ring of the chart is drawn from
 * it, the signs appear, the light settles on the Sun and the gold thread
 * reaches the Moon; then the trio, the five numbers and the three readings,
 * one by one, and «Continuar →». With reduced motion, the final state at once.
 *
 * It lives in front of Carta: `RevealFirst` shows it while the current map is
 * the one waiting to be revealed, and Carta after that.
 */

const text = copy.soulMap;
const NUMBER_ORDER = ['life_path', 'expression', 'soul_urge', 'personality', 'birthday'] as const;
const SECTIONS = Object.keys(text.sections) as (keyof typeof text.sections)[];

export function RevealFirst({ children }: { children: ReactNode }) {
  const stored = currentSynthesis();
  // Back from «Guarda tu mapa»: the same preview, still.
  const [again] = useState(() => takeReopenedRevelation());
  const [open, setOpen] = useState(() => again || revelationPending(stored?.id));
  // Cleared as it opens, so closing the app on it does not bring it back.
  useEffect(() => {
    if (open) startRevelation();
    return () => endRevelation();
  }, [open]);
  if (open && stored) {
    return (
      <Revelation
        stored={stored}
        still={again}
        onSeen={() => {
          endRevelation();
          setOpen(false);
        }}
      />
    );
  }
  return <>{children}</>;
}

function readChart(): NatalChart | null {
  const draft = activeProfile()?.draft;
  const stored = draft?.natal_chart;
  if (!draft || !stored || stored.parse_status !== 'parsed') return null;
  try {
    return buildNatalChart(stored.context, hasBirthTime(draft));
  } catch {
    return null;
  }
}

export function Revelation({
  stored,
  still = false,
  onSeen,
}: {
  stored: StoredSynthesis;
  /** Seen before in this visit: the final state at once. */
  still?: boolean;
  onSeen: () => void;
}) {
  useTakeover();
  const navigate = useNavigate();
  // Read once: the way out is decided by whether the account is still owed.
  const [toSave] = useState(() => accountRequired());
  const goOn = useCallback(() => {
    markWelcomeOfferDue();
    onSeen();
    if (toSave) navigate('/registro');
    else navigate(CARE_PATH, { state: { next: PATHS.paths } });
  }, [onSeen, navigate, toSave]);
  const root = useRef<HTMLDivElement>(null);
  const chart = useMemo(readChart, []);
  const firstName = (activeProfile()?.draft.legal_birth_name ?? '').trim().split(/\s+/)[0] ?? '';
  const { synthesis, numerology } = stored;

  const signOf = (name: string) => {
    const sign = chart?.points.find((p) => p.name === name)?.sign;
    return sign ? (copy.chat.signs[sign] ?? sign) : null;
  };
  const sun = signOf('Sun');
  const moon = signOf('Moon');
  const ascendant = chart?.ascendant ? (copy.chat.signs[chart.ascendant.sign] ?? chart.ascendant.sign) : null;
  const trio = [
    [sun, text.trio.sun],
    [moon, text.trio.moon],
    [ascendant, text.trio.ascendant],
  ].filter((entry): entry is [string, string] => entry[0] !== null);

  const sunAt = chart ? wheelPoint(chart, 'Sun') : null;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (still || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const running = play(el, sunAt);
    return () => {
      for (const animation of running) animation.cancel();
    };
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // The starry sky of Carta, on the phone and on desktop (owner, 21 Oct 2026).
    <Screen photo="cieloEstrellas" veil={0.25} glassAlpha={0.32}>
      <div ref={root} className="pz revelacion">
        <div className="halo" aria-hidden="true" />
        <div className="cont">
          <p className="k el-k">{text.kicker}</p>
          <h1 className="t el-t">
            {firstName ? text.titleWithName(firstName) : text.titleWithoutName}
            <em>{text.titleEmphasis}</em>
          </h1>

          <div className="rueda">
            <span className="luz" aria-hidden="true" />
            <Wheel chart={chart} label={text.wheelLabel(sun, moon, ascendant)} />
          </div>

          {trio.length > 0 && (
            <div className="trio el-trio">
              {trio.map(([sign, label]) => (
                <div key={label}>
                  <b>{sign}</b>
                  {label}
                </div>
              ))}
            </div>
          )}

          {numerology && (
            <div className="nums">
              {NUMBER_ORDER.map((key) => (
                <div key={key} className="el-n">
                  <b>{numerology[key]}</b>
                  <span aria-hidden="true">{copy.revelation.numbers[key]}</span>
                  <span className="sr-only">{copy.practice.numberLabels[key]}</span>
                </div>
              ))}
            </div>
          )}

          <div className="vid">
            {SECTIONS.map((key) => (
              <button key={key} type="button" className="fila el-l" onClick={goOn}>
                <span>
                  <span className="ft">{text.sections[key]}</span>
                  <span className="fd">{leadSentences(synthesis.soul_map_synthesis[key], PREVIEW_SENTENCES[key])}</span>
                  {/* What follows, faded: lines with none of the text in them. */}
                  <span className="sigue" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                </span>
                <span className="chev" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pie el-pie">
          {toSave && <p className="guarda">{copy.revelation.saveLine}</p>}
          <button type="button" className="p1" onClick={goOn}>
            {toSave ? copy.revelation.save : copy.common.continue}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ── The wheel, in the package's 220-unit box ─────────────────────────────

const C = 110;
const INK = '#ECE2D0';
const ink = (alpha: number) => `rgba(236,226,208,${alpha})`;
/** Sun and Moon closer than this, in degrees, are drawn apart. */
const MIN_GAP = 22;

/** Longitude to the package's angle: the Ascendant on the left, signs counterclockwise. */
function baseOf(chart: NatalChart | null): number {
  const ascendant = chart?.points.find((p) => p.name === 'Ascendant');
  return chart?.ascendant && ascendant ? ascendant.longitude : 0;
}

function at(base: number, r: number, longitude: number): [number, number] {
  const t = ((180 - (longitude - base)) * Math.PI) / 180;
  return [C + r * Math.cos(t), C + r * Math.sin(t)];
}

/** Where the Sun and the Moon are drawn: their longitudes, spread when they crowd. */
function spread(chart: NatalChart): Map<string, number> {
  const sun = chart.points.find((p) => p.name === 'Sun')?.longitude;
  const moon = chart.points.find((p) => p.name === 'Moon')?.longitude;
  const out = new Map<string, number>();
  if (sun === undefined) return out;
  out.set('Sun', sun);
  if (moon === undefined) return out;
  const gap = ((moon - sun + 540) % 360) - 180;
  if (Math.abs(gap) < MIN_GAP) {
    const push = (MIN_GAP - Math.abs(gap)) / 2;
    const sign = gap >= 0 ? 1 : -1;
    out.set('Sun', sun - sign * push);
    out.set('Moon', moon + sign * push);
  } else {
    out.set('Moon', moon);
  }
  return out;
}

/** The Sun's place in the box, as fractions of it, for the light to settle on. */
function wheelPoint(chart: NatalChart, name: string): [number, number] | null {
  const longitude = spread(chart).get(name);
  if (longitude === undefined) return null;
  const [x, y] = at(baseOf(chart), 62, longitude);
  return [x / 220, y / 220];
}

type GlyphProps = { d: string; advance: number; x: number; y: number; size: number; fill: string; drop: number };

function Glyph({ d, advance, x, y, size, fill, drop }: GlyphProps) {
  const s = size / 1000;
  // As the package set its text: centred on the advance, the baseline `drop`
  // below the point (3.6 under a sign of 10, 3.4 under a planet of 9).
  const tx = x - (advance * s) / 2;
  const ty = y + drop;
  // Even-odd, so the Sun's ring stays open around its point.
  return (
    <path
      d={d}
      transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s} ${-s})`}
      fill={fill}
      fillRule="evenodd"
    />
  );
}

function Wheel({ chart, label }: { chart: NatalChart | null; label: string }) {
  const base = baseOf(chart);
  const P = (r: number, l: number) => at(base, r, l);
  const xy = (a: [number, number], b: [number, number]) => ({
    x1: a[0].toFixed(2),
    y1: a[1].toFixed(2),
    x2: b[0].toFixed(2),
    y2: b[1].toFixed(2),
  });

  const shown = chart ? spread(chart) : new Map<string, number>();
  const points = (['Sun', 'Moon'] as const).flatMap((name) => {
    const l = shown.get(name);
    return l === undefined ? [] : [{ name, at: P(62, l) }];
  });
  const sunMoon = points.length === 2 ? points : null;
  // The gold thread is the Sun and the Moon in aspect, by sign, as on Carta.
  const thread =
    sunMoon &&
    chart?.aspects.some(
      (a) => a.type !== 'conjunction' && [a.a, a.b].sort().join('|') === 'Moon|Sun',
    );
  const withAscendant = chart?.ascendant != null;

  return (
    <svg viewBox="0 0 220 220" role="img" aria-label={label}>
      <circle
        className="anillo"
        cx={C}
        cy={C}
        r={100}
        fill="none"
        stroke={ink(0.55)}
        pathLength={1}
        strokeDasharray="1"
        transform={`rotate(-90 ${C} ${C})`}
      />
      <circle className="d1" cx={C} cy={C} r={78} fill="none" stroke={ink(0.25)} pathLength={1} strokeDasharray="1" />
      <circle className="d1" cx={C} cy={C} r={46} fill="none" stroke={ink(0.14)} pathLength={1} strokeDasharray="1" />

      {SIGNS.map((sign, i) => {
        const [x, y] = P(89, i * 30 + 15);
        const glyph = SIGN_GLYPHS[sign as GlyphSign];
        return (
          <g key={sign}>
            <line className="tick" {...xy(P(78, i * 30), P(100, i * 30))} stroke={ink(0.25)} />
            <g className="sig">
              <Glyph d={glyph.d} advance={glyph.advance} x={x} y={y} size={10} fill={ink(0.7)} drop={3.6} />
            </g>
          </g>
        );
      })}

      {withAscendant && (
        <>
          <line className="eje" {...xy(P(108, base), P(46, base))} stroke={INK} pathLength={1} strokeDasharray="1" />
          <text className="eje-t" x={(P(108, base)[0] + 4).toFixed(2)} y={(P(108, base)[1] - 5).toFixed(2)} fontSize={7.5} fill={INK}>
            {text.wheelAxes.ac}
          </text>
        </>
      )}

      {sunMoon && thread && (
        <line
          className="asp"
          {...xy(sunMoon[0]!.at, sunMoon[1]!.at)}
          stroke="#C9A876"
          strokeWidth={0.8}
          pathLength={1}
          strokeDasharray="1"
        />
      )}

      {points.map(({ name, at: [x, y] }) => {
        const glyph = PLANET_GLYPHS[name];
        return (
          <g key={name} className="punto">
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={11} fill="rgba(255,236,205,.10)" />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={7.5} fill="#0B120E" stroke={ink(0.85)} />
            <Glyph d={glyph.d} advance={glyph.advance} x={x} y={y} size={9} fill={INK} drop={3.4} />
          </g>
        );
      })}
    </svg>
  );
}

// ── The movement (package 02, `jugarB`) ──────────────────────────────────

const EASE = 'cubic-bezier(.16,1,.3,1)';
const TRAZO = 'cubic-bezier(.65,0,.35,1)';
const LINEA = 'cubic-bezier(.22,1,.36,1)';

function play(root: HTMLElement, sunAt: [number, number] | null): Animation[] {
  const out: Animation[] = [];
  const all = (selector: string) => Array.from(root.querySelectorAll<Element>(selector));
  const A = (el: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (el) out.push(el.animate(frames, { fill: 'both', easing: EASE, ...options }));
  };

  // Everything starts hidden: the night, and the halo coming up.
  for (const e of all('.el-k, .el-t, .el-trio, .el-n, .el-l, .el-pie, .cont > .vid')) A(e, [{ opacity: 0 }], { duration: 1 });
  for (const e of all('.anillo, .d1, .eje, .asp')) A(e, [{ strokeDashoffset: 1 }], { duration: 1 });
  for (const e of all('.tick, .sig, .eje-t, .punto')) A(e, [{ opacity: 0 }], { duration: 1 });
  A(root.querySelector('.halo'), [{ opacity: 0 }, { opacity: 1 }], { duration: 1400 });

  // A point of light is born in the centre, and settles on the Sun.
  const light = root.querySelector('.luz');
  A(
    light,
    [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(0)' },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
    ],
    { delay: 400, duration: 1400 },
  );
  const to = sunAt ? { left: `${(sunAt[0] * 100).toFixed(2)}%`, top: `${(sunAt[1] * 100).toFixed(2)}%` } : {};
  A(
    light,
    [
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', left: '50%', top: '50%' },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.2)', left: '50%', top: '50%', ...to },
    ],
    { delay: 2600, duration: 1600 },
  );

  A(root.querySelector('.el-k'), [{ opacity: 0 }, { opacity: 1 }], { delay: 1200, duration: 900 });
  A(
    root.querySelector('.el-t'),
    [
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'none' },
    ],
    { delay: 1400, duration: 1100 },
  );

  // The light draws the ring; the signs, the axis, the Sun and the Moon.
  const t0 = 1900;
  A(root.querySelector('.anillo'), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: t0, duration: 1400, easing: TRAZO });
  all('.d1').forEach((e, i) =>
    A(e, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: t0 + 500 + i * 150, duration: 900, easing: TRAZO }),
  );
  all('.tick').forEach((e, i) => A(e, [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + 700 + i * 45, duration: 500 }));
  all('.sig').forEach((e, i) =>
    A(
      e,
      [
        { opacity: 0, transform: 'translateY(2px)' },
        { opacity: 1, transform: 'none' },
      ],
      { delay: t0 + 800 + i * 55, duration: 600 },
    ),
  );
  A(root.querySelector('.eje'), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: t0 + 1500, duration: 700, easing: LINEA });
  A(root.querySelector('.eje-t'), [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + 1900, duration: 500 });
  all('.punto').forEach((e, i) =>
    A(
      e,
      [
        { opacity: 0, transform: 'scale(.6)' },
        { opacity: 1, transform: 'none' },
      ],
      { delay: t0 + 2100 + i * 350, duration: 700 },
    ),
  );
  A(root.querySelector('.asp'), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: t0 + 2700, duration: 900, easing: LINEA });

  // The rest enters as in A: the trio, the numbers, the readings, «Continuar».
  const t = t0 + 3500;
  const rise = (px: number): Keyframe[] => [
    { opacity: 0, transform: `translateY(${px}px)` },
    { opacity: 1, transform: 'none' },
  ];
  A(root.querySelector('.el-trio'), rise(10), { delay: t, duration: 800 });
  all('.el-n').forEach((e, i) => A(e, rise(10), { delay: t + 300 + i * 90, duration: 800 }));
  A(root.querySelector('.cont > .vid'), [{ opacity: 0 }, { opacity: 1 }], { delay: t + 700, duration: 700 });
  all('.el-l').forEach((e, i) => A(e, rise(14), { delay: t + 900 + i * 450, duration: 900 }));
  A(root.querySelector('.el-pie'), [{ opacity: 0 }, { opacity: 1 }], { delay: t + 2500, duration: 800 });

  return out;
}
