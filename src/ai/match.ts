import { runAi, type AiResult } from './client';
import { MATCH_PROMPT_VERSION } from './prompts/versions';
import { buildMatchFixture } from './fixtures/match';
import { fallbackRanking, type FilterOutcome } from '@/lib/matching';
import { matchResultSchema, type MatchResult, type SoulMapSynthesis } from '@/lib/schemas';
import type { MatchSymbols } from '@/lib/model-input';
import { isDemoMode } from '@/supabase/client';

/** PDR 7.4, as a separate call from the Soul Map so therapies can be
 *  re-ranked without regenerating the narrative. */
export async function matchModalities(input: {
  synthesis: SoulMapSynthesis;
  outcome: FilterOutcome;
  presentingNeedText: string;
  /** v1.2 R-02: what the full why may cite. */
  symbols: MatchSymbols;
}): Promise<AiResult<MatchResult> & { usedFallback: boolean }> {
  try {
    const result = await runAi({
      schema: matchResultSchema,
      // Slugs, not modalities. The server rehydrates them from its own
      // catalogue so the descriptions the model reads out are ours.
      edge: {
        fn: 'match',
        body: {
          synthesis: input.synthesis,
          symbols: input.symbols,
          presentingNeedText: input.presentingNeedText,
          candidateSlugs: input.outcome.candidates.map((m) => m.slug),
          strategy: input.outcome.strategy,
          excludedForVulnerability: input.outcome.excludedForVulnerability,
          excludedForDismissal: input.outcome.excludedForDismissal,
          droppedForSize: input.outcome.droppedForSize,
          poolBeforeTruncation: input.outcome.poolBeforeTruncation,
        },
      },
      fixture: () => buildMatchFixture({ outcome: input.outcome, synthesis: input.synthesis }),
    });

    // The schema's lower bound is 1 so an honestly small pool can pass; the
    // real guard lives here, where the pool size is known. A model that
    // returns two cards out of twelve candidates has under-delivered and is
    // treated as a failure. See the note on matchResultSchema.
    const expected = Math.min(3, input.outcome.candidates.length);
    if (result.value.matched_modalities.length < expected) {
      throw new Error(
        `Expected at least ${expected} modalities from a pool of ${input.outcome.candidates.length}`,
      );
    }

    return { ...result, usedFallback: false };
  } catch (error) {
    if (!isDemoMode) throw error;
    return {
      value: deterministicMatch(input),
      mode: 'fixture',
      latencyMs: 0,
      inputTokens: null,
      outputTokens: null,
      model: null,
      usedFallback: true,
    };
  }
}

function deterministicMatch(input: {
  synthesis: SoulMapSynthesis;
  outcome: FilterOutcome;
}): MatchResult {
  const ranked = fallbackRanking(input.outcome, input.synthesis.inferred_topics, 3);
  return {
    prompt_version: `${MATCH_PROMPT_VERSION}+fallback`,
    matched_modalities: ranked.map((entry, index) => ({
      modality_slug: entry.modality.slug,
      rank: index + 1,
      reasoning: entry.reasoning,
      caution_note: entry.modality.requires_clinical_support
        ? entry.modality.contraindications.join(' ')
        : null,
    })),
  };
}
