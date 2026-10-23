import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { dayNightOf, hasBirthTime } from '@/astrology/natal-chart';
import { Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { FullChartWheel, type WheelAspect, type WheelAxis, type WheelPoint } from '@/design/FullChartWheel';
import { PLANET_GLYPHS, RETROGRADE_GLYPH } from '@/design/planet-glyphs';
import { SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';
import { AspectIcon, CloseMark, ElementTriangle, GlyphMark, type AspectKind } from '@/design/chart-marks';
import { AirIcon, EarthIcon, FireIcon, WaterIcon } from '@/design/brand-icons';
import { copy } from '@/i18n';
import {
  buildNatalChart,
  SIGNS,
  TRADITIONAL,
  wholeSignHouse,
  type ChartPoint,
  type NatalChart,
  type Sign,
} from '@/lib/natal-chart';
import type { Numerology } from '@/lib/schemas';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { chartReadings, ensureChartReadings } from '@/store/chart-readings';
import { PATHS } from '@/components/routes';
import { ChartChat } from '@/screens/ChartChat';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { markFalsePositive } from '@/store/crisis';
import type { OnboardingDraft } from '@/store/session';

/**
 * Carta, level 2 (package 05, approved by the owner to build, 16 Oct 2026):
 * the whole chart, and the wheel answers. Touching a point or a line of the
 * wheel opens its card right below it; touching a row of the lists lights its
 * point and brings the wheel back into view.
 *
 * Read the Hellenistic way, as `src/lib/natal-chart.ts` calculates it:
 * houses by whole sign, aspects by sign with no orb, the seven visible
 * planets' dignities, the sect. Without the hour of birth there is no
 * Ascendant, no axis, no house, no sect and no ruler, and it says so.
 *
 * Davraz's reading of each point comes from `store/chart-readings`. Nothing
 * here is graded: a dignity is a resource more at hand or an area that asks
 * for more conscious work, and Premium is not offered on this screen.
 */

const text = copy.fullChart;
const SIGN_NAMES = copy.chat.signs;

type Group = 'pl' | 'pu' | 'ej';
type Part = keyof typeof text.parts;
type Filter = 'all' | AspectKind;
type Mode = 'simple' | 'completa';
type ReadingState = 'pending' | 'ready' | 'unavailable' | 'error';

/** The package's order of the eighteen points, and the names the ephemeris may give each. */
const CATALOGUE: { key: string; group: Group; names: string[] }[] = [
  ...(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const).map(
    (key) => ({ key, group: 'pl' as const, names: [key] }),
  ),
  { key: 'Chiron', group: 'pu', names: ['Chiron'] },
  { key: 'Lilith', group: 'pu', names: ['Mean_Lilith', 'True_Lilith', 'Lilith'] },
  { key: 'North_Node', group: 'pu', names: ['True_North_Lunar_Node', 'Mean_North_Lunar_Node', 'True_Node', 'Mean_Node'] },
  { key: 'South_Node', group: 'pu', names: ['True_South_Lunar_Node', 'Mean_South_Lunar_Node'] },
  { key: 'Ascendant', group: 'ej', names: ['Ascendant'] },
  { key: 'Descendant', group: 'ej', names: ['Descendant'] },
  { key: 'Medium_Coeli', group: 'ej', names: ['Medium_Coeli'] },
  { key: 'Imum_Coeli', group: 'ej', names: ['Imum_Coeli'] },
];

const ASPECT_ORDER: AspectKind[] = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
/** The points whose aspects are listed: the ten planets, Chiron, and with the hour the Ascendant and Midheaven. */
const ASPECT_BASE = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'Ascendant', 'Medium_Coeli']);
/** What the simple wheel shows: the Sun, the Moon and the axes, and the aspects between the Sun, Moon and Ascendant. */
const SIMPLE_POINTS = new Set(['Sun', 'Moon', 'Ascendant', 'Descendant', 'Medium_Coeli', 'Imum_Coeli']);
const SIMPLE_ASPECTS = new Set(['Sun', 'Moon', 'Ascendant']);
const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
const MODALITIES = ['cardinal', 'fixed', 'mutable'] as const;
/** The table's rows (owner, 19 Oct 2026). ELEMENTS stays in the zodiac's order, which `mirrored` counts by. */
const TABLE_ELEMENTS = ['fire', 'air', 'earth', 'water'] as const;
/** What the table places, in each cell's order; its totals count only the ten planets. */
const TABLE_POINTS = ['Ascendant', 'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North_Node', 'Chiron', 'Medium_Coeli'];
const NUMBER_ORDER: (keyof typeof copy.practice.numberLabels)[] = ['life_path', 'expression', 'soul_urge', 'personality', 'birthday'];
const DESK = '(min-width: 1024px)';

