import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { compareWithFriend } from '@/ai/comparison';
import { AiError } from '@/ai/client';
import { Paywall } from '@/components/Paywall';
import { activeProfile } from '@/store/account';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import { friendCharts, latestComparison } from '@/store/comparison';
import { listFriends } from '@/store/friends';
import {
  areaBalance,
  areasBetween,
  crossKey,
  crossLabel,
  type Area,
  type AreaCross,
  type AreaPoint,
  type CrossLabel,
  type ReadLabel,
} from '@/lib/comparison-areas';
import type { NatalChart } from '@/lib/natal-chart';
import type { ComparisonResult } from '@/lib/schemas';
import { ComparisonGate } from './Gate';
import { Crossing } from './Result';
import { bodyName, placeOf, signName } from './TheChart';
import { BodyGlyph, Chevron, firstNameOf, SignGlyph, useWide } from './pieces';

const text = copy.comparison.both;
const LABELS: CrossLabel[] = ['fluye', 'cultiva', 'trabajo', 'opuestos', 'funden', 'sin'];
const TABLE = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

type Ready = {
  kind: 'ready';
  friend: string;
  result: ComparisonResult;
  askedByMe: boolean;
  mine: NatalChart;
  theirs: NatalChart;
};

type State =
  | { kind: 'loading' }
  | { kind: 'not-friends' }
  | { kind: 'unavailable' }
  | { kind: 'no-charts' }
  | { kind: 'generating'; friend: string }
  | Ready;

/**
 * «Las dos cartas» (owner, 23 Oct 2026; mockup `las-dos-cartas/2-…`): the two
 * charts by areas of life, each with its label and its bar, opened from «La
 * carta» of the cross. On desktop the list and the area beside it; on the
 * phone the list, and an area opens in its place with «‹ Áreas». A second tab
 * sets the two charts planet by planet.
 *
 * The areas are crossed here again from the two stored charts with the reader
 * as A, so «Tu Venus» is always the reader's; the labels and readings are the
 * ones the comparison wrote. Read only while the two are friends.
 */
