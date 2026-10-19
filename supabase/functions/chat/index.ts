import { readPersonContext } from '../_shared/person.ts';
import { memoryConsented, readMemory } from '../_shared/memory.ts';
import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { overPlanCap, planQuota, reserveChatTurn } from '../_shared/quota.ts';
import { overDeploymentBudget } from '../_shared/spend.ts';
import { MAX_OUTPUT_TOKENS, modelFor } from '../_shared/lib/budget.ts';
import { isChargeable } from '../_shared/lib/quota.ts';
import { logCall } from '../_shared/log.ts';
import { scanText } from '../_shared/lib/safety.ts';
import { callerIsClinicallyVulnerable, withoutClinicalExclusions } from '../_shared/clinical.ts';
import { resourcesForCountry } from '../_shared/lib/crisis-resources.ts';
import { chatContextSchema, chatEnvelopeSchema } from '../_shared/lib/model-input.ts';
import { ModelError, generate, hasKey } from '../_shared/anthropic.ts';
import { callerGrammaticalGender } from '../_shared/address.ts';
import { chatResponseSchema, comparisonResultSchema, type ComparisonResult } from '../_shared/lib/schemas/index.ts';
import { lintChartJudgement } from '../_shared/lib/copy-lint.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { hasFoodOrWeightSignal, lintPhysicalRisk } from '../_shared/lib/physical-risk.ts';
import { DAILY_SKY_VERSION, type DailySky } from '../_shared/lib/daily-sky.ts';
import {
  CHAT_PROMPT_VERSION,
  CHAT_SYSTEM_PROMPT,
  buildChatUserMessage,
} from '../_shared/prompts/chat.ts';

/**
 * The chat turn, server-side.
 *
 * The ordering below is the product, not an implementation detail:
 *
 *   1. CORS preflight        — hygiene, not access control. See cors.ts
 *   2. JWT                   — the access control. The user is derived from
 *                              the token, never read from the body
 *   3. Layer 1 safety        — deterministic, before anything else can answer
 *   4. Quota                 — after safety, never before
 *   5. Model                 — the key lives here and nowhere else
 *
 * **Safety precedes the quota and that ordering is load-bearing.** PDR 1.6
 * forbids meeting someone in crisis with a commercial fallback. If the quota
 * ran first, a person at zero remaining who typed something desperate would be
 * shown a payment screen instead of a hotline. Safety is deterministic and in
 * front of everything; this is what "in front" means when
 * there is a paywall behind it.
 *
 * A crisis turn also costs nothing, enforced here rather than trusted to the
 * client: `refused_crisis` is logged and the quota is never consulted.
 */

/**
 * Read from the prompt rather than restated. A version that has to be kept in
 * step by hand is a version that eventually labels the ledger with the wrong
 * prompt, and the ledger is what says which prompt produced which cost.
 */
const PROMPT_VERSION = CHAT_PROMPT_VERSION;
const MODEL = modelFor('chat');

/**
 * A comparison the person wants to talk over, read as the person: RLS lets
 * them read it only while the friendship is accepted, and the friendship is
 * checked here too. Only its result; nothing else about the friend. Not for
 * somebody clinically vulnerable, the comparison's own rule 6.
 */
/**
 * v1.2 D-01 (chat-v2.0): premium's sky of the day, the latest row of the
 * last two days (the phone's day can be UTC's yesterday or tomorrow), read
 * as the person. Null when there is none: the block is then left out.
 */
async function todaysSky(
  caller: SupabaseClient,
  userId: string,
): Promise<{ day: DailySky; tips: string[] | null } | null> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await caller
    .from('daily_insights')
    .select('sky, tips')
    .eq('user_id', userId)
    .gte('insight_date', since)
    .order('insight_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { sky: unknown; tips: unknown };
  const sky = row.sky as DailySky | null;
  if (!sky || sky.version !== DAILY_SKY_VERSION || !Array.isArray(sky.transits)) return null;
  const tips = Array.isArray(row.tips) ? row.tips.filter((t): t is string => typeof t === 'string') : null;
  return { day: sky, tips };
}

