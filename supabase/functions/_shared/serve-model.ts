import type { ZodType } from 'zod';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { json, preflight } from './cors.ts';
import { authenticate, Unauthorized } from './auth.ts';
import { logCall, type CallRecord } from './log.ts';
import { ModelError, generate, hasKey } from './anthropic.ts';
import { callerGrammaticalGender } from './address.ts';
import type { GrammaticalGender } from './lib/model-input.ts';
import { scanText } from './lib/safety.ts';
import { modelCrisisReply } from './lib/crisis-resources.ts';
import { MAX_OUTPUT_TOKENS, modelFor } from './lib/budget.ts';
import { refuseForSpend, reserveModelCall } from './spend.ts';

/**
 * The shape four of the five functions share.
 *
 * Not a router. Each purpose still gets its own directory, its own URL and its
 * own worker, which is what step 5.1 asked for and what keeps a broken
 * meditation prompt from taking the Soul Map down. What is shared is the
 * sequence every one of them has to get right — authenticate, refuse to spend
 * a token on somebody in crisis, call, validate, log — because four
 * hand-written copies of that sequence is four chances to put the safety check
 * in the wrong place.
 *
 * `chat` deliberately does not use this. It has a quota to consult between
 * safety and the model, and a crisis reply that is a product surface rather
 * than a refusal, so bending this to fit it would have made both worse.
 */

export type ModelRoute<I, O> = {
  purpose: CallRecord['purpose'];
  promptVersion: string;
  /** What the browser may say about itself. */
  input: ZodType<I>;
  /** What the model must answer with. */
  output: ZodType<O>;
  system: string;
  user: (input: I, person: { gender: GrammaticalGender }) => string;
  model?: (input: I) => string;
  /**
   * Free prose the person typed, if this surface has any.
   *
   * The deterministic scan runs in front of the model,
   * everywhere a person writes in their own words. Two of these four do —
   * the Soul Map's presenting need and the meditation's intent — and both
   * are read by the model, so both are scanned before a token is spent.
   */
  prose?: (input: I) => string;
  /**
   * Anything that has to be fetched before the prompt can be built.
   *
   * Runs after the crisis scan and after the key check, so a refused turn and
   * a deployment with no model both cost nothing upstream. `comparison` uses
   * it to compute the synastry aspects: they are the one part of that prompt
   * the caller must not supply, because a caller who could supply them would
   * be telling the model which placements to read out.
   *
   * `match` uses it to re-apply the clinical exclusion from the person's own
   * stored answers, which is why it is handed the caller: a client subject to
   * RLS, acting as the person, never the elevated one.
   */
  enrich?: (
    input: I,
    context: { caller: SupabaseClient; userId: string; elevated: SupabaseClient },
  ) => Promise<I>;
  /**
   * A reason this person must not be served at all, read from what the
   * server holds rather than from the request. Runs right after the crisis
   * scan, before the key check and before anything is spent. `comparison`
   * uses it for rule 6 of PDR 8.5 (`safety: true`, logged as a crisis
   * refusal) and for a friendship that is not accepted (`safety: false`, not
   * logged: nothing was asked of the model). Returns null to serve.
   */
  refuse?: (
    input: I,
    context: { caller: SupabaseClient; userId: string },
  ) => Promise<{ reason: string; safety: boolean } | null>;
  /**
   * Keeps the answer where the browser cannot write it. Runs after the call is
   * logged; its id travels back as `stored_id`. `comparison` uses it because
   * the result is read by two people and neither of them may author it.
   */
  store?: (
    output: O,
    input: I,
    context: { elevated: SupabaseClient; userId: string; promptVersion: string },
  ) => Promise<string | null>;
  /**
   * A rule about the answer that the schema cannot express. Returns a reason
   * to reject, or null to accept. Rejection is logged as `copy_violation` —
   * the model held the contract and broke the product rule.
   */
  check?: (
    output: O,
    input: I,
    context: { caller: SupabaseClient; userId: string },
  ) => string | null | Promise<string | null>;
  crisis?: (output: O, input: I) => { response: string; country: string | undefined } | null;
  /** Operational counts to return beside the token usage. Never content. */
  meta?: (input: I) => Record<string, number>;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
};

