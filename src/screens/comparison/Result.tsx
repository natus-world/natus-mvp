import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { compareWithFriend } from '@/ai/comparison';
import { AiError } from '@/ai/client';
import { Paywall } from '@/components/Paywall';
import { activeProfile } from '@/store/account';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import type { ComparisonResult } from '@/lib/schemas';
import { friendCharts, latestComparison } from '@/store/comparison';
import { listFriends } from '@/store/friends';
import { ComparisonGate } from './Gate';
import { Arrow, firstNameOf, initialOf, useWide } from './pieces';
import { TheChart, type Charts } from './TheChart';

const text = copy.comparison.result;
const KIND_LABEL = text.kind;

type State =
  | { kind: 'loading' }
  | { kind: 'not-friends' }
  | { kind: 'none'; friend: string }
  | { kind: 'generating'; friend: string }
  | { kind: 'failed'; friend: string; message?: string }
  | { kind: 'ready'; friend: string; result: ComparisonResult; askedByMe: boolean; charts: Charts };

type Aspect = ComparisonResult['astro_dialogue']['aspects'][number];

/**
 * The comparison between two friends (v1.2 C-02; package 15, 16 Oct 2026):
 * before comparing, crossing, and the crossing itself — four parts, the
 * numbers and the aspects they rest on, and the balance between flow and
 * friction. Nothing is graded: an aspect flows naturally or asks for more
 * work.
 *
 * Read from the server on every visit, never kept: the policy decides on each
 * read whether the two are still friends, so a friendship that ended shows
 * nothing here on the next visit.
 *
 * Generating costs the person asking, so it waits for a tap rather than
 * starting on its own.
 */
