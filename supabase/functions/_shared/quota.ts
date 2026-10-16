import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { costUsd } from './lib/budget.ts';
import { PREMIUM_MONTHLY_CAP_USD, monthStart, renewsOn, type PlanFeature } from './lib/quota.ts';

/**
 * The plan, counted where the person cannot reach it (v1.2 F-01).
 *
 * The quotas are rows in `plan_quotas`, the usage is the ledger
 * (`claude_api_calls`), which only the functions write, and the tier is
 * `subscriptions`, which only the server writes (P-01). Nothing here trusts
 * the browser.
 *
 * The checks before a call fail open, like the spend ceilings in `spend.ts`:
 * a database hiccup is not a runaway. The reservation that follows takes a
 * lock and checks the plan again inside it, and that one does not.
 */

export type PlanQuota = {
  tier: 'free' | 'premium';
  /** Null when unlimited. */
  remaining: number | null;
};

export async function planQuota(
  elevated: SupabaseClient,
  userId: string,
  feature: PlanFeature,
): Promise<PlanQuota> {
  try {
    const [tier, remaining] = await Promise.all([
      elevated.rpc('plan_tier', { p_user: userId }),
      elevated.rpc('quota_remaining', { p_user: userId, p_feature: feature }),
    ]);
    if (tier.error || remaining.error) return { tier: 'free', remaining: null };
    return {
      tier: tier.data === 'premium' ? 'premium' : 'free',
      remaining: typeof remaining.data === 'number' ? remaining.data : null,
    };
  } catch {
    return { tier: 'free', remaining: null };
  }
}

/** The tier alone, failing closed: an error reads as free. */
export async function planTier(elevated: SupabaseClient, userId: string): Promise<'free' | 'premium'> {
  try {
    const { data, error } = await elevated.rpc('plan_tier', { p_user: userId });
    return !error && data === 'premium' ? 'premium' : 'free';
  } catch {
    return 'free';
  }
}

/**
 * Whether a premium person has used this month's cap on "unlimited": US$4 of
 * model use (owner, 15 Oct 2026), read from `plan_caps` and priced with the
 * same table as the deployment's budget. Every server row of theirs counts,
 * whatever it was for.
 */
export async function overPlanCap(
  elevated: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<{ over: boolean; renewsOn: string }> {
  const answer = { renewsOn: renewsOn(now) };
  try {
    const [cap, totals] = await Promise.all([
      elevated.from('plan_caps').select('monthly_usd').eq('tier', 'premium').maybeSingle(),
      elevated.rpc('user_token_totals', { p_user: userId, since: monthStart(now).toISOString() }),
    ]);
    if (totals.error || !totals.data) return { ...answer, over: false };
    const limit = Number(cap.data?.monthly_usd ?? PREMIUM_MONTHLY_CAP_USD);
    const rows = totals.data as {
      model: string | null;
      input_tokens: number;
      output_tokens: number;
      cache_write_tokens: number;
      cache_read_tokens: number;
    }[];
    const spent = rows.reduce(
      (total, row) =>
        total +
        costUsd(
          {
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            cacheWriteTokens: row.cache_write_tokens,
            cacheReadTokens: row.cache_read_tokens,
          },
          row.model,
        ),
      0,
    );
    return { ...answer, over: spent >= limit };
  } catch {
    return { ...answer, over: false };
  }
}

/** A chat turn, reserved under the plan's lock. Null when the month is used. */
export async function reserveChatTurn(
  elevated: SupabaseClient,
  userId: string,
  promptVersion: string,
  model: string,
): Promise<string | null> {
  const { data, error } = await elevated.rpc('reserve_plan_chat_turn', {
    p_user: userId,
    p_prompt_version: promptVersion,
    p_model: model,
  });
  if (error) throw new Error(`reserve_plan_chat_turn: ${error.message}`);
  return (data as string | null) ?? null;
}
