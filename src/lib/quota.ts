/**
 * What a free question is, and how many there are.
 *
 * This lives in `lib` rather than in `store/chat.ts` because both sides need
 * it and a constant duplicated across a network boundary is a constant that
 * drifts. The client uses it to render a counter; the Edge Function uses it to
 * refuse. If those two disagree, the person is shown a number that is not the
 * rule being enforced on them.
 *
 * `shared-parity.test.ts` fails if this file and its copy under
 * `supabase/functions/_shared/lib` differ.
 *
 * No React, no storage, no browser API.
 */

/**
 * The free gift of questions (v1.2 F-01), as the demo counts it. With a
 * backend the number comes from `plan_quotas` through the functions; this is
 * only what the fixture demo shows offline.
 */
export const FREE_QUESTIONS = 3;

export type QuotaState = {
  used: number;
  remaining: number;
  unlimited: boolean;
};

/**
 * Deliberately takes the count rather than fetching it.
 *
 * On the client the count comes from the mirror; in the Edge Function it comes
 * from a `select count(*) … where counted`, run under the service role so the
 * person cannot edit their own tally. Same arithmetic either way, and the rule
 * is testable without either.
 */
export function quotaState(used: number, subscribed: boolean): QuotaState {
  if (subscribed) return { used, remaining: Number.POSITIVE_INFINITY, unlimited: true };
  return { used, remaining: Math.max(0, FREE_QUESTIONS - used), unlimited: false };
}

/**
 * v1.2 F-01: the features a plan counts, and the cap on "unlimited".
 *
 * The quotas themselves live in the `plan_quotas` table and change there
 * without a deploy; the functions read them. The cap's value is seeded in
 * `plan_caps` too — this constant is the seed, kept here because
 * `budget.test.ts` prices one person's worst month with it. Change both, or
 * the test is pricing a number the deployment no longer uses.
 */
export const PLAN_FEATURES = ['chat', 'meditation', 'comparison'] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export const PREMIUM_MONTHLY_CAP_USD = 4;

/** The first instant of the calendar month (UTC) that `now` falls in. */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** The day a monthly quota renews, as YYYY-MM-DD (UTC). */
export function renewsOn(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

export function hasQuestionsLeft(used: number, subscribed: boolean): boolean {
  return quotaState(used, subscribed).remaining > 0;
}

/**
 * Whether a produced answer spends one.
 *
 * A turn is charged when it produced a usable answer. A failed call is not the
 * person's problem, and a crisis turn must never be — charging someone for
 * being met with a hotline would be the single worst line item this product
 * could have. PDR 1.6 forbids meeting a person in crisis with a commercial
 * fallback, and this is half of how that is kept true; the other half is
 * ordering, in the function: safety runs before the quota check, so somebody
 * in crisis never reaches the paywall at all.
 */
export function isChargeable(responseType: string): boolean {
  // A question that is not about the chart, in «Pregúntale a tu carta», is
  // answered with a line that sends to the Chat: not charged either (owner,
  // 22 Oct 2026).
  return responseType !== 'crisis' && responseType !== 'off_chart';
}
