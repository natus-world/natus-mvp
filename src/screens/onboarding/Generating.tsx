import { useEffect, useRef, useState } from 'react';
import { Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { generateSoulMap } from '@/ai/soul-map';
import type { SynthesisTrigger } from '@/lib/model-input';
import {
  calculateNatalChart,
  shouldCalculateNatalChart,
  NatalChartError,
} from '@/astrology/natal-chart';
import { currentSynthesis, saveSynthesis } from '@/store/soulMap';
import { Link } from 'react-router-dom';
import { attachSoulMap } from '@/store/session';
import { markRevelationPending } from '@/store/revelation';
import { attachSoulMapToClient, updateActiveProfile } from '@/store/account';
import { AiError } from '@/ai/client';
import type { Numerology } from '@/lib/schemas';
import type { OnboardingDraft } from '@/store/session';
import { SOUL_MAP_PROMPT_VERSION } from '@/ai/prompts/versions';
import { copy } from '@/i18n';

/**
 * PDR 6.1 screen 7 and PDR 6.5.
 *
 * The serpent turns while the map is written. The stages are
 * named rather than shown as a spinner because they are true — the numbers
 * really are computed locally before anything is sent — and saying so is part
 * of the product's claim about itself.
 *
 * In fixture mode the work finishes almost instantly, and the screen still
 * takes a few seconds on purpose. Showing an instant result would
 * misrepresent a product whose real generation takes ten to thirty seconds.
 */

const text = copy.onboarding.generating;

const STAGES = text.stages;

const MINIMUM_MS = 4800;

export function Generating({
  draft,
  numerology,
  onDone,
  onFailed,
  onCrisis,
  trigger = 'onboarding',
}: {
  draft: OnboardingDraft;
  numerology: Numerology | null;
  /** v1.2 M-02: `base_data_changed` when the person edited their birth data. */
  trigger?: SynthesisTrigger;
  onDone: () => void;
  onFailed: (message: string) => void;
  onCrisis: (error: AiError) => void;
}) {
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode double-invokes effects in development; generating twice
    // would burn two API calls on someone else's key.
    if (started.current) return;
    started.current = true;

    const timers = STAGES.map((_, i) =>
      setTimeout(() => setStage(i), (MINIMUM_MS / STAGES.length) * i),
    );

    const run = async () => {
      const floor = new Promise((resolve) => setTimeout(resolve, MINIMUM_MS));
      try {
        const generation = async () => {
          let enrichedDraft = draft;

          // There is no chart step in the UI. If the person supplied exact
          // birth data, calculate it here and persist it for every later use.
          // The chart remains optional: provider or network failure falls
          // back to the existing numerology-and-context path.
          if (!draft.natal_chart && shouldCalculateNatalChart(draft)) {
            try {
              const chart = await calculateNatalChart(draft);
              // The account's profile after signup, the session's before it.
              updateActiveProfile({ natal_chart: chart });
              enrichedDraft = { ...draft, natal_chart: chart };
            } catch (error) {
              if (!(error instanceof NatalChartError)) throw error;
            }
          }

          return generateSoulMap({ draft: enrichedDraft, numerology, trigger });
        };

        const [result] = await Promise.all([generation(), floor]);
        const stored = saveSynthesis({
          synthesis: result.value,
          numerology,
          promptVersion: SOUL_MAP_PROMPT_VERSION,
          mode: result.mode,
          latencyMs: result.latencyMs,
          model: result.model,
          trigger,
        });
        // Both records point at the synthesis, so a signup that happens after
        // this carries the map with it — and one that happened before still
        // ends up on the current map rather than the one it was created with.
        attachSoulMap(stored.id);
        attachSoulMapToClient(stored.id);
        // Package 02: a map written in onboarding is revealed once before
        // Carta shows it. A rewrite from the profile goes straight to Carta.
        if (trigger === 'onboarding') markRevelationPending(stored.id);
        onDone();
      } catch (error) {
        await floor;
        if (error instanceof AiError && error.kind === 'crisis') onCrisis(error);
        else onFailed(messageFor(error));
      }
    };

    void run();
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [draft, numerology, onDone, onFailed, onCrisis, trigger]);

  // Package 01 «Generando» (16 Oct 2026): the leaf with drops, an even veil
  // of .14, the serpent turning once every 14 s and the stages lighting up.
  return (
    <Screen photo="hojaGotas" veil={0.14} glassAlpha={0.3}>
      <div className="pz generando">
        <div className="sc">
          <p className="k">{text.kicker}</p>
          <h1 className="t mt">
            {text.titleLead}
            <em>{text.titleEmphasis}</em>
          </h1>
          <p className="cuerpo">{text.wait}</p>
        </div>

        <div className="gen-m">
          <div className="serp" aria-hidden="true">
            <Ouroboros size={110} />
          </div>
          <p className="k">{text.loading}</p>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {STAGES[stage]}
        </p>
        <ul className="etapas">
          {STAGES.map((label, i) => (
            <li
              key={label}
              className={i < stage ? 'ya' : i === stage ? 'ahora' : undefined}
              aria-current={i === stage ? 'step' : undefined}
            >
              <i aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}

/**
 * The same screen when the generation failed (PDR 6.5): the message, that
 * nothing was lost, and «Reintentar». The flows that run `Generating` keep
 * their own failure state; this is what they show for it.
 */
export function GeneratingFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  // At the day's limit a retry cannot work: somebody who restarted the steps
  // was tapping «Reintentar» every few seconds for ten minutes (QA-22, launch
  // night). Their map is offered instead, when there is one.
  const atLimit = message === text.spendLimit;
  const map = atLimit ? currentSynthesis() : undefined;
  return (
    <Screen photo="hojaGotas" veil={0.14} glassAlpha={0.3}>
      <div className="pz generando">
        <div className="sc">
          <p className="k">{text.kicker}</p>
          <p role="alert" className="fr mt">
            {message}
          </p>
        </div>
        {!atLimit ? (
          <div className="abajo">
            <button type="button" className="btn p" onClick={onRetry}>
              {text.retry}
            </button>
          </div>
        ) : map ? (
          <div className="abajo">
            <Link to="/carta" className="btn p">
              {copy.signup.required.backToMap}
            </Link>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

/** PDR 6.5: empathetic copy, never a technical error, and the input is kept. */
function messageFor(error: unknown): string {
  if (error instanceof AiError && error.kind === 'spend_limit') return text.spendLimit;
  return `${text.slow} ${text.kept}`;
}