export function Result() {
  const { friendshipId = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  // v1.2 F-01: what the plan has left, said before it is used.
  const [quota, setQuota] = useState<Quota | null>(null);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const me = firstNameOf(activeProfile()?.draft.legal_birth_name);

  const load = useCallback(async () => {
    try {
      const friend = (await listFriends()).find((f) => f.friendshipId === friendshipId);
      if (!friend) {
        setState({ kind: 'not-friends' });
        return;
      }
      const [stored, charts] = await Promise.all([latestComparison(friendshipId), friendCharts(friendshipId).catch(() => null)]);
      setState(
        stored
          ? { kind: 'ready', friend: friend.firstName, result: stored.result, askedByMe: stored.askedByMe, charts }
          : { kind: 'none', friend: friend.firstName },
      );
    } catch {
      setState({ kind: 'not-friends' });
    }
  }, [friendshipId]);

  useEffect(() => {
    void load();
    void fetchQuota('comparison').then(setQuota);
  }, [load]);

  const generate = async (friend: string) => {
    setState({ kind: 'generating', friend });
    try {
      const outcome = await compareWithFriend(friendshipId);
      const charts = await friendCharts(friendshipId).catch(() => null);
      // The function writes the one who asked as `a`.
      setState({ kind: 'ready', friend, result: outcome.value, askedByMe: true, charts });
      void fetchQuota('comparison').then(setQuota);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'quota') {
        setPaywallDismissed(false);
        void fetchQuota('comparison').then(setQuota);
        setState({ kind: 'none', friend });
        return;
      }
      setState({
        kind: 'failed',
        friend,
        ...(err instanceof AiError && err.kind === 'plan_cap'
          ? { message: copy.quota.cap(renewalDate(err.renewsOn ?? '')) }
          : {}),
      });
    }
  };

  if (state.kind === 'loading' || state.kind === 'generating') {
    return <Crossing friend={state.kind === 'generating' ? state.friend : null} me={me} />;
  }

  if (state.kind === 'not-friends') {
    return (
      <ComparisonGate>
        <Screen photo="travertino" veil={0.45} glassAlpha={0.84}>
          <div className="pz comparar antes">
            <div className="sc">
              <div className="d-izq">
                <p className="k">{copy.comparison.home.kicker}</p>
                <div className="vid bloque-c">
                  <p className="cuerpo">{text.notFriends}</p>
                </div>
                <Link to={PATHS.comparison} className="btn s sola">
                  {text.back}
                </Link>
              </div>
            </div>
          </div>
        </Screen>
      </ComparisonGate>
    );
  }

  if (state.kind === 'none' || state.kind === 'failed') {
    const out = quota?.remaining === 0;
    const paywall = out && quota.tier === 'free' && !paywallDismissed;
    return (
      <ComparisonGate>
        <Screen photo="travertino" veil={0.45} glassAlpha={0.84}>
          <div className="pz comparar antes">
            <div className="sc">
              <div className="d-izq">
                <p className="k">{copy.comparison.home.kicker}</p>
                <h1 className="t mt">
                  {text.introTitleLead}
                  <em>{state.friend}</em>
                </h1>
                <div className="vid bloque-c">
                  <p className="cuerpo" role={state.kind === 'failed' ? 'alert' : undefined}>
                    {state.kind === 'failed' ? (state.message ?? copy.chrome.aiError.message) : text.intro(state.friend)}
                  </p>
                </div>
                {quota && quota.remaining !== null && quota.remaining > 0 && (
                  <p className="cupo">{copy.quota.comparisons(quota.remaining)}</p>
                )}
                {out && quota.tier === 'premium' && <p className="cupo">{copy.quota.usedThisMonth(renewalDate(quota.renewsOn))}</p>}
                {paywall && (
                  <div className="hoja">
                    <Paywall feature="comparison" onDismiss={() => setPaywallDismissed(true)} />
                  </div>
                )}
                <div className="botones">
                  {!paywall && (
                    <button type="button" className="btn p" disabled={out} onClick={() => void generate(state.friend)}>
                      {state.kind === 'failed' ? copy.chrome.aiError.retry : text.compare}
                      <Arrow />
                    </button>
                  )}
                  <p className="link">
                    <Link to={PATHS.comparison}>
                      <u>{text.back}</u>
                    </Link>
                  </p>
                </div>
              </div>
              <div className="mesa" aria-hidden="true">
                <div className="par">
                  <span>{initialOf(state.friend)}</span>
                  <span>{initialOf(me)}</span>
                </div>
                <Vesica friend={state.friend} me={me} />
              </div>
            </div>
          </div>
        </Screen>
      </ComparisonGate>
    );
  }

  const aName = state.askedByMe ? me : state.friend;
  const bName = state.askedByMe ? state.friend : me;
  return (
    <ComparisonGate>
      <Screen photo="orilla" veil={0.3} glassAlpha={0.77}>
        <Crossed
          result={state.result}
          friendshipId={friendshipId}
          aName={aName}
          bName={bName}
          me={me}
          friend={state.friend}
          charts={state.charts}
          askedByMe={state.askedByMe}
        />
      </Screen>
    </ComparisonGate>
  );
}

/* ── Crossing: the serpent, and on desktop the two circles closing in ──── */

export function Crossing({ friend, me }: { friend: string | null; me: string }) {
  return (
    <ComparisonGate>
      <Screen photo="ola" veil={0.18} glassAlpha={0.48}>
        <div className="pz comparar cruzando mar">
          <div className="sc">
            <div className="d-izq">
              <p className="k">{copy.comparison.home.kicker}</p>
              <h1 className="t mt">
                {text.generatingTitleLead}
                <em>{text.generatingTitleEmphasis}</em>
              </h1>
            </div>
          </div>
          <div className="gen-m" role="status">
            {friend !== null && <Vesica friend={friend} me={me} crossing />}
            <span className="serp">
              <Ouroboros size={177} />
            </span>
            <p className="k">{text.generatingLabel}</p>
          </div>
        </div>
      </Screen>
    </ComparisonGate>
  );
}