type FPoint = {
  /** The chart's own name, which keys Davraz's readings. */
  id: string;
  key: string;
  group: Group;
  name: string;
  article: string;
  point: ChartPoint;
  dignity: string;
};

type FAspect = { id: string; a: FPoint; b: FPoint; type: AspectKind };

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function chartOf(draft: OnboardingDraft): NatalChart | null {
  const stored = draft.natal_chart;
  if (!stored || stored.parse_status !== 'parsed') return null;
  try {
    return buildNatalChart(stored.context, hasBirthTime(draft), dayNightOf(draft));
  } catch {
    return null;
  }
}

/** A point the ephemeris did not send but the chart implies: the South Node, the Descendant, the Imum Coeli. */
function mirrored(of: ChartPoint, name: string, ascendant: Sign | null, keepsMotion: boolean): ChartPoint {
  const longitude = (of.longitude + 180) % 360;
  const index = Math.floor(longitude / 30);
  const sign = SIGNS[index]!;
  return {
    name,
    sign,
    degree: Math.round((longitude - index * 30) * 100) / 100,
    longitude,
    retrograde: keepsMotion ? of.retrograde : false,
    element: ELEMENTS[index % 4]!,
    modality: MODALITIES[index % 3]!,
    house: ascendant ? wholeSignHouse(sign, ascendant) : null,
    dignity: null,
  };
}

function pointsOf(chart: NatalChart): FPoint[] {
  const byName = new Map(chart.points.map((p) => [p.name, p]));
  const found = new Map<string, ChartPoint>();
  for (const entry of CATALOGUE) {
    const hit = entry.names.map((n) => byName.get(n)).find(Boolean);
    if (hit) found.set(entry.key, hit);
  }
  const asc = chart.ascendant?.sign ?? null;
  const north = found.get('North_Node');
  if (north && !found.has('South_Node')) found.set('South_Node', mirrored(north, north.name.replace('North', 'South'), asc, true));
  if (asc) {
    const a = found.get('Ascendant');
    const m = found.get('Medium_Coeli');
    if (a && !found.has('Descendant')) found.set('Descendant', mirrored(a, 'Descendant', asc, false));
    if (m && !found.has('Imum_Coeli')) found.set('Imum_Coeli', mirrored(m, 'Imum_Coeli', asc, false));
  } else {
    for (const key of ['Ascendant', 'Descendant', 'Medium_Coeli', 'Imum_Coeli']) found.delete(key);
  }
  return CATALOGUE.flatMap((entry) => {
    const point = found.get(entry.key);
    if (!point) return [];
    const [name, article] = text.points[entry.key] ?? [entry.key, entry.key];
    const dignity =
      entry.group === 'ej'
        ? 'eje'
        : (TRADITIONAL as readonly string[]).includes(entry.key)
          ? (point.dignity ?? 'ninguna')
          : 'moderno';
    return [{ id: point.name, key: entry.key, group: entry.group, name, article, point, dignity }];
  });
}

function aspectsOf(chart: NatalChart, points: FPoint[]): FAspect[] {
  const byId = new Map(points.map((p) => [p.id, p]));
  const rank = (p: FPoint) => points.indexOf(p);
  const list: FAspect[] = [];
  for (const x of chart.aspects) {
    let a = byId.get(x.a);
    let b = byId.get(x.b);
    if (!a || !b || !ASPECT_BASE.has(a.key) || !ASPECT_BASE.has(b.key)) continue;
    if (new Set([a.key, b.key]).has('Ascendant') && new Set([a.key, b.key]).has('Medium_Coeli')) continue;
    if (rank(b) < rank(a)) [a, b] = [b, a];
    list.push({ id: `${a.id}|${b.id}`, a, b, type: x.type });
  }
  return list.sort(
    (x, y) =>
      ASPECT_ORDER.indexOf(x.type) - ASPECT_ORDER.indexOf(y.type) || rank(x.a) - rank(y.a) || rank(x.b) - rank(y.b),
  );
}

