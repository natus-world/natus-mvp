import { SIGNS, wholeSignHouse, type ChartAspect, type MainPoint, type NatalChart, type Sign } from './natal-chart.ts';

/**
 * «Las dos cartas» (owner, 23 Oct 2026; mockup `las-dos-cartas`): two charts
 * read by areas of life. Twelve areas, in the owner's order, each crossing
 * named planets of one person with named planets of the other, by sign —
 * the same rule as `aspectsBetween`, so nothing here has an orb.
 *
 * `A` is whoever is looking and `B` the other. The model is sent the areas
 * with `A` as the person who asked; the screen computes them again with `A`
 * as the reader, so «Tu Venus» is always the reader's. Each cross keeps the
 * order the area names it in («Venus de B · Marte de A»), which is the order
 * it is shown in.
 *
 * Six labels, one per cross (owner, 22–23 Oct 2026): a trine, a sextile or a
 * square is read by Davraz as `fluye`, `cultiva` or `trabajo`; an
 * opposition, a conjunction and two signs that do not see each other carry a
 * fixed label. The area takes the label of its first cross.
 *
 * Without the hour there is no Ascendant and no house: «Cómo se ven juntos»
 * needs both Ascendants, and the houses an area looks at are read only in a
 * chart that has them. A point the chart does not have (a Moon whose sign is
 * not certain) leaves its crosses out, and an area with no cross left is not
 * shown.
 */

export type Side = 'a' | 'b';

export const AREA_KEYS = [
  'quienes_son',
  'lo_que_se_dan',
  'lo_que_sienten',
  'como_se_hablan',
  'lo_que_disfrutan',
  'atraccion',
  'sexualidad',
  'desacuerdo',
  'conviven',
  'trabajan',
  'sostiene',
  'como_se_ven',
] as const;
export type AreaKey = (typeof AREA_KEYS)[number];

/** What Davraz decides for a trine, a sextile or a square. */
export const READ_LABELS = ['fluye', 'cultiva', 'trabajo'] as const;
export type ReadLabel = (typeof READ_LABELS)[number];
/** Every label a cross can carry. */
export type CrossLabel = ReadLabel | 'opuestos' | 'funden' | 'sin';

/** One cross as an area names it: whose body comes first, and each person's body. */
type Template = { first: Side; a: MainPoint; b: MainPoint };

const ab = (a: MainPoint, b: MainPoint): Template => ({ first: 'a', a, b });
const ba = (b: MainPoint, a: MainPoint): Template => ({ first: 'b', a, b });

type AreaDef = { key: AreaKey; crosses: Template[]; houses: readonly number[]; bothHours?: true };

/**
 * The table of the LEEME (owner, 23 Oct 2026), row by row. «Lo que los
 * sostiene» keeps the mockup's order: Saturn with the Moon, Venus and Sun.
 */
export const AREAS: readonly AreaDef[] = [
  { key: 'quienes_son', crosses: [ab('Sun', 'Sun')], houses: [] },
  { key: 'lo_que_se_dan', crosses: [ab('Sun', 'Moon'), ba('Sun', 'Moon')], houses: [] },
  { key: 'lo_que_sienten', crosses: [ab('Moon', 'Moon')], houses: [] },
  { key: 'como_se_hablan', crosses: [ab('Mercury', 'Mercury')], houses: [] },
  { key: 'lo_que_disfrutan', crosses: [ab('Venus', 'Venus')], houses: [] },
  { key: 'atraccion', crosses: [ab('Venus', 'Mars'), ba('Venus', 'Mars')], houses: [] },
  {
    key: 'sexualidad',
    crosses: [ab('Venus', 'Mars'), ba('Venus', 'Mars'), ab('Mars', 'Mars'), ab('Moon', 'Venus'), ba('Moon', 'Venus')],
    houses: [5, 8],
  },
  { key: 'desacuerdo', crosses: [ab('Mars', 'Mars')], houses: [] },
  {
    key: 'conviven',
    crosses: [
      ab('Moon', 'Moon'),
      ab('Moon', 'Saturn'),
      ba('Moon', 'Saturn'),
      ab('Mars', 'Moon'),
      ba('Mars', 'Moon'),
      ab('Mercury', 'Mercury'),
    ],
    houses: [4, 6],
  },
  {
    key: 'trabajan',
    crosses: [ab('Saturn', 'Saturn'), ab('Mars', 'Mars'), ab('Mercury', 'Mercury'), ab('Sun', 'Jupiter'), ba('Sun', 'Jupiter')],
    houses: [6, 10],
  },
  {
    key: 'sostiene',
    crosses: [
      ab('Saturn', 'Moon'),
      ba('Saturn', 'Moon'),
      ab('Saturn', 'Venus'),
      ba('Saturn', 'Venus'),
      ab('Saturn', 'Sun'),
      ba('Saturn', 'Sun'),
    ],
    houses: [],
  },
  { key: 'como_se_ven', crosses: [ab('Ascendant', 'Ascendant')], houses: [], bothHours: true },
];

