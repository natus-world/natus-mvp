import type { KeyboardEvent } from 'react';
import { Glyph } from '@/design/ChartWheel';
import { RETROGRADE_GLYPH } from '@/design/planet-glyphs';
import { SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';
import { spreadApart } from '@/design/spread';

/**
 * The wheel of the full chart (package 05, figure approved 15 Oct 2026):
 * the package's own drawing, at its numbers, in its 400-unit box, with the
 * selection it added — what is chosen stays in full ink with a thin ring,
 * what has nothing to do with it drops to 35 % (lines to 12 %).
 *
 * `large` is the phone's figure (the package's `R`): every fifth degree
 * ticked, bigger glyphs and no degrees. The desktop's is the finer one, every
 * degree ticked and each point's degree beside it.
 *
 * The thread between the Sun and the Moon is the only gold. Every glyph is an
 * outline: the app never sets one as a character.
 */

const SIGN_ORDER: GlyphSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const GOLD = '#C9A876';
const INK = '#ECE2D0';
const WHITE = '#F5EFE6';
const NIGHT = '#0B120E';
const ink = (alpha: number) => `rgba(236,226,208,${alpha})`;
const C = 200;

export type WheelGlyph = { d: string; advance: number; evenOdd?: boolean };

export type WheelPoint = {
  id: string;
  /** For a screen reader: «Sol en Géminis, 18°». */
  label: string;
  glyph: WheelGlyph;
  longitude: number;
  degree: number;
  retrograde: boolean;
};

export type WheelAxis = {
  id: string;
  label: string;
  /** «AC», «DC», «MC», «FC». */
  text: string;
  longitude: number;
  /** The horizon (AC–DC) is drawn stronger than the meridian. */
  strong: boolean;
};

export type WheelAspect = {
  id: string;
  a: string;
  b: string;
  aLongitude: number;
  bLongitude: number;
  label: string;
  /** The Sun–Moon thread: the one gold line. */
  thread: boolean;
};

type Props = {
  label: string;
  signs: Record<string, string>;
  large: boolean;
  simple: boolean;
  /** Null without the hour of birth: no axes, no houses, Aries on the left. */
  ascendant: number | null;
  points: WheelPoint[];
  axes: WheelAxis[];
  aspects: WheelAspect[];
  selected: string | null;
  selectedAspect: string | null;
  onPoint: (id: string) => void;
  onAspect: (id: string) => void;
};

function activate(run: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      run();
    }
  };
}

