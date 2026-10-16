import type { NatalChart } from '@/lib/natal-chart';
import { PLANET_GLYPHS, type GlyphPlanet } from '@/design/planet-glyphs';
import { GLYPH_CENTRAL, SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';

/**
 * The chart wheel in simple mode (packages 02 and 04, figure approved 15 Oct
 * 2026): the twelve signs, the Sun and the Moon, and — with the hour of birth
 * — the Ascendant's axis, the Midheaven's, the twelve whole-sign houses and
 * the Ascendant's aspects. Ported from the package's own drawing, at its
 * numbers, in its 400-unit box.
 *
 * The thread between the Sun and the Moon is the only gold on the screen.
 * Every glyph is an outline: the app never sets one as a character.
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

const SHOWN: GlyphPlanet[] = ['Sun', 'Moon'];
const GOLD = '#C9A876';
const INK = '#ECE2D0';
const WHITE = '#F5EFE6';
const NIGHT = '#0B120E';
const ink = (alpha: number) => `rgba(236,226,208,${alpha})`;

/** The package's sizes for the large wheel (`rev`). */
const FS = { sign: 21, planet: 27, axis: 12, house: 10 };
const C = 200;
/** Glyphs closer than this, in degrees, are pushed apart; the mark keeps the real degree. */
const MIN_GAP = 14;

type Labels = {
  /** The whole figure, for a screen reader. */
  label: string;
  /** Sign names, by the sign's English key. */
  signs: Record<string, string>;
  /** «AC», «DC», «MC», «FC». */
  axes: { ac: string; dc: string; mc: string; fc: string };
};

export function Glyph({
  d,
  advance,
  x,
  y,
  size,
  fill,
  halo,
  title,
  evenOdd = false,
}: {
  d: string;
  advance: number;
  x: number;
  y: number;
  size: number;
  fill: string;
  halo?: number | undefined;
  title?: string | undefined;
  evenOdd?: boolean;
}) {
  const s = size / 1000;
  // Set as the package set its text: centred on the advance, with the
  // font's central baseline on the point.
  const tx = x - (advance * s) / 2;
  const ty = y + GLYPH_CENTRAL * s;
  return (
    <path
      d={d}
      transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s} ${-s})`}
      fill={fill}
      // The planets' Sun is nested circles, so its ring needs even-odd.
      fillRule={evenOdd ? 'evenodd' : undefined}
      {...(halo
        ? { stroke: NIGHT, strokeWidth: halo / s, strokeLinejoin: 'round' as const, paintOrder: 'stroke' }
        : {})}
    >
      {title && <title>{title}</title>}
    </path>
  );
}

export function ChartWheel({ chart, labels }: { chart: NatalChart; labels: Labels }) {
  const withTime = chart.ascendant !== null;
  const ascendant = chart.points.find((p) => p.name === 'Ascendant');
  const midheaven = chart.points.find((p) => p.name === 'Medium_Coeli');
  const base = withTime && ascendant ? ascendant.longitude : 0;

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

  const planets = SHOWN.flatMap((name) => {
    const point = chart.points.find((p) => p.name === name);
    return point ? [{ name, longitude: point.longitude }] : [];
  });

  // Glyphs that fall too close are spread apart, the package's way.
  const order = planets.map((p) => ({ name: p.name, d: p.longitude })).sort((a, b) => a.d - b.d);
  for (let it = 0; it < 60; it++) {
    let moved = false;
    for (let k = 0; k < order.length; k++) {
      const a = order[k]!;
      const b = order[(k + 1) % order.length]!;
      if (a === b) break;
      const gap = (b.d - a.d + 360) % 360;
      if (gap < MIN_GAP) {
        const m = (MIN_GAP - gap) / 2 + 0.01;
        a.d -= m;
        b.d += m;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const shown = new Map(order.map((o) => [o.name, o.d]));

  // The aspects the simple wheel draws: between the Sun, the Moon and the
  // Ascendant, by sign, never the conjunction.
  const drawn = new Set<string>(['Sun', 'Moon', ...(withTime ? ['Ascendant'] : [])]);
  const longitudeOf = (name: string) => chart.points.find((p) => p.name === name)?.longitude;
  const aspects = chart.aspects.filter((a) => a.type !== 'conjunction' && drawn.has(a.a) && drawn.has(a.b));

  const ticks: [number, number][] = [];
  for (let g = 0; g < 360; g += 5) ticks.push([g, g % 10 === 0 ? 7 : 4.5]);

  const axes: { l: number; text: string; strong: boolean; from: number }[] =
    withTime && ascendant
      ? [
          { l: ascendant.longitude, text: labels.axes.ac, strong: true, from: 86 },
          { l: ascendant.longitude + 180, text: labels.axes.dc, strong: true, from: 86 },
          ...(midheaven
            ? [
                { l: midheaven.longitude, text: labels.axes.mc, strong: false, from: 138 },
                { l: midheaven.longitude + 180, text: labels.axes.fc, strong: false, from: 138 },
              ]
            : []),
        ]
      : [];
  const firstHouseSign = withTime && ascendant ? Math.floor(ascendant.longitude / 30) : 0;

  return (
    <svg viewBox="-16 -16 432 432" role="img" aria-label={labels.label}>
      <circle cx={C} cy={C} r={196} fill="none" stroke={ink(0.6)} strokeWidth={1} />
      <circle cx={C} cy={C} r={164} fill="none" stroke={ink(0.45)} strokeWidth={0.9} />
      {withTime && <circle cx={C} cy={C} r={138} fill="none" stroke={ink(0.2)} strokeWidth={0.6} />}
      <circle cx={C} cy={C} r={86} fill="none" stroke={ink(0.24)} strokeWidth={0.6} />

      <g>
        {ticks.map(([g, len]) => (
          <line
            key={g}
            {...line(P(164, g), P(164 - len, g))}
            stroke={ink(g % 10 === 0 ? 0.55 : 0.4)}
            strokeWidth={0.8}
          />
        ))}
      </g>

      {SIGN_ORDER.map((sign, i) => {
        const [x, y] = P(180, i * 30 + 15);
        const glyph = SIGN_GLYPHS[sign];
        return (
          <g key={sign}>
            <line {...line(P(164, i * 30), P(196, i * 30))} stroke={ink(0.32)} strokeWidth={0.6} />
            <Glyph
              d={glyph.d}
              advance={glyph.advance}
              x={x}
              y={y}
              size={FS.sign}
              fill={ink(0.9)}
              title={labels.signs[sign]}
            />
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
              fontSize={FS.house}
              fill={ink(0.5)}
            >
              {h + 1}
            </text>
          );
        })}

      {axes.map((axis) => {
        const [x, y] = P(218, axis.l);
        const color = ink(axis.strong ? 0.95 : 0.6);
        return (
          <g key={axis.text}>
            <line
              {...line(P(axis.from, axis.l), P(206, axis.l))}
              stroke={color}
              strokeWidth={axis.strong ? 1.3 : 0.7}
            />
            <text
              className="eje-t"
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={FS.axis}
              fill={color}
            >
              {axis.text}
            </text>
          </g>
        );
      })}

      {aspects.map((aspect) => {
        const a = longitudeOf(aspect.a);
        const b = longitudeOf(aspect.b);
        if (a === undefined || b === undefined) return null;
        const thread = [aspect.a, aspect.b].sort().join('|') === 'Moon|Sun';
        return (
          <line
            key={`${aspect.a}|${aspect.b}`}
            {...line(P(86, a), P(86, b))}
            stroke={thread ? GOLD : ink(0.34)}
            strokeWidth={thread ? 1.4 : 0.8}
          />
        );
      })}

      {planets.map((planet) => {
        const d = shown.get(planet.name) ?? planet.longitude;
        const glyph = PLANET_GLYPHS[planet.name];
        const [x, y] = P(116, d);
        const [dx, dy] = P(86, planet.longitude);
        return (
          <g key={planet.name}>
            <line {...line(P(164, planet.longitude), P(157, planet.longitude))} stroke={INK} strokeWidth={1.2} />
            <line
              {...line(P(withTime ? 138 : 164, planet.longitude), P(116 + 17, d))}
              stroke={ink(0.35)}
              strokeWidth={0.5}
            />
            <Glyph d={glyph.d} advance={glyph.advance} x={x} y={y} size={FS.planet} fill={WHITE} halo={5} evenOdd />
            <circle cx={dx.toFixed(2)} cy={dy.toFixed(2)} r={2.4} fill={INK} />
          </g>
        );
      })}
    </svg>
  );
}
