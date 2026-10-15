import { useEffect, useRef, useState } from 'react';
import { PHOTO, Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { generateSoulMap } from '@/ai/soul-map';
import {
  calculateNatalChart,
  shouldCalculateNatalChart,
  NatalChartError,
} from '@/astrology/natal-chart';
import { saveSynthesis } from '@/store/soulMap';
import { attachSoulMap, updateDraft } from '@/store/session';
import { attachSoulMapToClient } from '@/store/account';
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
}: {
  draft: OnboardingDraft;
  numerology: Numerology | null;
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
              updateDraft({ natal_chart: chart });
              enrichedDraft = { ...draft, natal_chart: chart };
            } catch (error) {
              if (!(error instanceof NatalChartError)) throw error;
            }
          }

          return generateSoulMap({ draft: enrichedDraft, numerology });
        };

        const [result] = await Promise.all([generation(), floor]);
        const stored = saveSynthesis({
          synthesis: result.value,
          numerology,
          promptVersion: SOUL_MAP_PROMPT_VERSION,
          mode: result.mode,
          latencyMs: result.latencyMs,
          model: result.model,
          trigger: 'onboarding',
        });
        // Both records point at the synthesis, so a signup that happens after
        // this carries the map with it — and one that happened before still
        // ends up on the current map rather than the one it was created with.
        attachSoulMap(stored.id);
        attachSoulMapToClient(stored.id);
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
  }, [draft, numerology, onDone, onFailed, onCrisis]);

  return (
    <Screen backdrop="sala" scrim="diagonal" opacity={PHOTO.veil70}>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-9 px-8 text-center sm:min-h-0 sm:flex-1">
        <Ouroboros size={112} />

        <div aria-live="polite" className="min-h-12">
          <p className="font-serif text-[length:var(--fs-voice-22)] leading-snug font-light text-blanco">
            {STAGES[stage]}
          </p>
          <p className="mt-2 text-[length:var(--fs-body-11)] tracking-wide text-crema/55">
            {text.wait}
          </p>
        </div>
      </div>
    </Screen>
  );
}

/** PDR 6.5: empathetic copy, never a technical error, and the input is kept. */
function messageFor(error: unknown): string {
  if (error instanceof AiError && error.kind === 'spend_limit') return text.spendLimit;
  return `${text.slow} ${text.kept}`;
}