async function comparisonToTalkOver(
  caller: SupabaseClient,
  userId: string,
  friendshipId: string | null,
  vulnerable: boolean,
): Promise<ComparisonResult | null> {
  if (!friendshipId || vulnerable) return null;
  const { data: friendship } = await caller
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .eq('id', friendshipId)
    .maybeSingle();
  if (!friendship || friendship.status !== 'accepted') return null;
  if (friendship.requester_id !== userId && friendship.addressee_id !== userId) return null;
  const { data } = await caller
    .from('chart_comparisons')
    .select('result')
    .eq('friendship_id', friendshipId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = comparisonResultSchema.safeParse(data?.result);
  return parsed.success ? parsed.data : null;
}

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;

  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  let auth;
  try {
    auth = await authenticate(request);
  } catch (error) {
    if (error instanceof Unauthorized) return json(request, { error: 'unauthorized' }, 401);
    return json(request, { error: 'misconfigured' }, 500);
  }

  const { userId, caller, elevated } = auth;
  const started = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: 'invalid_body' }, 400);
  }

  // Only what safety needs. The model context is parsed at step 5, so that a
  // malformed one cannot come between a person and a hotline.
  const envelope = chatEnvelopeSchema.safeParse(body);
  if (!envelope.success) return json(request, { error: 'invalid_body' }, 400);

  const { message, country } = envelope.data;

  // ── 3. Safety, deterministically, in front ────────────────────────────────
  const verdict = scanText(message);
  if (verdict.crisis) {
    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'fixture',
      outcome: 'refused_crisis',
      latencyMs: Date.now() - started,
    });

    // No model call, no quota consulted, nothing charged. The response is
    // containment and the resources for the person's country, with the
    // international fallback that `resourcesForCountry` always includes.
    return json(request, {
      type: 'crisis',
      severity: verdict.severity,
      category: verdict.category,
      resources: resourcesForCountry(country),
      counted: false,
    });
  }

  // ── 4. Quota, after safety ────────────────────────────────────────────────
  // v1.2 F-01: the plan's quota, from `plan_quotas` and the ledger.
  const quota = await planQuota(elevated, userId, 'chat');
  if (quota.remaining === 0) {
    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'fixture',
      outcome: 'refused_quota',
      latencyMs: Date.now() - started,
    });
    return json(request, { error: 'quota_exhausted', remaining: 0 }, 402);
  }

  // Premium is past the paywall, not past the cap: US$4 of model use a month
  // (owner, 15 Oct 2026). A 429 rather than the 402 above: this is not a state
  // the product asks money for.
  const cap = quota.tier === 'premium' ? await overPlanCap(elevated, userId) : null;
  if (cap?.over) {
    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'fixture',
      outcome: 'refused_quota',
      latencyMs: Date.now() - started,
      errorKind: 'plan_cap',
    });
    return json(request, { error: 'spend_limit', scope: 'cap', renews_on: cap.renewsOn }, 429);
  }

  // ── 5. The model ──────────────────────────────────────────────────────────
  //
  // `no_model` is a declared state, not a failure. A deployment without a key
  // is the fixture demo, which runs every screen offline and has always
  // worked; `runAi` reads this exact code and falls back to the curated path.
  // Answering with something invented here would be worse than answering with
  // nothing, because the person could not tell the difference.
  if (!hasKey()) {
    return json(
      request,
      { error: 'no_model', remaining: quota.remaining, unlimited: quota.remaining === null },
      503,
    );
  }

  // The person is within their three free questions; the deployment may still
  // be over its own ceiling. A different refusal from a different cause, so it
  // gets a different status: 402 asks for money, 429 says come back later.
  if (await overDeploymentBudget(elevated)) {
    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'server',
      outcome: 'refused_quota',
      latencyMs: Date.now() - started,
      errorKind: 'deployment',
    });
    return json(request, { error: 'spend_limit', scope: 'deployment' }, 429);
  }

  const context = chatContextSchema.safeParse(body);
  if (!context.success) return json(request, { error: 'invalid_context' }, 400);

  const [vulnerable, gender, person, memory, today] = await Promise.all([
    callerIsClinicallyVulnerable(caller, userId),
    callerGrammaticalGender(caller, userId),
    // chat-v1.7: the chart, the numbers and what the person told, read here.
    readPersonContext(caller, userId),
    // v1.2 M-01: premium with consent reads the memory on every answer;
    // otherwise it is paused and the block is left out.
    quota.tier === 'premium' && (await memoryConsented(caller, userId)) ? readMemory(caller, userId) : null,
    // v1.2 D-01: premium's sky of the day.
    quota.tier === 'premium' ? todaysSky(caller, userId) : null,
  ]);
  const recommendedSlugs = withoutClinicalExclusions(context.data.recommendedSlugs, vulnerable).kept;
  const comparison = await comparisonToTalkOver(caller, userId, context.data.comparisonFriendshipId, vulnerable);
  const risk = vulnerable && context.data.risk === 'none' ? 'elevated' : context.data.risk;

  // The prompt is built here, from the contract in `_shared/prompts`, and
  // never accepted from the caller. A function that takes a system prompt in
  // its body is a general-purpose model endpoint with somebody else's key in
  // it, whatever the rest of the file says it is.
  let reservedId: string | null;
  try {
    reservedId = await reserveChatTurn(elevated, userId, PROMPT_VERSION, MODEL);
  } catch {
    return json(request, { error: 'quota_unavailable' }, 500);
  }
  if (reservedId === null) return json(request, { error: 'quota_exhausted', remaining: 0 }, 402);

  try {
    const generated = await generate({
      model: MODEL,
      system: CHAT_SYSTEM_PROMPT,
      user: buildChatUserMessage({
        question: message,
        synthesis: context.data.synthesis,
        numerology: person.numerology ?? context.data.numerology,
        risk,
        recommendedSlugs,
        history: context.data.history,
        gender,
        memory,
        comparison,
        person: { chart: person.chart, birth: person.birth, told: person.told, routine: person.routine },
        today,
      }),
      schema: chatResponseSchema,
      maxTokens: MAX_OUTPUT_TOKENS.chat,
    });

    const fastingBarred =
      vulnerable ||
      risk !== 'none' ||
      hasFoodOrWeightSignal({
        texts: [
          message,
          ...context.data.history.filter((turn) => turn.role === 'user').map((turn) => turn.text),
        ],
        topics: context.data.synthesis.inferred_topics,
      });
    // Over a comparison, nothing between two people is rated good or bad
    // (owner, 15 Oct 2026), the comparison's own rule.
    const judged = comparison ? lintChartJudgement(generated.value)[0] : undefined;
    const violation = judged ?? lintPhysicalRisk(generated.value, { fastingBarred })[0];
    if (violation) {
      throw new ModelError(
        `Copy rule "${violation.rule}" broken at ${violation.path}`,
        'copy_violation',
        `lint:${violation.rule}`,
        {
          inputTokens: generated.inputTokens,
          outputTokens: generated.outputTokens,
          cacheWriteTokens: generated.cacheWriteTokens,
          cacheReadTokens: generated.cacheReadTokens,
        },
      );
    }

    // The model can classify a turn as crisis too, and that turn is free for
    // the same reason the deterministic one is.
    const charged = isChargeable(generated.value.type);

    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'server',
      outcome: 'ok',
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      cacheWriteTokens: generated.cacheWriteTokens,
      cacheReadTokens: generated.cacheReadTokens,
      latencyMs: Date.now() - started,
      charged,
    }, reservedId);

    const allowed = new Set(recommendedSlugs);
    return json(request, {
      result: {
        ...generated.value,
        linked_modality_slugs: generated.value.linked_modality_slugs.filter((slug) => allowed.has(slug)),
      },
      ...(generated.value.type === 'crisis' ? { resources: resourcesForCountry(country) } : {}),
      input_tokens: generated.inputTokens,
      output_tokens: generated.outputTokens,
      remaining: quota.remaining === null ? null : Math.max(0, quota.remaining - (charged ? 1 : 0)),
      unlimited: quota.remaining === null,
    });
  } catch (error) {
    const kind = error instanceof ModelError ? error.kind : 'api_error';
    const detail = error instanceof ModelError && error.detail ? `${kind}:${error.detail}` : kind;

    await logCall(elevated, {
      userId,
      purpose: 'chat',
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      mode: 'server',
      outcome: kind,
      latencyMs: Date.now() - started,
      errorKind: detail,
      ...(error instanceof ModelError && error.usage
        ? {
            inputTokens: error.usage.inputTokens,
            outputTokens: error.usage.outputTokens,
            cacheWriteTokens: error.usage.cacheWriteTokens,
            cacheReadTokens: error.usage.cacheReadTokens,
          }
        : {}),
    }, reservedId);

    // The turn is not charged. The provider's message does not travel — it
    // can carry the request back — but its error class does, because
    // `authentication_error` describes the deployment rather than the person.
    return json(
      request,
      { error: 'model_failed', kind, ...(error instanceof ModelError && error.detail ? { detail: error.detail } : {}) },
      502,
    );
  }
});
