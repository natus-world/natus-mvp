import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { serveModel } from '../_shared/serve-model.ts';
import { comparisonRequestSchema, type GrammaticalGender } from '../_shared/lib/model-input.ts';
import { comparisonResultSchema } from '../_shared/lib/schemas/index.ts';
import {
  buildComparisonPayload,
  inventedAspect,
  readStoredChart,
  withCrossAspects,
  type ComparisonPayload,
  type ComparisonSource,
} from '../_shared/lib/comparison-payload.ts';
import { computeNumerology } from '../_shared/lib/numerology.ts';
import { areasProblem } from '../_shared/lib/comparison-areas.ts';
import { lintChartJudgement } from '../_shared/lib/copy-lint.ts';
import type { NatalChart } from '../_shared/lib/natal-chart.ts';
import { callerIsClinicallyVulnerable } from '../_shared/clinical.ts';
import {
  COMPARISON_PROMPT_VERSION,
  COMPARISON_SYSTEM_PROMPT,
  buildComparisonUserMessage,
} from '../_shared/prompts/comparison.ts';

/**
 * Two friends' charts, compared. PDR 8.5 as changed by v1.2 C-01 and C-02.
 *
 * The browser sends a friendship id and nothing else. Everything the model
 * reads is built here, from both people's stored birth data, after checking
 * the friendship is accepted — so neither friend's data ever passes through
 * the other's browser, and nobody can compare against a chart they typed in.
 *
 * Astrology and numerology only. The service role this runs with is granted
 * the birth columns of `clients` and nothing else there: the clinical
 * answers and what each person wrote are out of its reach altogether.
 *
 * Rule 6 of 8.5 (not offered while the person asking is in crisis or
 * clinically vulnerable) is enforced here, from the stored answers, before
 * anything is spent. `ComparisonGate` applies the same rule to the screens.
 *
 * No `prose` hook: nothing in this payload was typed by anyone.
 */

type Request = {
  friendship_id: string;
  /** Filled by `enrich`. Never accepted from the browser: the schema strips it. */
  built?: { payload: ComparisonPayload; friendGender: GrammaticalGender };
};

type BirthRow = {
  user_id: string;
  legal_birth_name: string;
  birth_date: string | null;
  grammatical_gender: string;
};

const GENDERS: readonly GrammaticalGender[] = ['femenino', 'masculino', 'neutro'];

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function source(row: BirthRow | undefined, chart: NatalChart | null): ComparisonSource {
  if (!row) return { display_name: '—', numerology: null, soul_map_themes: [], chart: null };

  let numerology = null;
  if (row.legal_birth_name.trim() && row.birth_date) {
    try {
      numerology = computeNumerology({ legalBirthName: row.legal_birth_name, birthDate: row.birth_date });
    } catch {
      numerology = null;
    }
  }

  return {
    display_name: firstName(row.legal_birth_name) || '—',
    numerology,
    soul_map_themes: [],
    chart,
  };
}

/** The friend on the other side of an accepted friendship, or null. */
async function friendOf(
  caller: SupabaseClient,
  friendshipId: string,
  userId: string,
): Promise<string | null> {
  // Read as the person, under RLS: they can only see friendships they are in.
  const { data } = await caller
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .eq('id', friendshipId)
    .maybeSingle();
  if (!data || data.status !== 'accepted') return null;
  if (data.requester_id === userId) return data.addressee_id as string;
  if (data.addressee_id === userId) return data.requester_id as string;
  return null;
}

async function build(
  elevated: SupabaseClient,
  caller: SupabaseClient,
  input: Request,
  userId: string,
): Promise<NonNullable<Request['built']>> {
  const friendId = await friendOf(caller, input.friendship_id, userId);
  if (!friendId) throw new Error('not_friends');

  const { data } = await elevated
    .from('clients')
    .select('user_id, legal_birth_name, birth_date, grammatical_gender')
    .in('user_id', [userId, friendId]);
  const rows = (data ?? []) as BirthRow[];
  const mine = rows.find((r) => r.user_id === userId);
  const theirs = rows.find((r) => r.user_id === friendId);

  // v1.2 A-02: each person's chart as the natal-chart function stored it,
  // read the Hellenistic way. No ephemeris call: the aspects between the two
  // are by sign, from these.
  const { data: charts } = await elevated
    .from('natal_charts')
    .select('user_id, chart')
    .in('user_id', [userId, friendId]);
  const chartOf = (id: string) =>
    readStoredChart(((charts ?? []) as { user_id: string; chart: unknown }[]).find((c) => c.user_id === id)?.chart);

  const payload = buildComparisonPayload({
    a: source(mine, chartOf(userId)),
    b: source(theirs, chartOf(friendId)),
    scope: { numerology: true, astro: true, soul_map_themes: false },
  });

  const friendGender = GENDERS.find((g) => g === theirs?.grammatical_gender) ?? 'neutro';
  return { payload: withCrossAspects(payload), friendGender };
}