/** A point of one chart as an area reads it. House null without the hour. */
export type AreaPoint = { body: MainPoint; sign: Sign; degree: number; house: number | null };

export type AreaCross = {
  first: Side;
  a: AreaPoint;
  b: AreaPoint;
  /** Null when the two signs do not see each other (1, 5, 7 or 11 apart). */
  type: ChartAspect['type'] | null;
};

/** A point of one person falling in a house of the other («su Marte cae en tu casa 8»). */
export type HouseOverlay = { of: Side; body: MainPoint; inHouseOf: Side; house: number };

export type Area = { key: AreaKey; crosses: AreaCross[]; overlays: HouseOverlay[] };

const BY_DISTANCE: Record<number, ChartAspect['type']> = {
  0: 'conjunction',
  2: 'sextile',
  3: 'square',
  4: 'trine',
  6: 'opposition',
  8: 'trine',
  9: 'square',
  10: 'sextile',
};

export function typeBySign(a: Sign, b: Sign): ChartAspect['type'] | null {
  const distance = (SIGNS.indexOf(b) - SIGNS.indexOf(a) + 12) % 12;
  return BY_DISTANCE[distance] ?? null;
}

function pointOf(chart: NatalChart, body: MainPoint): AreaPoint | null {
  if (body === 'Ascendant') {
    return chart.ascendant ? { body, sign: chart.ascendant.sign, degree: chart.ascendant.degree, house: 1 } : null;
  }
  const p = chart.points.find((x) => x.name === body);
  return p ? { body, sign: p.sign, degree: p.degree, house: p.house } : null;
}

/** The areas between two charts, with `a` as the first. */
export function areasBetween(a: NatalChart, b: NatalChart): Area[] {
  const areas: Area[] = [];
  for (const def of AREAS) {
    if (def.bothHours && (!a.ascendant || !b.ascendant)) continue;
    const crosses: AreaCross[] = [];
    for (const t of def.crosses) {
      const pa = pointOf(a, t.a);
      const pb = pointOf(b, t.b);
      if (!pa || !pb) continue;
      crosses.push({ first: t.first, a: pa, b: pb, type: typeBySign(pa.sign, pb.sign) });
    }
    if (crosses.length === 0) continue;
    areas.push({ key: def.key, crosses, overlays: overlaysOf(def, crosses, a, b) });
  }
  return areas;
}

/** The area's points of each person that fall in the houses it looks at, in the other's chart. */
function overlaysOf(def: AreaDef, crosses: AreaCross[], a: NatalChart, b: NatalChart): HouseOverlay[] {
  if (def.houses.length === 0) return [];
  const out: HouseOverlay[] = [];
  const seen = new Set<string>();
  const add = (of: Side, point: AreaPoint, host: NatalChart) => {
    if (!host.ascendant || point.body === 'Ascendant') return;
    const house = wholeSignHouse(point.sign, host.ascendant.sign);
    const key = `${of}|${point.body}`;
    if (!def.houses.includes(house) || seen.has(key)) return;
    seen.add(key);
    out.push({ of, body: point.body, inHouseOf: of === 'a' ? 'b' : 'a', house });
  };
  for (const c of crosses) {
    add('b', c.b, a);
    add('a', c.a, b);
  }
  return out;
}

