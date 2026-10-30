import type { ReactElement } from 'react';
import { Glyph } from '@/design/ChartWheel';
import { PLANET_GLYPHS, RETROGRADE_GLYPH } from '@/design/planet-glyphs';
import { SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';
import { spreadApart } from '@/design/spread';

/**
 * «La carta» of the comparison with both charts whole (owner, 23 Oct 2026;
 * mockup `las-dos-cartas/1-la-carta-dos-ruedas`, section 1, and option A of
 * `3-opciones-y-celular-dos-ruedas` for the phone): the mockup's own wheel at
 * its numbers — signs, houses (Placidus or whole sign, as the reader chose in
 * the full chart, owner 30 Oct 2026), the four axes, the ten planets —
 * side by side on desktop with each degree, one over the other on the phone.
 *
 * The aspect chosen in the list below lights its two points with a ring and
 * joins them with a thread: solid when it flows, dashed when it asks for
 * more work. Everything else drops to half.
 */

const INK = '#ECE2D0';
const ink = (alpha: number) => `rgba(236,226,208,${alpha})`;

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

/** The ten planets, in the mockup's order. */
export const WHEEL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
type Planet = (typeof WHEEL_PLANETS)[number];

export type WheelChartPoint = { id: string; longitude: number; degree: number; retrograde: boolean };

export type WheelChart = {
  name: string;
  /** Ecliptic longitude of the Ascendant and the Midheaven; null without the hour. */
  ascendant: number | null;
  midheaven: number | null;
  /** The Placidus cusps, house 1 first, as longitudes. Null: houses by whole sign. */
  cusps?: number[] | null;
  points: WheelChartPoint[];
};

type Placed = Record<string, { glyph: [number, number] }>;

function oneWheel(
  chart: WheelChart,
  cx: number,
  cy: number,
  R: number,
  degrees: boolean,
  selected: string | null,
): { node: ReactElement; placed: Placed } {
  const base = chart.ascendant ?? 0;
  const withTime = chart.ascendant !== null;
  const theta = (l: number) => ((180 - (l - base)) * Math.PI) / 180;
  const P = (r: number, l: number): [number, number] => [cx + r * Math.cos(theta(l)), cy + r * Math.sin(theta(l))];
  const line = (a: [number, number], b: [number, number]) => ({
    x1: a[0].toFixed(2),
    y1: a[1].toFixed(2),
    x2: b[0].toFixed(2),
    y2: b[1].toFixed(2),
  });
  const rS = R - R * 0.13;
  const r0 = R * 0.42;
  const rp = R * 0.68;
  const esc = R / 200;
  const firstHouse = Math.floor(base / 30);
  const cusps = withTime ? (chart.cusps ?? null) : null;

  const planets = chart.points.filter((p) => (WHEEL_PLANETS as readonly string[]).includes(p.id));
  const shown = spreadApart(
    planets.map((p) => ({ id: p.id, d: p.longitude })),
    13,
  );
  const placed: Placed = {};
  const ticks: number[] = [];
  for (let d = 0; d < 360; d += 5) ticks.push(d);
  const axes: [string, number, boolean][] = withTime
    ? [
        ['AC', chart.ascendant!, true],
        ['DC', chart.ascendant! + 180, true],
        ...(chart.midheaven !== null
          ? ([
              ['MC', chart.midheaven, false],
              ['FC', chart.midheaven + 180, false],
            ] as [string, number, boolean][])
          : []),
      ]
    : [];

  // The Ascendant has no glyph: an aspect to it is drawn to its «AC».
  if (chart.ascendant !== null) placed['Ascendant'] = { glyph: P(R + 17 * esc, chart.ascendant) };

  const node = (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={ink(0.55)} strokeWidth={0.9} />
      <circle cx={cx} cy={cy} r={rS} fill="none" stroke={ink(0.4)} strokeWidth={0.7} />
      <circle cx={cx} cy={cy} r={r0} fill="none" stroke={ink(0.2)} strokeWidth={0.6} />
      <g aria-hidden="true">
        {SIGN_ORDER.map((sign, s) => {
          const [x, y] = P((R + rS) / 2, s * 30 + 15);
          const glyph = SIGN_GLYPHS[sign];
          const [hx, hy] = P(rS - 11 * esc, s * 30 + 15);
          return (
            <g key={sign}>
              <line
                {...line(P(R, s * 30), P(withTime && !cusps ? r0 : rS, s * 30))}
                stroke={ink(withTime && !cusps && s === firstHouse ? 0 : 0.16)}
                strokeWidth={0.6}
              />
              <Glyph d={glyph.d} advance={glyph.advance} x={x} y={y} size={15 * esc} fill={ink(0.8)} />
              {withTime && !cusps && (
                <text
                  x={hx.toFixed(2)}
                  y={hy.toFixed(2)}
                  fontSize={8.5 * esc}
                  fill={ink(0.45)}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {((s - firstHouse + 12) % 12) + 1}
                </text>
              )}
            </g>
          );
        })}
        {cusps?.map((c, h) => {
          const next = cusps[(h + 1) % 12]!;
          const [hx, hy] = P(rS - 11 * esc, c + ((((next - c) % 360) + 360) % 360) / 2);
          return (
            <g key={`c${h}`}>
              {/* The first cusp is the Ascendant, drawn as an axis. */}
              {h !== 0 && <line {...line(P(rS, c), P(r0, c))} stroke={ink(0.16)} strokeWidth={0.6} />}
              <text
                x={hx.toFixed(2)}
                y={hy.toFixed(2)}
                fontSize={8.5 * esc}
                fill={ink(0.45)}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {h + 1}
              </text>
            </g>
          );
        })}
        {ticks.map((d) => (
          <line key={d} {...line(P(rS, d), P(rS - (d % 10 ? 2.5 : 4.5) * esc, d))} stroke={ink(0.35)} strokeWidth={0.5} />
        ))}
        {axes.map(([label, l, strong]) => {
          const [x, y] = P(R + 17 * esc, l);
          return (
            <g key={label}>
              <line {...line(P(R + 8 * esc, l), P(r0, l))} stroke={strong ? INK : ink(0.6)} strokeWidth={strong ? 1 : 0.8} />
              {label === 'AC' && selected === 'Ascendant' && (
                <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={14} fill="none" stroke={INK} strokeWidth={1} />
              )}
              <text
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                fontSize={8 * esc}
                letterSpacing=".08em"
                fill={ink(0.7)}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>
      {planets.map((p) => {
        const d = shown.get(p.id) ?? p.longitude;
        const gp = P(rp, d);
        const dp = P(r0, p.longitude);
        const on = selected === p.id;
        placed[p.id] = { glyph: gp };
        const glyph = PLANET_GLYPHS[p.id as Planet];
        const degree = `${Math.floor(p.degree)}°`;
        const [qx, qy] = P(rp - 17 * esc, d);
        const degSize = 6.5 * esc;
        const rx = p.retrograde ? (RETROGRADE_GLYPH.advance * degSize * 0.9) / 1000 : 0;
        return (
          <g key={p.id} opacity={selected === null || on ? 1 : 0.5}>
            <line {...line(P(rS, p.longitude), P(rS - 6 * esc, p.longitude))} stroke={INK} strokeWidth={0.9} />
            <line {...line(P(rS - 6 * esc, p.longitude), P(rp + 11 * esc, d))} stroke={ink(0.25)} strokeWidth={0.5} />
            {on && <circle cx={gp[0].toFixed(2)} cy={gp[1].toFixed(2)} r={14} fill="none" stroke={INK} strokeWidth={1} />}
            <Glyph
              d={glyph.d}
              advance={glyph.advance}
              x={gp[0]}
              y={gp[1]}
              size={17 * esc}
              fill={INK}
              halo={3.5 * esc}
              evenOdd={p.id === 'Sun'}
            />
            <circle cx={dp[0].toFixed(2)} cy={dp[1].toFixed(2)} r={1.8 * esc} fill={INK} />
            {degrees && (
              <g>
                <text
                  x={(qx - rx / 2).toFixed(2)}
                  y={qy.toFixed(2)}
                  fontSize={degSize}
                  fill={ink(0.6)}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {degree}
                </text>
                {p.retrograde && (
                  <Glyph
                    d={RETROGRADE_GLYPH.d}
                    advance={RETROGRADE_GLYPH.advance}
                    x={qx - rx / 2 + (degree.length * degSize * 0.5) / 2 + rx / 2 + 0.3}
                    y={qy}
                    size={degSize * 0.9}
                    fill={ink(0.6)}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
  return { node, placed };
}

type Props = {
  /** The left (or upper) chart and the right (or lower) one. */
  left: WheelChart;
  right: WheelChart;
  /** The phone's figure: one over the other, no degrees, names inside the figure. */
  stacked: boolean;
  /** «FRANCISCA · TÚ» and «TOMÁS» on the phone. */
  leftLabel: string;
  rightLabel: string;
  label: string;
  /** The points the chosen aspect joins, one in each chart, and whether it flows. */
  chosen: { left: string; right: string; flows: boolean } | null;
  /** Each planet's degree beside it; on by default side by side. */
  degrees?: boolean;
};

export function TwoWheels({ left, right, stacked, leftLabel, rightLabel, label, chosen, degrees = !stacked }: Props) {
  const a = stacked
    ? oneWheel(left, 170, 195, 150, degrees, chosen?.left ?? null)
    : oneWheel(left, 240, 235, 205, degrees, chosen?.left ?? null);
  const b = stacked
    ? oneWheel(right, 170, 570, 150, degrees, chosen?.right ?? null)
    : oneWheel(right, 760, 235, 205, degrees, chosen?.right ?? null);
  const from = chosen ? a.placed[chosen.left]?.glyph : undefined;
  const to = chosen ? b.placed[chosen.right]?.glyph : undefined;
  return (
    <svg className="rueda2" viewBox={stacked ? '0 0 340 760' : '0 0 1000 470'} role="img" aria-label={label}>
      {a.node}
      {b.node}
      {stacked && (
        <>
          <text x={10} y={12} fontSize={10} letterSpacing=".2em" fill={ink(0.75)}>
            {leftLabel}
          </text>
          <text x={10} y={388} fontSize={10} letterSpacing=".2em" fill={ink(0.75)}>
            {rightLabel}
          </text>
        </>
      )}
      {from && to && (
        <line
          x1={from[0].toFixed(2)}
          y1={from[1].toFixed(2)}
          x2={to[0].toFixed(2)}
          y2={to[1].toFixed(2)}
          stroke={INK}
          strokeWidth={1.4}
          strokeDasharray={chosen!.flows ? undefined : '5 4'}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