function built(input: Request): NonNullable<Request['built']> {
  if (!input.built) throw new Error('the comparison payload was not built');
  return input.built;
}

Deno.serve(
  serveModel<Request, ReturnType<typeof comparisonResultSchema.parse>>({
    purpose: 'comparison',
    plan: 'comparison',
    // How many aspects were computed, alongside the token counts. Operational
    // metadata: it names a count, never a placement.
    meta: (input) => ({ aspects_computed: built(input).payload.aspects.length }),
    promptVersion: COMPARISON_PROMPT_VERSION,
    // Twelve readings and their questions on top of the four parts: the
    // longest contract, given room beyond the shared 90 seconds (23 Oct 2026).
    timeoutMs: 150_000,
    input: comparisonRequestSchema,
    output: comparisonResultSchema,
    system: COMPARISON_SYSTEM_PROMPT,
    user: (input, { gender }) =>
      buildComparisonUserMessage(built(input).payload, { a: gender, b: built(input).friendGender }),

    refuse: async (input, { caller, userId }) => {
      if (await callerIsClinicallyVulnerable(caller, userId)) {
        return { reason: 'clinically_vulnerable', safety: true };
      }
      if (!(await friendOf(caller, input.friendship_id, userId))) {
        return { reason: 'not_friends', safety: false };
      }
      return null;
    },

    /**
     * «Las dos cartas» (owner, 23 Oct 2026): a reading per computed area in
     * its order and a label for exactly the crosses that take one. A miss is
     * asked again once with the reason, like a copy rule.
     */
    lint: (result, input) => areasProblem(result, built(input).payload.areas),

    enrich: async (input, { caller, userId, elevated }) => ({
      friendship_id: input.friendship_id,
      built: await build(elevated, caller, input, userId),
    }),

    /**
     * Rule 5, with teeth. The predicate lives in `lib` so it has tests;
     * this is the wiring and the two boundary cases around it.
     *
     * Rejecting the whole answer rather than dropping the stray aspect,
     * because the four parts are written against the list the model believed
     * it had, and a part describing an aspect that is no longer shown is a
     * quieter version of the same lie.
     */
    check: (result, input) => {
      const { aspects } = built(input).payload;
      const dialogue = result.astro_dialogue;
      // v1.2 A-02: nothing in a chart is rated good or bad.
      const judged = lintChartJudgement(result)[0];
      if (judged) return `${judged.rule} at ${judged.path}: "${judged.match}"`;

      if (aspects.length === 0) {
        return dialogue.available || dialogue.aspects.length > 0
          ? 'The model described chart aspects when none were computed.'
          : null;
      }

      const invented = inventedAspect(dialogue.aspects, aspects);
      if (invented) {
        return `The model invented an aspect that was not computed: ${invented.a_body} ${invented.type} ${invented.b_body}.`;
      }
      const unread = dialogue.aspects.find((a) => !a.flow);
      if (unread) return `${unread.a_body} ${unread.type} ${unread.b_body} came without flow.`;
      const fewest = Math.min(3, aspects.length);
      if (dialogue.aspects.length < fewest || dialogue.aspects.length > 8) {
        return `Read ${dialogue.aspects.length} aspects; between ${fewest} and 8 were asked for.`;
      }
      return null;
    },

    store: async (result, input, { elevated, userId, promptVersion }) => {
      const { data, error } = await elevated
        .from('chart_comparisons')
        .insert({
          user_id: userId,
          friendship_id: input.friendship_id,
          prompt_version: promptVersion,
          result,
          mode: 'server',
        })
        .select('id')
        .single();
      if (error) console.error('comparison_store_failed', error.code);
      return (data?.id as string | undefined) ?? null;
    },
  }),
);
