import { serveModel } from '../_shared/serve-model.ts';
import { soulMapInputSchema } from '../_shared/lib/model-input.ts';
import { soulMapResultSchema } from '../_shared/lib/schemas/index.ts';
import { hasFoodOrWeightSignal, lintPhysicalRisk } from '../_shared/lib/physical-risk.ts';
import { callerIsClinicallyVulnerable } from '../_shared/clinical.ts';
import {
  SOUL_MAP_PROMPT_VERSION,
  SOUL_MAP_SYSTEM_PROMPT,
  buildSoulMapUserMessage,
} from '../_shared/prompts/soul-map.ts';

/**
 * PDR 6.5, server-side.
 *
 * Effort stays at the default. This is the one call that produces a document
 * somebody keeps, is made once for the life of an account, and is read more
 * carefully than anything else in the product.
 */
Deno.serve(
  serveModel({
    purpose: 'soul_map',
    promptVersion: SOUL_MAP_PROMPT_VERSION,
    input: soulMapInputSchema,
    output: soulMapResultSchema,
    system: SOUL_MAP_SYSTEM_PROMPT,
    user: (input) => buildSoulMapUserMessage(input),
    prose: (input) => input.draft.presenting_need_text,
    check: async (output, input, { caller, userId }) => {
      if (output.detected_phase === 'crisis') return null;
      const fastingBarred =
        hasFoodOrWeightSignal({
          texts: [input.draft.presenting_need_text],
          topics: [...input.draft.presenting_need_slugs, ...output.inferred_topics],
        }) || (await callerIsClinicallyVulnerable(caller, userId));
      const violation = lintPhysicalRisk(output, { fastingBarred })[0];
      return violation ? `${violation.rule} at ${violation.path}` : null;
    },
    crisis: (output, input) =>
      output.detected_phase === 'crisis'
        ? { response: output.crisis_response, country: input.draft.country }
        : null,
    effort: 'high',
  }),
);
