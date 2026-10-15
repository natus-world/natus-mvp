import { serveModel } from '../_shared/serve-model.ts';
import { routineInputSchema } from '../_shared/lib/model-input.ts';
import { routineResultSchema } from '../_shared/lib/schemas/index.ts';
import { modalityBySlug } from '../_shared/lib/catalog.ts';
import { callerIsClinicallyVulnerable } from '../_shared/clinical.ts';
import { hasFoodOrWeightSignal, lintPhysicalRisk } from '../_shared/lib/physical-risk.ts';
import type { Modality } from '../_shared/lib/schemas/index.ts';
import {
  ROUTINE_PROMPT_VERSION,
  ROUTINE_SYSTEM_PROMPT,
  buildRoutineUserMessage,
} from '../_shared/prompts/routine.ts';

/**
 * v1.2 R-01: one routine, written after the therapies, seeing the map and the
 * therapies chosen. The therapies arrive as slugs and are rehydrated from this
 * side's catalogue.
 *
 * The checks are the match's, carried over with the practices: every
 * connection names a therapy that was sent, and the physical-risk lint runs
 * with fasting barred whenever the person is vulnerable or food and weight
 * appear in their topics.
 */
Deno.serve(
  serveModel({
    purpose: 'routine',
    promptVersion: ROUTINE_PROMPT_VERSION,
    input: routineInputSchema,
    output: routineResultSchema,
    system: ROUTINE_SYSTEM_PROMPT,
    user: (input, { gender }) =>
      buildRoutineUserMessage({
        synthesis: input.synthesis,
        modalities: input.modalitySlugs.map((slug) => modalityBySlug(slug) as Modality),
        gender,
      }),
    check: async (output, input, { caller, userId }) => {
      const sent = new Set(input.modalitySlugs);
      for (const practice of output.practices) {
        const slug = practice.connects_to.modality_slug;
        if (slug !== null && !sent.has(slug)) return `practice connects to ${slug}, which was not recommended`;
        if (!practice.connects_to.soul_map && slug === null) return 'a practice that connects to nothing';
      }
      const fastingBarred =
        hasFoodOrWeightSignal({ texts: [], topics: input.synthesis.inferred_topics }) ||
        (await callerIsClinicallyVulnerable(caller, userId));
      const violation = lintPhysicalRisk(output, { fastingBarred })[0];
      return violation ? `${violation.rule} at ${violation.path}` : null;
    },
  }),
);
