import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { compareWithFriend } from '@/ai/comparison';
import type { ComparisonResult } from '@/lib/schemas';
import { latestComparison } from '@/store/comparison';
import { listFriends } from '@/store/friends';
import { ComparisonGate } from './Gate';

const text = copy.comparison.result;
const KIND_LABEL = text.kind;

type State =
  | { kind: 'loading' }
  | { kind: 'not-friends' }
  | { kind: 'none'; friend: string }
  | { kind: 'generating'; friend: string }
  | { kind: 'failed'; friend: string }
  | { kind: 'ready'; friend: string; result: ComparisonResult };

/**
 * The comparison between two friends (v1.2 C-02): four parts, the numbers
 * and the aspects they rest on, and the balance between flow and friction.
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

  const load = useCallback(async () => {
    try {
      const friend = (await listFriends()).find((f) => f.friendshipId === friendshipId);
      if (!friend) {
        setState({ kind: 'not-friends' });
        return;
      }
      const stored = await latestComparison(friendshipId);
      setState(
        stored
          ? { kind: 'ready', friend: friend.firstName, result: stored.result }
          : { kind: 'none', friend: friend.firstName },
      );
    } catch {
      setState({ kind: 'not-friends' });
    }
  }, [friendshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (friend: string) => {
    setState({ kind: 'generating', friend });
    try {
      const outcome = await compareWithFriend(friendshipId);
      setState({ kind: 'ready', friend, result: outcome.value });
    } catch {
      setState({ kind: 'failed', friend });
    }
  };

  if (state.kind === 'loading' || state.kind === 'generating') {
    return (
      <Centered>
        <Ouroboros size={88} />
        <p role="status" className="font-serif text-[length:var(--fs-voice-19)] font-light text-blanco">
          {text.loading}
        </p>
      </Centered>
    );
  }

  if (state.kind === 'not-friends') {
    return (
      <Centered>
        <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/70">{text.notFriends}</p>
        <Link to={PATHS.comparison} className="cta no-underline">
          {text.back}
        </Link>
      </Centered>
    );
  }

  if (state.kind === 'none' || state.kind === 'failed') {
    return (
      <Centered>
        <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/70">
          {state.kind === 'failed' ? copy.chrome.aiError.message : text.intro(state.friend)}
        </p>
        <button type="button" className="cta" onClick={() => void generate(state.friend)}>
          {state.kind === 'failed' ? copy.chrome.aiError.retry : text.compare}
        </button>
        <Link to={PATHS.comparison} className="chip chip-p10 text-crema/60 no-underline">
          {text.back}
        </Link>
      </Centered>
    );
  }

  const { result } = state;

  return (
    <ComparisonGate>
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
          <p className="eyebrow mb-3">{text.kicker}</p>
          <h1 className="mb-6 text-[length:var(--fs-title-26)] leading-[var(--lh-heading-1_18)] text-blanco">
            {result.headline}
          </h1>

          <Balance aspects={result.astro_dialogue.aspects} />

          <Part title={text.loBueno} lines={result.lo_bueno} />
          <Part title={text.tenerEnCuenta} lines={result.tener_en_cuenta} />
          <Part title={text.queTrabajar} lines={result.que_trabajar} />
          <Part title={text.disfrutarJuntos} lines={result.disfrutar_juntos} />

          <section className="mb-6">
            <h2 className="eyebrow mb-2.5">{text.numbers}</h2>
            <p className="mb-3 text-[length:var(--fs-body-13)] leading-relaxed text-blanco/85">
              {result.numerology_dialogue.summary}
            </p>
            <div className="flex flex-col gap-2.5">
              {result.numerology_dialogue.pairs.map((pair) => (
                <article key={pair.kind} className="surface surface-p14">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <h3 className="text-[length:var(--fs-heading-12)] tracking-wide text-crema/60 uppercase">
                      {KIND_LABEL[pair.kind] ?? pair.kind}
                    </h3>
                    <span className="shrink-0 font-serif text-[length:var(--fs-voice-17)] text-crema">
                      {pair.a_number} · {pair.b_number}
                    </span>
                  </div>
                  <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/70">{pair.reading}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h2 className="eyebrow mb-2.5">{text.chart}</h2>
            <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/60">
              {result.astro_dialogue.summary}
            </p>
            {/*
             * Every aspect here was computed by the ephemeris and checked
             * against that list server-side before this rendered. The bodies
             * and the aspect are the calculation; only the reading is the
             * model's.
             */}
            {result.astro_dialogue.aspects.length > 0 && (
              <div className="mt-3 flex flex-col gap-2.5">
                {result.astro_dialogue.aspects.map((aspect) => (
                  <article key={`${aspect.a_body}-${aspect.type}-${aspect.b_body}`} className="surface surface-p12">
                    <p className="mb-1 text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">
                      {aspect.a_body} · {aspect.type} · {aspect.b_body}
                    </p>
                    <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/70">{aspect.reading}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="mb-6 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-3 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {text.disclaimer}
          </p>

          <Link to={PATHS.comparison} className="chip chip-p10 mb-4 text-center text-crema/60 no-underline">
            {text.back}
          </Link>
        </div>
      </Screen>
    </ComparisonGate>
  );
}

function Part({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <section className="mb-6">
      <h2 className="eyebrow mb-2.5">{title}</h2>
      <ul className="flex list-none flex-col gap-2 p-0">
        {lines.map((line) => (
          <li key={line} className="text-[length:var(--fs-body-12_5)] leading-relaxed text-blanco/85">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

const FLOW = new Set(['trine', 'sextile']);
const FRICTION = new Set(['square', 'opposition']);

/**
 * v1.2 C-02: the balance between flow and friction, with no number on it and
 * friction drawn with the same weight as flow. Counted from the aspects the
 * ephemeris computed; a conjunction can go either way, so it counts for
 * neither. Hidden when there is nothing to count.
 */
function Balance({ aspects }: { aspects: ComparisonResult['astro_dialogue']['aspects'] }) {
  const flow = aspects.filter((a) => FLOW.has(a.type.toLowerCase())).length;
  const friction = aspects.filter((a) => FRICTION.has(a.type.toLowerCase())).length;
  if (flow + friction === 0) return null;

  return (
    <section className="mb-6" aria-label={text.balance}>
      <h2 className="eyebrow mb-2.5">{text.balance}</h2>
      <div className="flex h-2 overflow-hidden rounded-full">
        <div className="bg-crema/70" style={{ flexGrow: flow }} />
        <div className="w-0.5 bg-transparent" />
        <div className="bg-tierra" style={{ flexGrow: friction }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[length:var(--fs-label-11)] tracking-wide text-crema/60 uppercase">
        <span>{text.flow}</span>
        <span>{text.friction}</span>
      </div>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <ComparisonGate>
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center sm:min-h-0 sm:flex-1">
          {children}
        </div>
      </Screen>
    </ComparisonGate>
  );
}