export function FullChartWheel({
  label,
  signs,
  large: R,
  simple,
  ascendant,
  points,
  axes,
  aspects,
  selected,
  selectedAspect,
  onPoint,
  onAspect,
}: Props) {
  const withTime = ascendant !== null;
  const base = ascendant ?? 0;
  const fs = { sig: R ? 21 : 15, pl: R ? (simple ? 27 : 22) : 17, eje: R ? 12 : 8, casa: R ? 10 : 7.5, deg: 7 };

  const theta = (l: number) => ((180 - (l - base)) * Math.PI) / 180;
  const P = (r: number, l: number): [number, number] => {
    const t = theta(l);
    return [C + r * Math.cos(t), C + r * Math.sin(t)];
  };
  const line = (a: [number, number], b: [number, number]) => ({
    x1: a[0].toFixed(2),
    y1: a[1].toFixed(2),
    x2: b[0].toFixed(2),
    y2: b[1].toFixed(2),
  });

  const any = selected !== null || selectedAspect !== null;
  const inSelectedAspect = (id: string) => selectedAspect !== null && selectedAspect.split('|').includes(id);
  const relatedToSelected = (id: string) =>
    selected !== null && aspects.some((x) => (x.a === selected && x.b === id) || (x.b === selected && x.a === id));

  // Glyphs that fall too close are spread apart; the mark keeps the real degree.
  const MIN = R ? (simple ? 14 : 12.5) : 11;
  const shown = spreadApart(
    points.map((p) => ({ id: p.id, d: p.longitude })),
    MIN,
  );

  const ticks: [number, number, number][] = [];
  for (let g = 0; g < 360; g++) {
    if (R && g % 5) continue;
    ticks.push([g, g % 10 === 0 ? 7 : g % 5 === 0 ? 4.5 : 2.6, g % 10 === 0 ? 0.55 : g % 5 === 0 ? 0.4 : 0.28]);
  }
  const firstHouseSign = Math.floor(base / 30);

  return (
    <svg viewBox="-16 -16 432 432" role="group" aria-label={label}>
      <circle cx={C} cy={C} r={196} fill="none" stroke={ink(0.6)} strokeWidth={R ? 1 : 0.8} />
      <circle cx={C} cy={C} r={164} fill="none" stroke={ink(0.45)} strokeWidth={R ? 0.9 : 0.7} />
      {withTime && <circle cx={C} cy={C} r={138} fill="none" stroke={ink(0.2)} strokeWidth={0.6} />}
      <circle cx={C} cy={C} r={86} fill="none" stroke={ink(0.24)} strokeWidth={0.6} />

      <g aria-hidden="true">
        {ticks.map(([g, len, op]) => (
          <line key={g} {...line(P(164, g), P(164 - len, g))} stroke={ink(op)} strokeWidth={R ? 0.8 : 0.55} />
        ))}
        {SIGN_ORDER.map((sign, i) => {
          const [x, y] = P(180, i * 30 + 15);
          const glyph = SIGN_GLYPHS[sign];
          return (
            <g key={sign}>
              <line {...line(P(164, i * 30), P(196, i * 30))} stroke={ink(0.32)} strokeWidth={0.6} />
              <Glyph d={glyph.d} advance={glyph.advance} x={x} y={y} size={fs.sig} fill={ink(0.9)} title={signs[sign]} />
            </g>
          );
        })}
        {withTime &&
          Array.from({ length: 12 }, (_, h) => {
            const [x, y] = P(151, (firstHouseSign + h) * 30 + 15);
            return (
              <text
                key={h}
                className="casa"
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs.casa}
                fill={ink(0.5)}
              >
                {h + 1}
              </text>
            );
          })}
      </g>

      {axes.map((axis) => {
        const on = selected === axis.id;
        const dim = any && !on && !inSelectedAspect(axis.id);
        const [x, y] = P(R ? 218 : 214, axis.longitude);
        const color = ink(axis.strong ? 0.95 : 0.6);
        return (
          <g
            key={axis.id}
            className="toca"
            opacity={dim ? 0.35 : 1}
            role="button"
            tabIndex={0}
            aria-label={axis.label}
            aria-pressed={on}
            onClick={() => onPoint(axis.id)}
            onKeyDown={activate(() => onPoint(axis.id))}
          >
            <line
              {...line(P(axis.strong ? 86 : 138, axis.longitude), P(206, axis.longitude))}
              stroke={color}
              strokeWidth={on ? 1.8 : axis.strong ? (R ? 1.3 : 1) : 0.7}
            />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={12} fill="transparent" />
            <text
              className={on ? 'eje-t on' : 'eje-t'}
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fs.eje}
              fill={color}
            >
              {axis.text}
            </text>
          </g>
        );
      })}

      {aspects.map((x) => {
        const on = selectedAspect === x.id;
        const rel = selected !== null && (x.a === selected || x.b === selected);
        const dim = any && !on && !rel;
        const color = x.thread ? GOLD : ink(on || rel ? 0.95 : 0.34);
        const width = on ? (R ? 2 : 1.5) : x.thread ? (R ? 1.4 : 1) : rel ? (R ? 1.2 : 0.9) : R ? 0.8 : 0.6;
        const ends = line(P(86, x.aLongitude), P(86, x.bLongitude));
        return (
          <g
            key={x.id}
            className="toca"
            opacity={dim ? 0.12 : 1}
            role="button"
            tabIndex={0}
            aria-label={x.label}
            aria-pressed={on}
            onClick={() => onAspect(x.id)}
            onKeyDown={activate(() => onAspect(x.id))}
          >
            <line {...ends} stroke="transparent" strokeWidth={8} />
            <line {...ends} stroke={color} strokeWidth={width} />
          </g>
        );
      })}

      {points.map((p) => {
        const d = shown.get(p.id) ?? p.longitude;
        const rr = R ? 116 : 120;
        const [cx, cy] = P(rr, d);
        const [lx, ly] = P(R ? 92 : 101, d);
        const [dx, dy] = P(86, p.longitude);
        const on = selected === p.id;
        const dim = any && !on && !inSelectedAspect(p.id) && !relatedToSelected(p.id);
        const degree = `${Math.floor(p.degree)}°`;
        // The degree is centred with its ℞, which is drawn as an outline beside it.
        const rxSize = fs.deg * 0.9;
        const rxWidth = p.retrograde ? (RETROGRADE_GLYPH.advance * rxSize) / 1000 : 0;
        const textWidth = degree.length * fs.deg * 0.5;
        return (
          <g
            key={p.id}
            className="toca"
            opacity={dim ? 0.35 : 1}
            role="button"
            tabIndex={0}
            aria-label={p.label}
            aria-pressed={on}
            onClick={() => onPoint(p.id)}
            onKeyDown={activate(() => onPoint(p.id))}
          >
            <line {...line(P(164, p.longitude), P(157, p.longitude))} stroke={INK} strokeWidth={R ? 1.2 : 0.9} />
            <line
              {...line(P(withTime ? 138 : 164, p.longitude), P(rr + (R ? 17 : 12), d))}
              stroke={ink(0.35)}
              strokeWidth={0.5}
            />
            {on && (
              <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={R ? 17 : 13} fill="none" stroke={INK} strokeWidth={0.8} />
            )}
            <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={R ? 16 : 12} fill="transparent" />
            <Glyph
              d={p.glyph.d}
              advance={p.glyph.advance}
              x={cx}
              y={cy}
              size={fs.pl}
              fill={WHITE}
              halo={R ? 5 : 4}
              evenOdd={p.glyph.evenOdd ?? false}
            />
            {!R && (
              <g className="grado">
                <text
                  x={(lx - rxWidth / 2).toFixed(2)}
                  y={ly.toFixed(2)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fs.deg}
                  fill={ink(0.66)}
                  stroke={NIGHT}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {degree}
                </text>
                {p.retrograde && (
                  <Glyph
                    d={RETROGRADE_GLYPH.d}
                    advance={RETROGRADE_GLYPH.advance}
                    x={lx - rxWidth / 2 + textWidth / 2 + rxWidth / 2 + 0.3}
                    y={ly}
                    size={rxSize}
                    fill={ink(0.66)}
                    halo={1.5}
                  />
                )}
              </g>
            )}
            <circle cx={dx.toFixed(2)} cy={dy.toFixed(2)} r={R ? 2.4 : 1.7} fill={INK} />
          </g>
        );
      })}
    </svg>
  );
}