/** The label of one cross: fixed by its type, or Davraz's for a trine, sextile or square. */
export function crossLabel(cross: AreaCross, read: (cross: AreaCross) => ReadLabel | undefined): CrossLabel | null {
  if (cross.type === null) return 'sin';
  if (cross.type === 'conjunction') return 'funden';
  if (cross.type === 'opposition') return 'opuestos';
  return read(cross) ?? null;
}

/** Whether Davraz decides this cross's label. */
export function isRead(cross: AreaCross): boolean {
  return cross.type === 'trine' || cross.type === 'sextile' || cross.type === 'square';
}

/** The key a label travels under: the two bodies, A's first. */
export function crossKey(aBody: string, bBody: string): string {
  return `${aBody}|${bBody}`;
}

/** Every cross Davraz has to label, once each, A's body first. */
export function crossesToLabel(areas: readonly Area[]): { a_body: MainPoint; b_body: MainPoint; type: ChartAspect['type'] }[] {
  const seen = new Set<string>();
  const out: { a_body: MainPoint; b_body: MainPoint; type: ChartAspect['type'] }[] = [];
  for (const area of areas) {
    for (const c of area.crosses) {
      const key = crossKey(c.a.body, c.b.body);
      if (!isRead(c) || seen.has(key)) continue;
      seen.add(key);
      out.push({ a_body: c.a.body, b_body: c.b.body, type: c.type! });
    }
  }
  return out;
}

/**
 * The balance of an area, as the cross's bar draws it: what flows (naturally
 * or when cultivated) against what asks for work (more work, opposites). A
 * conjunction counts half each way; signs that do not see each other, none.
 * Never a number on screen.
 */
export function areaBalance(labels: readonly (CrossLabel | null)[]): { flow: number; work: number } {
  let flow = 0;
  let work = 0;
  for (const l of labels) {
    if (l === 'fluye' || l === 'cultiva') flow += 1;
    else if (l === 'trabajo' || l === 'opuestos') work += 1;
    else if (l === 'funden') {
      flow += 0.5;
      work += 0.5;
    }
  }
  return { flow, work };
}

type Written = {
  areas?: readonly { key: string }[] | undefined;
  cross_labels?: readonly { a_body: string; b_body: string; label: string }[] | undefined;
  astro_dialogue: { aspects: readonly { a_body: string; b_body: string; flow?: string | undefined }[] };
};

/**
 * What a new answer has to hold for «Las dos cartas», as a reason to ask
 * again or null: one reading per computed area in its order, a label for
 * exactly the crosses that take one, and each label in line with the flow
 * the same aspect carries in the list above the wheels.
 */
export function areasProblem(result: Written, areas: readonly Area[]): string | null {
  const wanted = areas.map((a) => a.key);
  const got = (result.areas ?? []).map((a) => a.key);
  if (wanted.join(',') !== got.join(',')) {
    return `"areas" must be exactly, in this order: ${wanted.join(', ') || '(none)'}. It came as: ${got.join(', ') || '(none)'}.`;
  }

  const toLabel = crossesToLabel(areas).map((x) => crossKey(x.a_body, x.b_body));
  const labels = result.cross_labels ?? [];
  const given = labels.map((x) => crossKey(x.a_body, x.b_body));
  const missing = toLabel.filter((k) => !given.includes(k));
  const extra = given.filter((k) => !toLabel.includes(k));
  if (missing.length > 0 || extra.length > 0 || new Set(given).size !== given.length) {
    return `"cross_labels" must label exactly these crosses once each: ${toLabel.join(', ') || '(none)'}.${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}${extra.length ? ` Not asked for: ${extra.join(', ')}.` : ''}`;
  }

  for (const aspect of result.astro_dialogue.aspects) {
    const label = labels.find((x) => crossKey(x.a_body, x.b_body) === crossKey(aspect.a_body, aspect.b_body));
    if (!label || !aspect.flow) continue;
    const agrees = aspect.flow === 'fluye' ? label.label !== 'trabajo' : label.label === 'trabajo';
    if (!agrees) {
      return `The label of ${aspect.a_body}|${aspect.b_body} ("${label.label}") does not agree with its flow in the aspects ("${aspect.flow}").`;
    }
  }
  return null;
}