/** Desktop: the two circles, crossed; the lens is what they share. */
function Vesica({ friend, me, crossing = false }: { friend: string; me: string; crossing?: boolean }) {
  const [a, b] = crossing ? [215, 305] : [170, 350];
  return (
    <div className={crossing ? 'vesica x' : 'vesica'} aria-hidden="true">
      <svg className="lente" viewBox="0 0 520 340">
        <clipPath id={crossing ? 'lente-c' : 'lente-a'}>
          <circle cx={a} cy="170" r="150" />
        </clipPath>
        <circle cx={b} cy="170" r="150" clipPath={`url(#${crossing ? 'lente-c' : 'lente-a'})`} />
      </svg>
      <div className="circ ca">
        <b>{initialOf(friend)}</b>
      </div>
      <div className="circ cb">
        <b>{initialOf(me)}</b>
      </div>
    </div>
  );
}

/* ── El cruce ─────────────────────────────────────────────────────────── */

/** «Camila y Fernanda, lado a lado»: what follows the last comma in italics. */
function Headline({ children }: { children: string }) {
  const cut = children.lastIndexOf(', ');
  if (cut < 0) return <h1 className="t mt">{children}</h1>;
  return (
    <h1 className="t mt">
      {children.slice(0, cut + 2)}
      <em>{children.slice(cut + 2)}</em>
    </h1>
  );
}

type Sides = { aName: string; bName: string };

function Crossed({
  result,
  friendshipId,
  me,
  friend,
  charts,
  askedByMe,
  ...sides
}: { result: ComparisonResult; friendshipId: string; me: string; friend: string; charts: Charts; askedByMe: boolean } & Sides) {
  const wide = useWide();
  const chart = (
    <TheChart
      aspects={result.astro_dialogue.aspects}
      summary={result.astro_dialogue.summary}
      charts={charts}
      askedByMe={askedByMe}
      aName={sides.aName}
      bName={sides.bName}
      me={me}
      friend={friend}
      friendshipId={friendshipId}
      stacked={!wide}
    />
  );
  const parts: [string, readonly string[]][] = [
    [text.loBueno, result.lo_bueno],
    [text.tenerEnCuenta, result.tener_en_cuenta],
    [text.queTrabajar, result.que_trabajar],
    [text.disfrutarJuntos, result.disfrutar_juntos],
  ];
  const aspects = result.astro_dialogue.aspects;
  const end = (
    <>
      <p className="disc">{text.disclaimer}</p>
      <div className="acciones">
        <Link to={`${PATHS.chat}?comparacion=${encodeURIComponent(friendshipId)}`} className="btn s">
          {text.talkOver}
        </Link>
        <p className="link">
          <Link to={PATHS.comparison}>
            <u>{text.back}</u>
          </Link>
        </p>
      </div>
    </>
  );

  if (!wide) {
    return (
      <div className="pz comparar cruce mar">
        <div className="sc">
          <p className="k">{text.kicker}</p>
          <Headline>{result.headline}</Headline>
          <Balance aspects={aspects} />
          {parts.map(([title, lines]) => (
            <Part key={title} title={title} lines={lines} />
          ))}
          <Numbers dialogue={result.numerology_dialogue} {...sides} />
          {chart}
          {end}
        </div>
      </div>
    );
  }

  return (
    <div className="pz comparar cruce mar">
      <div className="d-izq cruce">
        <p className="k">{text.kicker}</p>
        <Headline>{result.headline}</Headline>
        <Balance aspects={aspects} />
        {chart}
      </div>
      <div className="col-c">
        <Hand parts={parts} />
        <Numbers dialogue={result.numerology_dialogue} dialogo {...sides} />
        {end}
      </div>
    </div>
  );
}

