import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '@/i18n';
import { TwoWheels, type WheelChart } from '@/design/TwoWheels';
import { SIGNS, wholeSignHouse, type NatalChart, type Sign } from '@/lib/natal-chart';
import type { ComparisonResult } from '@/lib/schemas';
import { Arrow, BodyGlyph } from './pieces';

const text = copy.comparison.result;
type Aspect = ComparisonResult['astro_dialogue']['aspects'][number];

/** The two charts of a comparison, the reader's first. Null when one cannot be read. */
export type Charts = { mine: NatalChart | null; theirs: NatalChart | null } | null;

export function bodyName(body: string): string {
  return copy.astro.bodies[body] ?? body.replace(/_/g, ' ');
}

export function signName(sign: string): string {
  return copy.chat.signs[sign as keyof typeof copy.chat.signs] ?? sign;
}

function aspectName(type: string): string {
  return copy.astro.aspects[type.toLowerCase()] ?? type;
}

/** A stored chart as the wheel draws it. */
export function wheelChart(chart: NatalChart, name: string): WheelChart {
  const mc = chart.points.find((p) => p.name === 'Medium_Coeli');
  return {
    name,
    ascendant: chart.ascendant ? SIGNS.indexOf(chart.ascendant.sign) * 30 + chart.ascendant.degree : null,
    midheaven: chart.ascendant && mc ? mc.longitude : null,
    points: chart.points.map((p) => ({ id: p.name, longitude: p.longitude, degree: p.degree, retrograde: p.retrograde })),
  };
}

/** Where a body sits in a chart: its sign, degree and house, or null when the chart lacks it. */
export function placeOf(chart: NatalChart, body: string): { sign: Sign; degree: number; house: number | null } | null {
  if (body === 'Ascendant') {
    return chart.ascendant ? { sign: chart.ascendant.sign, degree: chart.ascendant.degree, house: 1 } : null;
  }
  const p = chart.points.find((x) => x.name === body);
  return p ? { sign: p.sign, degree: p.degree, house: p.house } : null;
}

/**
 * «La carta» of the cross with both charts whole (owner, 23 Oct 2026): the two
 * wheels, the list of aspects as it was, and under it the reading of the one
 * chosen, with the sign, degree and house of each point and where the
 * friend's point falls among the reader's houses.
 */
export function TheChart({
  aspects,
  summary,
  charts,
  askedByMe,
  aName,
  bName,
  me,
  friend,
  friendshipId,
  wide,
}: {
  aspects: readonly Aspect[];
  summary: string;
  charts: Charts;
  askedByMe: boolean;
  aName: string;
  bName: string;
  me: string;
  friend: string;
  friendshipId: string;
  wide: boolean;
}) {
  const [chosen, setChosen] = useState(0);
  const aspect = aspects[chosen];
  const both = charts?.mine && charts.theirs ? { mine: charts.mine, theirs: charts.theirs } : null;
  const flowsOf = (a: Aspect) => (a.flow ? a.flow === 'fluye' : a.type === 'trine' || a.type === 'sextile');
  // The function writes the one who asked as `a`; the reader's chart is always on the left.
  const mineOf = (a: Aspect) => (askedByMe ? a.a_body : a.b_body);
  const theirsOf = (a: Aspect) => (askedByMe ? a.b_body : a.a_body);

  return (
    <section className="vid la-carta" aria-label={text.chart}>
      <h2 className="k">{text.chart}</h2>
      {both && (
        <>
          <TwoWheels
            left={wheelChart(both.mine, me)}
            right={wheelChart(both.theirs, friend)}
            // One over the other on desktop too (owner, 23 Oct 2026): side by
            // side they did not fit the cross's column; there with each degree.
            stacked
            degrees={wide}
            leftLabel={text.wheelYou(me)}
            rightLabel={friend.toUpperCase()}
            label={text.wheelsLabel(friend)}
            chosen={aspect ? { left: mineOf(aspect), right: theirsOf(aspect), flows: flowsOf(aspect) } : null}
          />
        </>
      )}
      <div className="lista-a">
        {aspects.map((a, i) => (
          <button
            key={`${a.a_body}-${a.type}-${a.b_body}`}
            type="button"
            className="fila-a"
            aria-pressed={chosen === i}
            onClick={() => setChosen(i)}
          >
            <span className={flowsOf(a) ? 'trazo' : 'trazo trab'} aria-hidden="true" />
            <span className="tx">
              <BodyGlyph body={a.a_body} /> {text.bodyOf(bodyName(a.a_body), aName)} · {aspectName(a.type)} ·{' '}
              <BodyGlyph body={a.b_body} /> {text.bodyOf(bodyName(a.b_body), bName)}
              {a.flow && <small>{a.flow === 'fluye' ? text.aspectFlows : text.aspectWork}</small>}
            </span>
            {a.flow && <span className="et">{a.flow === 'fluye' ? text.aspectFlows : text.aspectWork}</span>}
          </button>
        ))}
      </div>
      {aspect && (
        <p className="lectura" aria-live="polite">
          {aspect.reading}
          {both && <Places aspect={aspect} mine={both.mine} theirs={both.theirs} askedByMe={askedByMe} friend={friend} />}
        </p>
      )}
      {summary && <p className="sum">{summary}</p>}
      {both && (
        <Link to={`/comparacion/${encodeURIComponent(friendshipId)}/cartas`} className="p2 ir-areas">
          {text.seeByAreas}
          <Arrow />
        </Link>
      )}
    </section>
  );
}

/** «Tu Sol en Géminis 18°, casa 9 · Marte de Tomás en Libra 12°, su casa 3. Su Marte cae en tu casa 1: …». */
function Places({
  aspect,
  mine,
  theirs,
  askedByMe,
  friend,
}: {
  aspect: Aspect;
  mine: NatalChart;
  theirs: NatalChart;
  askedByMe: boolean;
  friend: string;
}) {
  const myBody = askedByMe ? aspect.a_body : aspect.b_body;
  const theirBody = askedByMe ? aspect.b_body : aspect.a_body;
  const m = placeOf(mine, myBody);
  const t = placeOf(theirs, theirBody);
  if (!m || !t) return null;
  const myLine = text.placeMine(bodyName(myBody), signName(m.sign), Math.floor(m.degree), m.house);
  const theirLine = text.placeTheirs(bodyName(theirBody), friend, signName(t.sign), Math.floor(t.degree), t.house);
  const lines = askedByMe ? [myLine, theirLine] : [theirLine, myLine];
  const falls = mine.ascendant && theirBody !== 'Ascendant' ? wholeSignHouse(t.sign, mine.ascendant.sign) : null;
  return (
    <small>
      {lines.join(' · ')}.
      {falls !== null && ` ${text.fallsIn(bodyName(theirBody), falls, text.houses[falls] ?? '')}`}
    </small>
  );
}
