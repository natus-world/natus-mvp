import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { REBILL_TRIAL_DAYS, readRebillSubscription, type RebillSubscription } from './lib/rebill.ts';

/**
 * Rebill's API, from the server only (sandbox trial, owner, 22 Oct 2026).
 *
 * Secrets, set in Supabase (Edge Functions → Secrets), never in the code or
 * a chat:
 *   REBILL_API_KEY         the secret key (`sk_`); the sandbox one while testing
 *   REBILL_WEBHOOK_SECRET  the signing secret of the webhook (`whsec_`)
 *   REBILL_TEST_EMAILS     comma-separated addresses that may open a checkout
 *   REBILL_OPEN            `true` opens the checkout to everybody (not yet)
 *   REBILL_API_BASE        optional; https://api.rebill.com/v3 by default
 *
 * The sandbox and the live organization share the API address: the key says
 * which one a call reaches.
 */

const API_BASE = Deno.env.get('REBILL_API_BASE') ?? 'https://api.rebill.com/v3';

export class RebillUnavailable extends Error {}

async function call(apiKey: string, method: string, path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new RebillUnavailable('rebill unreachable');
  }
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/**
 * Rebill signs the raw body with HMAC-SHA256, keyed with the whole signing
 * secret (`whsec_` included), hex in `x-rebill-signature` (webhook guide,
 * 22 Oct 2026). Checked on the bytes as received, never on re-serialized JSON.
 */
export async function signedByRebill(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !rawBody) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const received = signature.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  const bytes = new Uint8Array(received.match(/../g)!.map((pair) => parseInt(pair, 16)));
  // `verify` compares in constant time.
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(rawBody));
}

/** Asks Rebill for the subscription itself: the event only says where to look. */
export async function fetchSubscription(apiKey: string, id: string): Promise<RebillSubscription | null> {
  const response = await call(apiKey, 'GET', `/subscriptions/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new RebillUnavailable(`subscription ${response.status}`);
  return readRebillSubscription(await response.json());
}

/**
 * The Premium plan in the organization the key belongs to, created on first
 * use: US$10 a month, the first 30 days free. Its texts show on Rebill's
 * checkout page (proposal, from the paywall's own price line).
 */
export async function knownPlanId(apiKey: string, elevated: SupabaseClient): Promise<string | null> {
  const keyHash = await sha256(apiKey);
  const known = await elevated.from('rebill_plans').select('plan_id').eq('key_hash', keyHash).maybeSingle();
  return (known.data?.plan_id as string | undefined) ?? null;
}

export async function premiumPlanId(apiKey: string, elevated: SupabaseClient): Promise<string> {
  const known = await knownPlanId(apiKey, elevated);
  if (known) return known;
  const keyHash = await sha256(apiKey);

  const response = await call(apiKey, 'POST', '/plans', {
    name: [{ language: 'es', text: 'Natus Premium' }],
    description: [{ language: 'es', text: 'US$ 10 al mes, IVA incluido. El primer mes es gratis.' }],
    frequency: { period: 'month', count: 1 },
    trialPeriodDays: REBILL_TRIAL_DAYS,
    prices: [{ amount: 10, currency: 'USD', isDefault: true }],
    metadata: { natus: 'premium_monthly' },
  });
  if (!response.ok) {
    console.error('rebill_plan_failed', response.status, await response.text().catch(() => ''));
    throw new RebillUnavailable(`plan ${response.status}`);
  }
  const plan = (await response.json()) as { id?: string };
  if (!plan.id) throw new RebillUnavailable('plan without id');

  // Two first checkouts at once may each create a plan; the first one stored
  // wins and the other stays unused in Rebill.
  await elevated.from('rebill_plans').upsert({ key_hash: keyHash, plan_id: plan.id }, { onConflict: 'key_hash', ignoreDuplicates: true });
  const stored = await elevated.from('rebill_plans').select('plan_id').eq('key_hash', keyHash).single();
  return (stored.data?.plan_id as string | undefined) ?? plan.id;
}

/** A payment link for one person, valid for a day. */
export async function createPaymentLink(
  apiKey: string,
  input: { planId: string; userId: string; email: string; returnTo: string | null },
): Promise<{ id: string; url: string }> {
  const body: Record<string, unknown> = {
    title: [{ language: 'es', text: 'Natus Premium' }],
    paymentMethods: [{ methods: ['card'], currency: 'USD' }],
    plan: { id: input.planId },
    metadata: { natus_user_id: input.userId },
    prefilledFields: { customer: { email: input.email } },
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  if (input.returnTo) body.redirectUrls = { approved: input.returnTo, rejected: input.returnTo };

  const response = await call(apiKey, 'POST', '/payment-links', body);
  if (!response.ok) {
    console.error('rebill_link_failed', response.status, await response.text().catch(() => ''));
    throw new RebillUnavailable(`payment link ${response.status}`);
  }
  const link = (await response.json()) as { id?: string; url?: string };
  if (!link.id || !link.url) throw new RebillUnavailable('payment link without url');
  return { id: link.id, url: link.url };
}