const isThread = (x: FAspect) => x.a.key === 'Sun' && x.b.key === 'Moon';

function aspectSentence(x: FAspect): string {
  if (isThread(x) && (x.type === 'square' || x.type === 'opposition')) return text.sunMoonApart;
  return text.aspectSentence(x.a.article, x.b.article, text.aspectReading[x.type]);
}

function glyphOf(p: FPoint) {
  if (p.key in PLANET_GLYPHS) {
    const g = PLANET_GLYPHS[p.key as keyof typeof PLANET_GLYPHS];
    return { d: g.d, advance: g.advance, evenOdd: p.key === 'Sun' };
  }
  return null;
}

function Mark({ p }: { p: FPoint }) {
  const g = glyphOf(p);
  return g ? <GlyphMark {...g} /> : <span className="eje-m">{text.axes[p.key]}</span>;
}

function SignMark({ sign }: { sign: Sign }) {
  const g = SIGN_GLYPHS[sign as GlyphSign];
  return <GlyphMark d={g.d} advance={g.advance} />;
}

function Rx() {
  return <GlyphMark d={RETROGRADE_GLYPH.d} advance={RETROGRADE_GLYPH.advance} />;
}

function ElementIcon({ element }: { element: (typeof ELEMENTS)[number] }) {
  const Icon = { fire: FireIcon, earth: EarthIcon, air: AirIcon, water: WaterIcon }[element];
  return <Icon className="ci" />;
}

const degreeOf = (p: ChartPoint) => `${Math.floor(p.degree)}°`;
const signName = (s: Sign) => SIGN_NAMES[s] ?? s;

function useDesk(): boolean {
  const [desk, setDesk] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(DESK).matches));
  useEffect(() => {
    const list = window.matchMedia?.(DESK);
    if (!list) return;
    const on = () => setDesk(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return desk;
}

/** The reading's loading state: nothing for the first 0.3 s, then the serpent and «Cargando». */
function ReadingLoading() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="cargando" role="status">
      {shown && (
        <>
          <Ouroboros size={22} delay={0} />
          {text.readingLoading}
        </>
      )}
    </p>
  );
}

export function FullChart() {
  const profile = activeProfile();
  const chart = profile ? chartOf(profile.draft) : null;
  const stored = currentSynthesis();
  const [localCrisis, setLocalCrisis] = useState<string | null>(null);
  if (!profile || !chart) return <Navigate to={PATHS.chart} replace />;
  if (localCrisis) {
    return (
      <CrisisScreen
        country={profile.draft.country}
        onNotMyCase={() => {
          markFalsePositive(localCrisis);
          setLocalCrisis(null);
        }}
        onBack={() => setLocalCrisis(null)}
      />
    );
  }
  return (
    <>
      <FullChartView chart={chart} name={firstNameOf(profile.draft.legal_birth_name ?? '')} numerology={stored?.numerology ?? null} />
      {/* «Pregúntale a tu carta» on the full chart too (owner, 23 Oct 2026). */}
      {stored && <ChartChat stored={stored} onCrisis={setLocalCrisis} />}
    </>
  );
}