function Part({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <section className="vid bloque-c" aria-label={title}>
      <h2 className="k">{title}</h2>
      <ul className="lineas">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function Numbers({
  dialogue,
  dialogo = false,
  aName,
  bName,
}: { dialogue: ComparisonResult['numerology_dialogue']; dialogo?: boolean } & Sides) {
  return (
    <section className="vid bloque-c" aria-label={text.numbers}>
      <h2 className="k">{text.numbers}</h2>
      {dialogue.summary && <p className="sum">{dialogue.summary}</p>}
      {dialogue.pairs.map((pair) =>
        dialogo ? (
          <article key={pair.kind} className="par-n2">
            <div className="dialogo">
              <div className="lado">
                <b>{pair.a_number}</b>
                {aName}
              </div>
              <h3 className="q">{KIND_LABEL[pair.kind] ?? pair.kind}</h3>
              <div className="lado">
                <b>{pair.b_number}</b>
                {bName}
              </div>
            </div>
            <p className="r">{pair.reading}</p>
          </article>
        ) : (
          <article key={pair.kind} className="par-n">
            <h3 className="q">{KIND_LABEL[pair.kind] ?? pair.kind}</h3>
            <p className="n">
              {pair.a_number} · {pair.b_number}
            </p>
            <p className="r">{pair.reading}</p>
          </article>
        ),
      )}
    </section>
  );
}

/* ── Desktop: the hand of four cards ──────────────────────────────────── */

/** Two circles in four relations, one for each part. */
const MOTIFS: ReactNode[] = [
  <>
    <circle cx="25" cy="20" r="14" />
    <circle cx="39" cy="20" r="14" />
  </>,
  <>
    <circle cx="18" cy="20" r="14" />
    <circle cx="46" cy="20" r="14" />
  </>,
  <>
    <circle cx="14" cy="20" r="11" />
    <circle cx="50" cy="20" r="11" />
    <path d="M25 20h14" />
  </>,
  <>
    <circle cx="32" cy="20" r="16" />
    <circle cx="32" cy="20" r="8" />
  </>,
];
const TILT = [-11, -4, 4, 11];

function Hand({ parts }: { parts: [string, readonly string[]][] }) {
  const [open, setOpen] = useState(0);
  const [title, lines] = parts[open]!;
  return (
    <>
      <p className="k centro">{text.tapCard}</p>
      <div className="mano">
        {parts.map(([name], i) => (
          <button
            key={name}
            type="button"
            className={open === i ? 'carta-m on' : 'carta-m'}
            aria-pressed={open === i}
            style={{ '--cx': 48 + i * 112, '--rot': TILT[i] } as CSSProperties}
            onClick={() => setOpen(i)}
          >
            <span className="num-c">{text.cardOf(i + 1, parts.length)}</span>
            <svg viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth={0.9} aria-hidden="true">
              {MOTIFS[i]}
            </svg>
            <b>{name}</b>
          </button>
        ))}
      </div>
      <section className="vid lectura" aria-live="polite" aria-label={title}>
        <h2 className="k">{title}</h2>
        <ul className="lineas">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ── The balance ──────────────────────────────────────────────────────── */

const FLOW = new Set(['trine', 'sextile']);
const FRICTION = new Set(['square', 'opposition']);

function flows(a: Aspect): boolean {
  return a.flow ? a.flow === 'fluye' : FLOW.has(a.type.toLowerCase());
}

function works(a: Aspect): boolean {
  return a.flow ? a.flow === 'pide_trabajo' : FRICTION.has(a.type.toLowerCase());
}

/**
 * v1.2 C-02: the balance between flow and friction, with no number on it and
 * friction drawn with the same weight as flow (striped, not fainter). Counted
 * from what the model decided for each aspect (A-02); a comparison made
 * before that is counted by type, where a conjunction goes either way and
 * counts for neither. Hidden when there is nothing to count.
 */
function Balance({ aspects }: { aspects: readonly Aspect[] }) {
  const flow = aspects.filter(flows).length;
  const friction = aspects.filter(works).length;
  if (flow + friction === 0) return null;

  return (
    <section className="vid bloque-c" aria-label={text.balance}>
      <h2 className="k">{text.balance}</h2>
      <div className="balance" aria-hidden="true">
        {flow > 0 && <i className="flu" style={{ flexGrow: flow }} />}
        {friction > 0 && <i className="fri" style={{ flexGrow: friction }} />}
      </div>
      <div className="bal-l" aria-hidden="true">
        <span>{text.flow}</span>
        <span>{text.friction}</span>
      </div>
    </section>
  );
}