export function serveModel<I, O>(route: ModelRoute<I, O>): (request: Request) => Promise<Response> {
  return async (request: Request) => {
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

    const { userId, elevated } = auth;
    const started = Date.now();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(request, { error: 'invalid_body' }, 400);
    }

    const parsed = route.input.safeParse(body);
    if (!parsed.success) return json(request, { error: 'invalid_body' }, 400);

    const model = route.model ? route.model(parsed.data) : modelFor(route.purpose);
    const record = {
      userId,
      purpose: route.purpose,
      promptVersion: route.promptVersion,
      model,
      mode: 'server' as const,
    };

    // Before the key check, not after: a deployment without a model still must
    // not be the thing that decides whether somebody in crisis is noticed.
    const prose = route.prose?.(parsed.data) ?? '';
    const verdict = prose.trim() === '' ? { crisis: false as const } : scanText(prose);
    if (verdict.crisis && verdict.severity === 'high') {
      await logCall(elevated, {
        ...record,
        outcome: 'refused_crisis',
        latencyMs: Date.now() - started,
      });
      // The caller ran the same scan before it got here and has its own
      // containment path. Reaching this means the two disagreed, which
      // `runAi` surfaces rather than papers over.
      return json(request, { error: 'refused_crisis' }, 403);
    }

    const withheld = route.refuse
      ? await route.refuse(parsed.data, { caller: auth.caller, userId })
      : null;
    if (withheld) {
      if (withheld.safety) {
        await logCall(elevated, {
          ...record,
          outcome: 'refused_crisis',
          latencyMs: Date.now() - started,
          errorKind: withheld.reason,
        });
      }
      return json(request, { error: 'refused', reason: withheld.reason }, 403);
    }

    // A declared state, not a failure: `runAi` reads this and falls back to
    // the curated fixtures, which is a supported way to run a deployment.
    if (!hasKey()) return json(request, { error: 'no_model' }, 503);

    // Before `enrich`, so a refused turn does not spend an ephemeris call
    // either. After the key check, so a deployment with no model is not asked
    // to run two queries to say so.
    const refusal = await refuseForSpend(elevated, userId, route.purpose);
    if (refusal) {
      await logCall(elevated, {
        ...record,
        outcome: 'refused_quota',
        latencyMs: Date.now() - started,
        errorKind: refusal.reason,
      });
      return json(request, { error: 'spend_limit', scope: refusal.reason }, 429);
    }

    let reservedId: string | null;
    try {
      reservedId = await reserveModelCall(elevated, userId, route.purpose, route.promptVersion, model);
    } catch {
      return json(request, { error: 'quota_unavailable' }, 500);
    }
    if (reservedId === null) return json(request, { error: 'spend_limit', scope: 'person' }, 429);

    try {
      const input = route.enrich
        ? await route.enrich(parsed.data, { caller: auth.caller, userId, elevated })
        : parsed.data;
      const gender = await callerGrammaticalGender(auth.caller, userId);
      const generated = await generate({
        model,
        system: route.system,
        user: route.user(input, { gender }),
        schema: route.output,
        maxTokens: MAX_OUTPUT_TOKENS[route.purpose],
        ...(route.effort ? { effort: route.effort } : {}),
      });

      const rejection = await route.check?.(generated.value, input, { caller: auth.caller, userId });
      if (rejection) throw new ModelError(rejection, 'copy_violation');

      await logCall(elevated, {
        ...record,
        outcome: 'ok',
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
        cacheWriteTokens: generated.cacheWriteTokens,
        cacheReadTokens: generated.cacheReadTokens,
        latencyMs: Date.now() - started,
      }, reservedId);

      const crisis = route.crisis?.(generated.value, input);
      if (crisis) return json(request, modelCrisisReply(crisis.response, crisis.country));

      const storedId = route.store
        ? await route.store(generated.value, input, { elevated, userId, promptVersion: route.promptVersion })
        : null;

      return json(request, {
        result: generated.value,
        ...(storedId ? { stored_id: storedId } : {}),
        model,
        input_tokens: generated.inputTokens,
        output_tokens: generated.outputTokens,
        ...(route.meta ? route.meta(input) : {}),
      });
    } catch (error) {
      const kind = error instanceof ModelError ? error.kind : 'api_error';
      // `api_error:authentication_error` rather than `api_error`, so a bad
      // key and an unreachable model are distinguishable from the ledger.
      const detail = error instanceof ModelError && error.detail ? `${kind}:${error.detail}` : kind;
      await logCall(elevated, {
        ...record,
        outcome: kind,
        latencyMs: Date.now() - started,
        errorKind: detail,
        // A failure that reached the model still generated tokens, and the
        // ceiling is blind to whatever the ledger does not hold.
        ...(error instanceof ModelError && error.usage
          ? {
              inputTokens: error.usage.inputTokens,
              outputTokens: error.usage.outputTokens,
              cacheWriteTokens: error.usage.cacheWriteTokens,
              cacheReadTokens: error.usage.cacheReadTokens,
            }
          : {}),
      }, reservedId);
      // The provider's *message* does not travel — it can quote the request
      // back, and the request is what these functions exist to keep from
      // leaking. Its error *class* does: `authentication_error` describes the
      // deployment, not the person, and without it a caller cannot tell a
      // rejected key from a model the account cannot reach.
      return json(
        request,
        { error: 'model_failed', kind, ...(error instanceof ModelError && error.detail ? { detail: error.detail } : {}) },
        502,
      );
    }
  };
}
