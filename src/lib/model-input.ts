import { z } from 'zod';
import { numerologySchema, soulMapSynthesisSchema } from './schemas/index.ts';
import { filterStrategySchema } from './matching.ts';
import { modalityBySlug } from './catalog.ts';
import { MAIN_POINTS, SIGNS } from './natal-chart.ts';

/**
 * What the browser is allowed to say about itself, for every surface that has
 * a server implementation.
 *
 * One file rather than one per function, because these are five statements of
 * the same rule and reading them side by side is the only way to notice that
 * one of them has grown a field the others would refuse. It lives in
 * `src/lib` so the prompts can take their input types from here and the
 * functions can validate against the same objects, under the parity test.
 *
 * **The context is the person's own data, echoed back from their own device,
 * and that is why it is accepted rather than re-read from Postgres.** Someone
 * who edits their synthesis before sending it changes only the reading they
 * get about themselves; there is no other subject to reach and no privilege
 * to gain. The things they must *not* be able to state are absent by
 * construction: no `clinical_basics` field exists here, so PDR 10.2 is a
 * shape rather than an intention, and neither crisis nor quota is decided
 * from anything in this file.
 *
 * **The bounds are not validation for its own sake.** Every string below
 * becomes prompt tokens charged to the deployment's key, so an unbounded
 * history is a way to spend somebody else's money one request at a time.
 */

const MAX_TURNS = 8;
const MAX_TURN_CHARS = 4_000;
/** A match reasoning is 2 to 4 sentences; this is room for that and no more. */
const MAX_REASON_CHARS = 1_200;
const MAX_PROSE = 8_000;
/**
 * Astrologer's XML context.
 *
 * A real chart measures about 10,000 characters. The cap was 250,000, copied
 * from the natal-chart function's own bound on what it will store — which is
 * the wrong number to reuse here, because this one is not storage, it is
 * prompt tokens. Twenty-five times the real size is 67,000 tokens of input
 * somebody else pays for. Four times is headroom; twenty-five is a hole.
 */
const MAX_CHART = 40_000;

const slug = z.string().trim().min(1).max(80);
const slugs = z.array(slug).max(60);

export const grammaticalGenderSchema = z.enum(['femenino', 'masculino', 'neutro']);
export type GrammaticalGender = z.infer<typeof grammaticalGenderSchema>;

export function readGrammaticalGender(value: unknown): GrammaticalGender {
  const parsed = grammaticalGenderSchema.safeParse(value);
  return parsed.success ? parsed.data : 'neutro';
}

export const synthesisTriggerSchema = z.enum([
  'onboarding',
  'base_data_changed',
  'memory_shift',
  'monthly',
  'admin',
]);
export type SynthesisTrigger = z.infer<typeof synthesisTriggerSchema>;

/**
 * Split in two, and the split is the safety ordering.
 *
 * Safety runs before anything else can answer, so what safety needs must be
 * validated before anything else can reject. A person in crisis whose context
 * is half-built — a stale synthesis, a field this deployment has not shipped
 * yet — must still be met with a hotline, not with a 400. The envelope is all
 * that stands between a request and `scanText`; the model context is parsed
 * afterwards, once safety and the quota have both had their say.
 */
export const chatEnvelopeSchema = z.object({
  message: z.string().trim().min(1).max(MAX_TURN_CHARS),
  /** Chooses the crisis resource list. Not trusted for anything else. */
  country: z.string().trim().length(2).default('CL'),
});

export const chatContextSchema = z.object({
  synthesis: soulMapSynthesisSchema,
  numerology: numerologySchema.nullable().default(null),
  /** PDR 10.2. A derived level, never the answers it came from. */
  risk: z.enum(['none', 'elevated', 'high']).default('none'),
  recommendedSlugs: slugs.default([]),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(MAX_TURN_CHARS) }))
    .max(MAX_TURNS)
    .default([]),
});
export type ChatContext = z.infer<typeof chatContextSchema>;

/**
 * The onboarding draft, narrowed to what the prompt actually reads.
 *
 * `OnboardingDraft` has a `clinical_basics` field and this does not, which is
 * the whole point: the Soul Map prompt never referenced it, and now it cannot
 * receive it either. The narrowing also lets `prompts/soul-map.ts` cross into
 * `_shared` without dragging `src/store` behind it.
 */
export const soulMapDraftSchema = z.object({
  legal_birth_name: z.string().trim().max(160),
  birth_date: z.string().trim().max(40),
  birth_time: z.string().trim().max(20).default(''),
  birth_city: z.string().trim().max(120).default(''),
  country: z.string().trim().max(40).default('CL'),
  presenting_need_text: z.string().max(MAX_PROSE).default(''),
  presenting_need_slugs: slugs.default([]),
  openness_to_modalities: slugs.default([]),
  natal_chart: z
    .object({
      context: z.string().max(MAX_CHART),
      parse_status: z.literal('parsed'),
    })
    .nullable()
    .default(null),
});
export type SoulMapDraft = z.infer<typeof soulMapDraftSchema>;

export const soulMapInputSchema = z.object({
  draft: soulMapDraftSchema,
  numerology: numerologySchema.nullable().default(null),
  trigger: synthesisTriggerSchema.default('onboarding'),
});

/**
 * The pool, by reference rather than by value.
 *
 * The candidates arrive as slugs and the function rehydrates them from its
 * own copy of `data/modalities.json`. Sending the modality objects would have
 * worked and would have let a caller describe a therapy that does not exist —
 * or quietly edit the contraindications of one that does, which the model
 * then reads out as ours.
 */