export function BothCharts() {
  const { friendshipId = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const me = firstNameOf(activeProfile()?.draft.legal_birth_name);

  const load = useCallback(async () => {
    try {
      const friend = (await listFriends()).find((f) => f.friendshipId === friendshipId);
      if (!friend) {
        setState({ kind: 'not-friends' });
        return;
      }
      const [stored, charts] = await Promise.all([latestComparison(friendshipId), friendCharts(friendshipId)]);
      if (!stored) {
        setState({ kind: 'not-friends' });
        return;
      }
      if (!charts?.mine || !charts.theirs) {
        setState({ kind: 'no-charts' });
        return;
      }
      setState({
        kind: 'ready',
        friend: friend.firstName,
        result: stored.result,
        askedByMe: stored.askedByMe,
        mine: charts.mine,
        theirs: charts.theirs,
      });
    } catch {
      setState({ kind: 'unavailable' });
    }
  }, [friendshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') return <Crossing friend={null} me={me} />;
  if (state.kind === 'generating') return <Crossing friend={state.friend} me={me} />;

  return (
    <ComparisonGate>
      <Screen photo="orilla" veil={0.3} glassAlpha={0.77}>
        <div className="pz comparar dos-cartas mar">
          <div className="sc">
            {state.kind === 'ready' ? (
              <Areas
                state={state}
                me={me}
                friendshipId={friendshipId}
                onGenerate={() => setState({ kind: 'generating', friend: state.friend })}
                onDone={() => void load()}
              />
            ) : (
              <div className="vid aviso-d">
                <p className="cuerpo">
                  {state.kind === 'not-friends'
                    ? copy.comparison.result.notFriends
                    : state.kind === 'no-charts'
                      ? text.noCharts
                      : text.unavailable}
                </p>
              </div>
            )}
          </div>
        </div>
      </Screen>
    </ComparisonGate>
  );
}

function Areas({
  state,
  me,
  friendshipId,
  onGenerate,
  onDone,
}: {
  state: Ready;
  me: string;
  friendshipId: string;
  onGenerate: () => void;
  onDone: () => void;
}) {
  const wide = useWide();
  const [view, setView] = useState<'areas' | 'todos'>('areas');
  const { result, askedByMe, friend } = state;
  const written = new Map((result.areas ?? []).map((a) => [a.key, a]));
  const labels = new Map((result.cross_labels ?? []).map((l) => [crossKey(l.a_body, l.b_body), l.label]));
  // The labels travel with the asker's body first; the reader is A here.
  const read = (c: AreaCross): ReadLabel | undefined =>
    labels.get(askedByMe ? crossKey(c.a.body, c.b.body) : crossKey(c.b.body, c.a.body));
  const areas = areasBetween(state.mine, state.theirs).filter((a) => written.has(a.key));
  const [open, setOpen] = useState<string | null>(wide ? (areas[0]?.key ?? null) : null);
  const older = !result.areas;

  const title = (
    <>
      <p className="k">{text.kicker}</p>
      <h1 className="t mt">
        {me}
        {text.titleJoin}
        <em>{friend}</em>
      </h1>
    </>
  );

  if (older) {
    return (
      <>
        {title}
        <Update friendshipId={friendshipId} onGenerate={onGenerate} onDone={onDone} />
      </>
    );
  }

  const chosen = areas.find((a) => a.key === open) ?? null;
  const detail = chosen && (
    <Detail
      area={chosen}
      label={(c) => crossLabel(c, read)}
      reading={written.get(chosen.key)!}
      me={me}
      friend={friend}
    />
  );

  // The phone: an area opens in place of the list.
  if (!wide && view === 'areas' && chosen) {
    return (
      <>
        <button type="button" className="volver-a" onClick={() => setOpen(null)}>
          <span className="chev-i" aria-hidden="true">
            <Chevron />
          </span>
          {text.backToAreas}
        </button>
        <div className="vid detalle-ar">{detail}</div>
      </>
    );
  }

  return (
    <>
      {title}
      <div className="tabs" role="group" aria-label={text.views}>
        <button type="button" aria-pressed={view === 'areas'} onClick={() => setView('areas')}>
          {text.byAreas}
        </button>
        <button type="button" aria-pressed={view === 'todos'} onClick={() => setView('todos')}>
          {text.allPlanets}
        </button>
      </div>
      {view === 'areas' ? (
        <div className="cuerpo-ar">
          <div className="vid lista-ar">
            {areas.map((area) => {
              const all = area.crosses.map((c) => crossLabel(c, read));
              return (
                <button
                  key={area.key}
                  type="button"
                  className="fila-ar"
                  aria-pressed={wide && open === area.key}
                  onClick={() => setOpen(area.key)}
                >
                  <span className="nom-ar">
                    {text.areas[area.key]}
                    {area.key === 'como_se_ven' && <span className="extra">{text.withHour}</span>}
                  </span>
                  <Bar labels={all} />
                  <Chip label={all[0] ?? null} />
                </button>
              );
            })}
          </div>
          {wide && detail && (
            <div className="vid detalle-ar" aria-live="polite">
              {detail}
            </div>
          )}
        </div>
      ) : (
        <div className="vid todos">
          <AllPlanets mine={state.mine} theirs={state.theirs} me={me} friend={friend} />
        </div>
      )}
      <div className="vid leyenda">
        <p className="tk">{text.legendTitle}</p>
        {LABELS.map((l) => (
          <div key={l}>
            <Chip label={l} />
            <p>{text.meanings[l]}</p>
          </div>
        ))}
      </div>
      <p className="espejo">{copy.comparison.result.disclaimer}</p>
    </>
  );
}

const CHIP_CLASS: Record<CrossLabel, string> = {
  fluye: 'fluye',
  cultiva: 'cultivan',
  trabajo: 'trabajo',
  opuestos: 'opuestos',
  funden: 'funden',
  sin: 'sin',
};

function Chip({ label }: { label: CrossLabel | null }) {
  if (!label) return null;
  return (
    <span className={`etq ${CHIP_CLASS[label]}`}>
      <i aria-hidden="true" />
      {text.labels[label]}
    </span>
  );
}

/** The cross's bar, per area: smooth what flows, striped what asks for work. No number. */
function Bar({ labels }: { labels: readonly (CrossLabel | null)[] }) {
  const { flow, work } = areaBalance(labels);
  if (flow + work === 0) return <span className="barra vacia" aria-hidden="true" />;
  return (
    <span className="barra" aria-hidden="true">
      {flow > 0 && <span className="f" style={{ flexGrow: flow }} />}
      {work > 0 && <span className="t" style={{ flexGrow: work }} />}
    </span>
  );
}

function Detail({
  area,
  label,
  reading,
  me,
  friend,
}: {
  area: Area;
  label: (c: AreaCross) => CrossLabel | null;
  reading: { reading: string; question: string };
  me: string;
  friend: string;
}) {
  const [source, setSource] = useState(false);
  useEffect(() => setSource(false), [area.key]);
  const main = area.crosses[0]!;
  const whoA = (p: AreaPoint) => text.mine(bodyName(p.body));
  const whoB = (p: AreaPoint) => text.theirs(bodyName(p.body), friend);
  const house = (p: AreaPoint) => (p.house !== null && p.body !== 'Ascendant' ? text.house(p.house) : '');
  const pair = (c: AreaCross) =>
    c.first === 'a'
      ? [
          { p: c.a, who: whoA(c.a) },
          { p: c.b, who: whoB(c.b) },
        ]
      : [
          { p: c.b, who: whoB(c.b) },
          { p: c.a, who: whoA(c.a) },
        ];
  const owner = (p: AreaPoint, side: 'a' | 'b') =>
    p.house !== null && p.body !== 'Ascendant' ? text.sourceHouse(p.house, side === 'a' ? me : friend) : '';

  return (
    <>
      <div className="cab-d">
        <h3>{text.areas[area.key]}</h3>
        <Chip label={label(main)} />
      </div>
      <div className="frente">
        <div className="yo-ar">
          <span className="quien">{me}</span>
          <b>{signName(main.a.sign)}</b>
          <small>
            {whoA(main.a)}
            {house(main.a)}
          </small>
        </div>
        <div className="medio" aria-hidden="true">
          <BodyGlyph body={main.a.body} />
          {main.a.body !== main.b.body && <BodyGlyph body={main.b.body} />}
        </div>
        <div>
          <span className="quien">{friend}</span>
          <b>{signName(main.b.sign)}</b>
          <small>
            {whoB(main.b)}
            {house(main.b)}
          </small>
        </div>
      </div>
      <p className="texto">{reading.reading}</p>
      {area.crosses.length > 1 && (
        <div className="otros">
          <p className="tk">{text.reads}</p>
          {area.crosses.map((c) => {
            const [x, y] = pair(c);
            return (
              <div key={`${c.first}${c.a.body}${c.b.body}`} className="otro">
                <span>
                  <BodyGlyph body={x!.p.body} /> {x!.who} · <BodyGlyph body={y!.p.body} /> {y!.who}
                </span>
                <Chip label={label(c)} />
              </div>
            );
          })}
        </div>
      )}
      <div className="pregunta">
        <p className="tk">{text.toTalk}</p>
        <p>{reading.question}</p>
      </div>
      <button type="button" className="desde" aria-expanded={source} onClick={() => setSource(!source)}>
        {source ? text.hideSource : text.showSource}
      </button>
      {source && (
        <div className="tecnico">
          {area.crosses.map((c) => {
            const [x, y] = c.first === 'a' ? [{ p: c.a, s: 'a' as const }, { p: c.b, s: 'b' as const }] : [{ p: c.b, s: 'b' as const }, { p: c.a, s: 'a' as const }];
            const who = (v: { p: AreaPoint; s: 'a' | 'b' }) => (v.s === 'a' ? whoA(v.p) : whoB(v.p));
            return (
              <span key={`${c.first}${c.a.body}${c.b.body}`}>
                {text.sourceLine(
                  who(x),
                  signName(x.p.sign),
                  Math.floor(x.p.degree),
                  owner(x.p, x.s),
                  c.type ? (copy.astro.aspects[c.type] ?? c.type) : text.noAspect,
                  who(y),
                  signName(y.p.sign),
                  Math.floor(y.p.degree),
                  owner(y.p, y.s),
                )}
              </span>
            );
          })}
          <span>{text.sourceFoot}</span>
        </div>
      )}
    </>
  );
}

function AllPlanets({ mine, theirs, me, friend }: { mine: NatalChart; theirs: NatalChart; me: string; friend: string }) {
  const cell = (chart: NatalChart, body: string, left: boolean) => {
    const p = placeOf(chart, body);
    if (!p) return <td className={left ? 'lado izq' : 'lado'}>—</td>;
    const extra = p.house !== null && body !== 'Ascendant' ? ` · casa ${p.house}` : '';
    return (
      <td className={left ? 'lado izq' : 'lado'}>
        <span className="sg">
          {left ? (
            <>
              <b>{signName(p.sign)}</b> <SignGlyph sign={p.sign} />
            </>
          ) : (
            <>
              <SignGlyph sign={p.sign} /> <b>{signName(p.sign)}</b>
            </>
          )}
        </span>
        <small>
          {Math.floor(p.degree)}°{extra}
        </small>
      </td>
    );
  };
  return (
    <table className="pp">
      <thead>
        <tr>
          <th className="izq">{me}</th>
          <th />
          <th>{friend}</th>
        </tr>
      </thead>
      <tbody>
        {TABLE.map((body) => (
          <tr key={body}>
            {cell(mine, body, true)}
            <td className="centro">
              {body === 'Ascendant' ? <span className="ac">{text.acShort}</span> : <BodyGlyph body={body} />}
              <span>{bodyName(body)}</span>
            </td>
            {cell(theirs, body, false)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A comparison made before the areas: it is written again, and that uses the plan. */
function Update({ friendshipId, onGenerate, onDone }: { friendshipId: string; onGenerate: () => void; onDone: () => void }) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetchQuota('comparison').then(setQuota);
  }, []);
  const out = quota?.remaining === 0;

  const update = async () => {
    if (out && quota?.tier === 'free') {
      setPaywall(true);
      return;
    }
    onGenerate();
    try {
      await compareWithFriend(friendshipId);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'quota') setPaywall(true);
      else
        setError(
          err instanceof AiError && err.kind === 'plan_cap'
            ? copy.quota.cap(renewalDate(err.renewsOn ?? ''))
            : copy.chrome.aiError.message,
        );
    }
    onDone();
  };

  return (
    <div className="vid aviso-d">
      <p className="cuerpo" role={error ? 'alert' : undefined}>
        {error ?? text.older}
      </p>
      {quota && quota.remaining !== null && quota.remaining > 0 && (
        <p className="cupo">{copy.quota.comparisons(quota.remaining)}</p>
      )}
      {paywall ? (
        <div className="hoja">
          <Paywall feature="comparison" onDismiss={() => setPaywall(false)} />
        </div>
      ) : (
        <button type="button" className="btn p" onClick={() => void update()}>
          {text.update}
        </button>
      )}
      <p className="link">
        <Link to={`/comparacion/${encodeURIComponent(friendshipId)}`}>
          <u>{copy.comparison.result.back}</u>
        </Link>
      </p>
    </div>
  );
}