function FullChartView({ chart, name, numerology }: { chart: NatalChart; name: string; numerology: Numerology | null }) {
  const desk = useDesk();
  const withTime = chart.ascendant !== null;
  const points = pointsOf(chart);
  const aspects = aspectsOf(chart, points);
  const byId = new Map(points.map((p) => [p.id, p]));
  const ruler = chart.ascendant_ruler ? points.find((p) => p.key === chart.ascendant_ruler!.planet) : undefined;
  const ascendantPoint = points.find((p) => p.key === 'Ascendant');

  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined' && window.matchMedia?.(DESK).matches ? 'completa' : 'simple',
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [part, setPart] = useState<Part>('puntos');
  const [reading, setReading] = useState<ReadingState>(() => (chartReadings() ? 'ready' : 'pending'));
  const [scrollAsk, setScrollAsk] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const fichaRef = useRef<HTMLDivElement>(null);

  const askReadings = useCallback(() => {
    if (!chartReadings()) setReading('pending');
    ensureChartReadings().then(
      (r) => setReading(r),
      () => setReading('error'),
    );
  }, []);
  useEffect(askReadings, [askReadings]);

  // From a list, the view goes back up to the wheel (package: «la vista sube sola a la rueda»).
  useLayoutEffect(() => {
    if (scrollAsk === 0) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = still ? 'auto' : 'smooth';
    if (desk) {
      const col = col2Ref.current;
      const f = fichaRef.current;
      if (col && f) col.scrollTo({ top: Math.max(0, col.scrollTop + f.getBoundingClientRect().top - col.getBoundingClientRect().top - 20), behavior });
    } else {
      const sc = scrollRef.current;
      const w = wheelRef.current;
      if (sc && w) sc.scrollTo({ top: Math.max(0, sc.scrollTop + w.getBoundingClientRect().top - sc.getBoundingClientRect().top - 104), behavior });
    }
  }, [scrollAsk, desk]);

  const pickPoint = (id: string, from: 'wheel' | 'list' | 'tag') => {
    setSelectedAspect(null);
    setSelected((cur) => (cur === id && from === 'wheel' ? null : id));
    const p = byId.get(id);
    if (mode === 'simple' && p && !SIMPLE_POINTS.has(p.key)) setMode('completa');
    if (from === 'list') setScrollAsk((n) => n + 1);
  };

  const pickAspect = (id: string, from: 'wheel' | 'list' | 'tag') => {
    setSelected(null);
    setSelectedAspect((cur) => (cur === id && from === 'wheel' ? null : id));
    const x = aspects.find((y) => y.id === id);
    if (!x) return;
    if (mode === 'simple' && !(SIMPLE_ASPECTS.has(x.a.key) && SIMPLE_ASPECTS.has(x.b.key))) setMode('completa');
    if (filter !== 'all' && filter !== x.type) setFilter('all');
    if (from === 'list') setScrollAsk((n) => n + 1);
  };

  const close = () => {
    setSelected(null);
    setSelectedAspect(null);
  };

  const simple = mode === 'simple';
  const drawnPoints = points.filter((p) => p.group !== 'ej' && (!simple || p.key === 'Sun' || p.key === 'Moon'));
  const drawnAspects = aspects.filter((x) =>
    simple ? SIMPLE_ASPECTS.has(x.a.key) && SIMPLE_ASPECTS.has(x.b.key) : filter === 'all' || x.type === filter,
  );

  const wheelPoint = (p: FPoint): WheelPoint => ({
    id: p.id,
    label: text.pointLabel(p.name, signName(p.point.sign), Math.floor(p.point.degree)),
    glyph: glyphOf(p)!,
    longitude: p.point.longitude,
    degree: p.point.degree,
    retrograde: p.point.retrograde,
  });
  const wheelAxes: WheelAxis[] = points
    .filter((p) => p.group === 'ej')
    .map((p) => ({
      id: p.id,
      label: text.pointLabel(p.name, signName(p.point.sign), Math.floor(p.point.degree)),
      text: text.axes[p.key] ?? p.key,
      longitude: p.point.longitude,
      strong: p.key === 'Ascendant' || p.key === 'Descendant',
    }));
  const wheelAspects: WheelAspect[] = drawnAspects.map((x) => ({
    id: x.id,
    a: x.a.id,
    b: x.b.id,
    aLongitude: x.a.point.longitude,
    bLongitude: x.b.point.longitude,
    label: text.aspectLabel(text.aspects[x.type], x.a.name, x.b.name),
    thread: isThread(x),
  }));

  const title = (
    <>
      <p className="k">{text.kicker}</p>
      <h1 className="t">
        {name ? text.titleWithName(name) : text.titleWithoutName}
        <em>{text.titleEmphasis}</em>
      </h1>
    </>
  );

  const summary =
    withTime && chart.sect ? (
      <div className="vid res">
        <div>
          <p className="fk">{text.sect}</p>
          <b>{text.sectKind[chart.sect.kind]}</b>
          <small>{text.sectWhy[chart.sect.kind]}</small>
        </div>
        {ruler && chart.ascendant_ruler && (
          <div>
            <p className="fk">{text.ruler}</p>
            <b>{ruler.name}</b>
            <small>
              {text.rulerWhere(
                signName(chart.ascendant_ruler.sign),
                ruler.point.dignity ? text.rulerDignity[ruler.point.dignity] : null,
                chart.ascendant_ruler.house,
              )}
            </small>
          </div>
        )}
      </div>
    ) : (
      <div className="vid">
        <p className="aviso">{text.noTime}</p>
      </div>
    );

  const modes = (
    <div className="segm" role="group" aria-label={text.modesLabel}>
      {(['simple', 'completa'] as const).map((m) => (
        <button key={m} type="button" className={mode === m ? 'on' : undefined} aria-pressed={mode === m} onClick={() => setMode(m)}>
          {text.modes[m]}
        </button>
      ))}
    </div>
  );

  const filters = (
    <div className="chips" role="group" aria-label={text.filterLabel}>
      {(['all', ...ASPECT_ORDER] as const).map((f) => (
        <button
          key={f}
          type="button"
          className={filter === f ? 'chip on' : 'chip'}
          aria-pressed={filter === f}
          onClick={() => {
            setFilter(f);
            setSelectedAspect(null);
          }}
        >
          {f !== 'all' && <AspectIcon type={f} />}
          {f === 'all' ? text.all : text.aspects[f]}
        </button>
      ))}
    </div>
  );

  const wheel = (
    <div className="rueda" ref={wheelRef}>
      <FullChartWheel
        label={text.wheelLabel}
        signs={SIGN_NAMES}
        large={!desk}
        simple={simple}
        ascendant={ascendantPoint ? ascendantPoint.point.longitude : null}
        points={drawnPoints.map(wheelPoint)}
        axes={wheelAxes}
        aspects={wheelAspects}
        selected={selected}
        selectedAspect={selectedAspect}
        onPoint={(id) => pickPoint(id, 'wheel')}
        onAspect={(id) => pickAspect(id, 'wheel')}
      />
    </div>
  );

  const readingOf = (p: FPoint) => {
    if (reading === 'unavailable') return null;
    if (reading === 'error') {
      return (
        <div className="lec-err">
          <p className="dig">{copy.chrome.aiError.message}</p>
          <button type="button" className="p2" onClick={askReadings}>
            {copy.chrome.aiError.retry}
          </button>
        </div>
      );
    }
    const words = reading === 'ready' ? chartReadings()?.readings[p.id] : undefined;
    if (reading === 'ready' && !words) return null;
    return (
      <>
        <p className="ia">
          {text.readingBy} <b>{text.readingAi}</b>
        </p>
        {words ? <p className="lec">{words}</p> : <ReadingLoading />}
      </>
    );
  };

  const close_ = (
    <button type="button" className="cerrar" aria-label={text.close} onClick={close}>
      <CloseMark />
    </button>
  );

  let ficha = <p className="pista">{text.hint}</p>;
  const sp = selected ? byId.get(selected) : undefined;
  const sx = selectedAspect ? aspects.find((x) => x.id === selectedAspect) : undefined;
  if (sp) {
    const s = sp.point;
    const [dTitle, dWords] = text.dignities[sp.dignity] ?? text.dignities['ninguna']!;
    const related = aspects.filter((x) => x.a.id === sp.id || x.b.id === sp.id);
    ficha = (
      <div className="vid ficha" aria-live="polite">
        <div className="fcab">
          <span className={sp.group === 'ej' ? 'gl eje' : 'gl'}>
            <Mark p={sp} />
          </span>
          <div>
            <h2 className="fn">{sp.name}</h2>
            <p className="fs">
              {signName(s.sign)} {degreeOf(s)}
              {s.house !== null && ` · ${text.house(s.house)}`}
            </p>
          </div>
          {close_}
        </div>
        <div className="etis">
          <span className="eti">
            <ElementTriangle element={s.element} />
            {text.elements[s.element]}
          </span>
          <span className="eti">{text.modalities[s.modality]}</span>
          {s.retrograde && (
            <span className="eti">
              <span className="gl">
                <Rx />
              </span>
              {text.retrograde}
            </span>
          )}
          {withTime && ruler?.id === sp.id && <span className="eti">{text.ruler}</span>}
        </div>
        <p className="dig">
          <b>{dTitle}</b> · {dWords}
        </p>
        {readingOf(sp)}
        {related.length > 0 && (
          <div className="etis">
            {related.map((x) => {
              const other = x.a.id === sp.id ? x.b : x.a;
              return (
                <button
                  key={x.id}
                  type="button"
                  className="eti"
                  aria-label={text.aspectLabel(text.aspects[x.type], sp.name, other.name)}
                  onClick={() => pickAspect(x.id, 'tag')}
                >
                  <AspectIcon type={x.type} />
                  {other.group !== 'ej' && (
                    <span className="gl">
                      <Mark p={other} />
                    </span>
                  )}
                  {other.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  } else if (sx) {
    ficha = (
      <div className="vid ficha" aria-live="polite">
        <div className="fcab">
          <span className="gl par">
            <span className={sx.a.group === 'ej' ? 'eje' : undefined}>
              <Mark p={sx.a} />
            </span>
            <AspectIcon type={sx.type} />
            <span className={sx.b.group === 'ej' ? 'eje' : undefined}>
              <Mark p={sx.b} />
            </span>
          </span>
          <div>
            <h2 className="fn">{text.aspects[sx.type]}</h2>
            <p className="fs">{text.aspectPair(sx.a.name, signName(sx.a.point.sign), sx.b.name, signName(sx.b.point.sign))}</p>
          </div>
          {close_}
        </div>
        {/* A fixed text from the catalogue, not Davraz's: it carries no «IA» label. */}
        <p className="lec">{aspectSentence(sx)}</p>
      </div>
    );
  }

  const planets = points.filter((p) => p.group === 'pl');
  const count = <K extends string>(f: (p: ChartPoint) => K, keys: readonly K[]) => {
    const c = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
    for (const p of planets) c[f(p.point)]++;
    return c;
  };
  const byElement = count((p) => p.element, ELEMENTS);
  const byModality = count((p) => p.modality, MODALITIES);
  const inTable = TABLE_POINTS.flatMap((k) => points.filter((p) => p.key === k));
  const listed = aspects.filter((x) => filter === 'all' || x.type === filter);

  const parts = (
    <>
      <div className="segm partes" role="tablist" aria-label={text.partsLabel}>
        {(Object.keys(text.parts) as Part[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={part === k} className={part === k ? 'on' : undefined} onClick={() => setPart(k)}>
            {text.parts[k]}
          </button>
        ))}
      </div>

      {part === 'puntos' && (
        <>
          <section className="vid">
            <h2 className="sub">{text.elementsHead}</h2>
            <div className="em" role="table" aria-label={text.elementsTable}>
              <div className="em-fila" role="row">
                <span role="columnheader" />
                {MODALITIES.map((m) => (
                  <span key={m} className="em-h" role="columnheader">
                    {text.modalities[m]}
                  </span>
                ))}
                <span role="columnheader">
                  <span className="em-sr">{text.elementsPlanets}</span>
                </span>
              </div>
              {TABLE_ELEMENTS.map((e) => (
                <div key={e} className="em-fila" role="row">
                  <span className="em-el" role="rowheader">
                    <ElementIcon element={e} />
                    {text.elements[e]}
                  </span>
                  {MODALITIES.map((m) => (
                    <span key={m} className="em-c" role="cell">
                      {inTable
                        .filter((p) => p.point.element === e && p.point.modality === m)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={selected === p.id ? 'on' : undefined}
                            aria-pressed={selected === p.id}
                            aria-label={`${p.name}, ${signName(p.point.sign)} ${degreeOf(p.point)}`}
                            onClick={() => pickPoint(p.id, 'list')}
                          >
                            <Mark p={p} />
                          </button>
                        ))}
                    </span>
                  ))}
                  <span className="em-n" role="cell">
                    {byElement[e]}
                  </span>
                </div>
              ))}
              <div className="em-fila em-tot" role="row">
                <span className="em-el" role="rowheader">
                  {text.elementsPlanets}
                </span>
                {MODALITIES.map((m) => (
                  <span key={m} className="em-n" role="cell">
                    {byModality[m]}
                  </span>
                ))}
                <span className="em-n" role="cell">
                  {planets.length}
                </span>
              </div>
            </div>
          </section>
          {(['pl', 'pu', 'ej'] as const).map((g) => {
            const rows = points.filter((p) => p.group === g);
            if (rows.length === 0) return null;
            return (
              <section key={g} className="vid">
                <h2 className="sub">{text.groups[g]}</h2>
                {rows.map((p) => {
                  const d = p.dignity;
                  const right = d === 'domicilio' || d === 'exaltacion' || d === 'exilio' || d === 'caida' ? text.dignities[d]![0] : '';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={selected === p.id ? 'pf on' : 'pf'}
                      aria-pressed={selected === p.id}
                      onClick={() => pickPoint(p.id, 'list')}
                    >
                      <span className={g === 'ej' ? 'gl eje' : 'gl'}>
                        <Mark p={p} />
                      </span>
                      <div>
                        <p className="ft">{p.name}</p>
                        <p className="fd">
                          {signName(p.point.sign)} {degreeOf(p.point)}
                          {p.point.house !== null && ` · ${text.houseInList(p.point.house)}`}
                          {p.point.retrograde && (
                            <>
                              {' · '}
                              <span className="rx" role="img" aria-label={text.retrogradeShort}>
                                <Rx />
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="der">{right}</span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </>
      )}

      {part === 'aspectos' && (
        <>
          {simple && filters}
          <section className="vid">
            {listed.length > 0 ? (
              listed.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={selectedAspect === x.id ? 'pf on' : 'pf'}
                  aria-pressed={selectedAspect === x.id}
                  onClick={() => pickAspect(x.id, 'list')}
                >
                  <span className={isThread(x) ? 'icos oro' : 'icos'}>
                    <AspectIcon type={x.type} />
                  </span>
                  <div>
                    <p className="ft">
                      {x.a.name} · {x.b.name}
                    </p>
                    <p className="fd">
                      {text.aspects[x.type]} ·{' '}
                      {text.aspectWhere(
                        signName(x.a.point.sign),
                        x.type === 'conjunction' ? null : signName(x.b.point.sign),
                      )}
                    </p>
                  </div>
                  <span className="icos gl" aria-hidden="true">
                    <span className={x.a.group === 'ej' ? 'eje' : undefined}>
                      <Mark p={x.a} />
                    </span>
                    <span className={x.b.group === 'ej' ? 'eje' : undefined}>
                      <Mark p={x.b} />
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="aviso">{text.noAspects}</p>
            )}
          </section>
        </>
      )}

      {part === 'casas' &&
        (withTime && chart.ascendant ? (
          <section className="vid">
            <h2 className="sub">{text.housesHead}</h2>
            {text.houses.map((theme, i) => {
              const sign = SIGNS[(SIGNS.indexOf(chart.ascendant!.sign) + i) % 12]!;
              const inside = points.filter((p) => p.group !== 'ej' && p.point.sign === sign);
              return (
                <div key={theme} className="cf">
                  <b>{i + 1}</b>
                  <span className="gl">
                    <SignMark sign={sign} />
                  </span>
                  <div>
                    <p className="ft">{theme}</p>
                    <p className="fd">{signName(sign)}</p>
                  </div>
                  <span className="gl2" aria-label={inside.map((p) => p.name).join(', ')} role={inside.length ? 'img' : undefined}>
                    {inside.map((p) => (
                      <Mark key={p.id} p={p} />
                    ))}
                  </span>
                </div>
              );
            })}
          </section>
        ) : (
          <div className="vid">
            <p className="aviso">{text.noTimeHouses}</p>
          </div>
        ))}

      {part === 'numeros' && (
        <section className="vid">
          {numerology ? (
            NUMBER_ORDER.map((key) => {
              const value = numerology[key];
              return (
                <div key={key} className="nf">
                  <div className="top">
                    <b>{value}</b>
                    <p className="ft">{copy.practice.numberLabels[key]}</p>
                    {numerology.master_numbers_present.includes(value) ? <span className="maestro">{text.master}</span> : <span />}
                  </div>
                  {text.numberMeanings[value] && <p className="cuerpo">{text.numberMeanings[value]}</p>}
                </div>
              );
            })
          ) : (
            <p className="aviso">{copy.soulMap.numbersFailed}</p>
          )}
        </section>
      )}
    </>
  );

  const fichaSlot = (
    <div className="ficha-sitio" ref={fichaRef}>
      {ficha}
    </div>
  );

  return (
    <Screen photo="cieloEstrellas" veil={0.15} glassAlpha={0.32}>
      {desk ? (
        <div className="pz carta-completa">
          <div className="col1">
            {title}
            <div className="modo">{modes}</div>
            {wheel}
          </div>
          <div className="col2" ref={col2Ref}>
            {summary}
            {mode === 'completa' && filters}
            {fichaSlot}
            {parts}
          </div>
        </div>
      ) : (
        <div className="pz carta-completa scroll" ref={scrollRef}>
          {title}
          {summary}
          {modes}
          {mode === 'completa' && filters}
          {wheel}
          {fichaSlot}
          {parts}
        </div>
      )}
    </Screen>
  );
}