/**
 * v1.2 R-02: what the full why may cite from the person's symbols — the
 * numbers already calculated and the main placements of the chart, by whole
 * sign. Null when there is none; never guessed.
 */
export const matchSymbolsSchema = z
  .object({
    numerology: numerologySchema.nullable().default(null),
    chart: z
      .array(
        z.object({
          name: z.enum(MAIN_POINTS),
          sign: z.enum(SIGNS),
          house: z.number().int().min(1).max(12).nullable(),
        }),
      )
      .max(MAIN_POINTS.length)
      .nullable()
      .default(null),
  })
  .default({ numerology: null, chart: null });
export type MatchSymbols = z.infer<typeof matchSymbolsSchema>;

export const matchInputSchema = z
  .object({
    synthesis: soulMapSynthesisSchema,
    symbols: matchSymbolsSchema,
    presentingNeedText: z.string().max(MAX_PROSE).default(''),
    candidateSlugs: slugs.min(1),
    strategy: filterStrategySchema,
    excludedForVulnerability: slugs.default([]),
    excludedForDismissal: slugs.default([]),
    droppedForSize: z.number().int().min(0).max(500).default(0),
    poolBeforeTruncation: z.number().int().min(0).max(500).default(0),
  })
  .superRefine((value, ctx) => {
    // Every slug must name a therapy that exists. A pool with a hole in it
    // would reach the model as a shorter list and come back as a ranking of
    // whatever was left, with nothing anywhere saying one went missing.
    for (const candidate of value.candidateSlugs) {
      if (!modalityBySlug(candidate)) {
        ctx.addIssue({ code: 'custom', message: `unknown modality: ${candidate}` });
      }
    }
  });

/**
 * v1.2 R-01: the routine, asked for once the therapies are chosen. The
 * therapies travel as slugs, rehydrated from the function's own catalogue, so
 * a caller cannot describe a therapy the model then quotes.
 *
 * `reasons` carries, per therapy, why the match recommended it to this
 * person — its own reasoning, so the routine understands the choice and not
 * only the therapy. Optional, keyed by a slug that was sent.
 */
export const routineInputSchema = z
  .object({
    synthesis: soulMapSynthesisSchema,
    modalitySlugs: slugs.max(5).default([]),
    reasons: z.record(slug, z.string().trim().min(1).max(MAX_REASON_CHARS)).default({}),
  })
  .superRefine((value, ctx) => {
    for (const slug of value.modalitySlugs) {
      if (!modalityBySlug(slug)) ctx.addIssue({ code: 'custom', message: `unknown modality: ${slug}` });
    }
    for (const slug of Object.keys(value.reasons)) {
      if (!value.modalitySlugs.includes(slug)) {
        ctx.addIssue({ code: 'custom', message: `a reason for ${slug}, which was not sent` });
      }
    }
  });

/** The bed catalogue is not in here either: the function reads its own. */
export const meditationInputSchema = z.object({
  intent: z.string().trim().min(1).max(MAX_TURN_CHARS),
  minutes: z.number().int().min(1).max(60),
  synthesis: soulMapSynthesisSchema.nullable().default(null),
  risk: z.enum(['none', 'elevated', 'high']).default('none'),
});

const chartPositionSchema = z.object({
  body: z.string().trim().min(1).max(60),
  sign: z.string().trim().min(1).max(60),
  house: z.number().int().min(1).max(12).nullable(),
});

const comparisonBirthSchema = z.object({
  year: z.number().int().min(1).max(3000),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  city: z.string().trim().min(1).max(120),
  nation: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/),
});

const comparisonSubjectSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  numerology: numerologySchema.nullable(),
  soul_map_themes: slugs,
  chart: z.object({
    available: z.boolean(),
    positions: z.array(chartPositionSchema).max(40),
  }),
  /** Goes to the ephemeris and stops there. No prompt reads it. */
  birth: comparisonBirthSchema.nullable().default(null),
});

const synastryAspectSchema = z.object({
  a_body: z.string().trim().min(1).max(60),
  b_body: z.string().trim().min(1).max(60),
  type: z.string().trim().min(1).max(60),
  orb: z.number(),
});

/**
 * What the browser sends to compare charts with a friend (v1.2 C-01): which
 * friendship, and nothing else. The function builds the payload from both
 * people's stored data after checking the friendship is accepted, so neither
 * friend's birth data ever passes through the other's browser.
 */
export const comparisonRequestSchema = z.object({
  friendship_id: z.string().uuid(),
});

/**
 * Validated again on arrival, having already been built by
 * `buildComparisonPayload`'s allow-list. The two are not redundant: the
 * allow-list decides what may leave one browser, and this decides what the
 * deployment's key will pay to read. A payload that grew a field in transit
 * is refused here rather than forwarded.
 */
export const comparisonInputSchema = z.object({
  scope: z.object({
    numerology: z.boolean(),
    astro: z.boolean(),
    soul_map_themes: z.boolean(),
  }),
  a: comparisonSubjectSchema,
  b: comparisonSubjectSchema,
  /**
   * Must arrive empty, and `.max(0)` is what says so rather than a comment.
   *
   * The function fills this from the ephemeris. A caller who could supply
   * aspects would be handing the model a list of placements to read out as
   * fact — rule 5 of PDR 8.5 broken from outside the model, where the check
   * that guards it would never look.
   */
  aspects: z.array(synastryAspectSchema).max(0).default([]),
});
