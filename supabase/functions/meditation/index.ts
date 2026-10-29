import { serveModel } from '../_shared/serve-model.ts';
import { meditationInputSchema } from '../_shared/lib/model-input.ts';
import { meditationScriptSchema } from '../_shared/lib/schemas/index.ts';
import { BED_TRACKS } from '../_shared/lib/catalog.ts';
import { voicePassages } from '../_shared/lib/voice.ts';
import {
  MEDITATION_PROMPT_VERSION,
  MEDITATION_SYSTEM_PROMPT,
  buildMeditationUserMessage,
} from '../_shared/prompts/meditation.ts';

/**
 * PDR 9, server-side.
 *
 * The bed catalogue comes from this side rather than the request. The model
 * must choose one of the tracks that actually exist, and a caller who could
 * name the options could name one that does not — which the player then fails
 * to load, in the middle of a meditation, out loud.
 *
 * The prosody band and the break lengths are checked by the caller, in
 * `src/ai/meditation.ts`, over the script this returns. They stay there
 * because they are checks on a rendered artefact rather than on the contract,
 * and `src/lib/ssml.ts` now crosses, so moving them here later costs nothing.
 */
const ACTIVE_BEDS = BED_TRACKS.filter((bed) => bed.is_active);

Deno.serve(
  serveModel({
    purpose: 'meditation',
    plan: 'meditation',
    promptVersion: MEDITATION_PROMPT_VERSION,
    input: meditationInputSchema,
    output: meditationScriptSchema,
    system: MEDITATION_SYSTEM_PROMPT,
    user: (input, { gender }) => buildMeditationUserMessage({ ...input, beds: ACTIVE_BEDS, gender }),
    prose: (input) => input.intent,
    // The meditation's voice (owner, 29 Oct 2026): the passages to speak are
    // kept where the browser cannot write them, so the voice function reads
    // aloud only what this function wrote. Its id travels back as `stored_id`.
    store: async (output, _input, { elevated, userId }) => {
      const passages = voicePassages(output.script_ssml);
      const characters = passages.reduce((sum, p) => sum + p.text.length, 0);
      if (characters === 0) return null;
      const { data, error } = await elevated
        .from('meditation_voice_scripts')
        .insert({ user_id: userId, passages, characters })
        .select('id')
        .single();
      return error || !data ? null : (data.id as string);
    },
  }),
);
