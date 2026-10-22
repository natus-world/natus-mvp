import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { isRealCharge, readRebillEvent, rebillChange } from '../_shared/lib/rebill.ts';
import { fetchSubscription, knownPlanId, RebillUnavailable, signedByRebill } from '../_shared/rebill.ts';

/**
 * Rebill's notifications about Natus subscriptions (sandbox trial, owner,
 * 22 Oct 2026). The twin of paypal-webhook: same table, same rules.
 *
 * Called by Rebill, not by a person, so there is no JWT (verify_jwt is off
 * for this function in config.toml). What stands in for it is Rebill's
 * signature over the raw body, checked before anything else, and then
 * Rebill's own answer about the subscription: the event says where to look,
 * Rebill's API says what is true. A person can never make themselves
 * premium by calling this URL.
 *
 * Each delivery is recorded once by Rebill's `logId` in `payment_events`, so
 * a retry changes nothing, and only who and what: never the payer's name,
 * email, card or the amount.
 */

function answer(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

type Row = { user_id: string; status: string; provider: string | null; provider_subscription_id: string | null; ends_at: string | null };

async function rowOf(elevated: SupabaseClient, subscriptionId: string): Promise<Row | null> {
  const { data } = await elevated
    .from('subscriptions')
    .select('user_id, status, provider, provider_subscription_id, ends_at')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/** Whose subscription this is: already on a row, or the person the link was made for. */
async function ownerOf(
  elevated: SupabaseClient,
  subscriptionId: string,
  paymentLinkId: string | null,
  fromMetadata: string | null,
): Promise<string | null> {
  const row = await rowOf(elevated, subscriptionId);
  if (row) return row.user_id;
  if (paymentLinkId) {
    const { data } = await elevated
      .from('rebill_checkouts')
      .select('user_id')
      .eq('payment_link_id', paymentLinkId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  // Our id travels in the link's metadata; trusted only because it came back
  // from Rebill's API with our key, and only if we made a link for that person.
  if (fromMetadata) {
    const { data } = await elevated.from('rebill_checkouts').select('user_id').eq('user_id', fromMetadata).limit(1);
    if (data && data.length > 0) return fromMetadata;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return answer(405, { error: 'method_not_allowed' });

  const apiKey = Deno.env.get('REBILL_API_KEY');
  const secret = Deno.env.get('REBILL_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Rebill retries what is not answered with a 2xx, so an unconfigured
  // deployment loses nothing: the events arrive again once it is configured.
  if (!apiKey || !secret || !url || !serviceKey) return answer(503, { error: 'not_configured' });

  const raw = await request.text();
  if (!(await signedByRebill(raw, request.headers.get('x-rebill-signature'), secret))) {
    return answer(400, { error: 'not_from_rebill' });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return answer(400, { error: 'invalid_body' });
  }
  const event = readRebillEvent(body);
  if (!event) return answer(400, { error: 'no_event_id' });

  const elevated = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Rebill's answer first: if it cannot be reached, nothing is recorded and
  // Rebill's retry finds the event new.
  let subscription = null;
  let planId: string | null = null;
  try {
    if (event.subscriptionId) {
      subscription = await fetchSubscription(apiKey, event.subscriptionId);
      // The plan the checkout made with this key; none means no checkout yet.
      planId = await knownPlanId(apiKey, elevated);
    }
  } catch (error) {
    if (error instanceof RebillUnavailable) return answer(503, { error: 'rebill_unreachable' });
    throw error;
  }

  // Once per delivery: a retry of one already handled is acknowledged and dropped.
  const { error: seen } = await elevated.from('payment_events').insert({ id: event.logId, event_type: `rebill:${event.event}` });
  if (seen) {
    return seen.code === '23505' ? answer(200, { ok: true, repeated: true }) : answer(500, { error: 'not_recorded' });
  }

  if (!subscription || !planId) return answer(200, { ok: true, ignored: 'no subscription' });

  const userId = await ownerOf(elevated, subscription.id, event.paymentLinkId, subscription.natusUserId);
  if (!userId) {
    // Usually `subscription.created` arriving before the first payment names
    // its link: the payment's own event activates it.
    return answer(200, { ok: true, ignored: 'no Natus account yet' });
  }

  const change = rebillChange(subscription, planId);
  const before = await rowOf(elevated, subscription.id);
  const { data: current } = await elevated
    .from('subscriptions')
    .select('status, provider, ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  switch (change.kind) {
    case 'active': {
      // A gift is never overwritten by a payment; it is somebody's decision.
      if (current?.provider === 'manual' && current.status === 'active') break;
      const { error } = await elevated.from('subscriptions').upsert({
        user_id: userId,
        status: 'active',
        activated_at: before?.status === 'active' ? undefined : new Date().toISOString(),
        provider: 'rebill',
        provider_subscription_id: subscription.id,
        ends_at: null,
      });
      if (error) {
        console.error('rebill_activate_failed', error.code);
        break;
      }
      if (!before || before.status !== 'active') {
        await elevated.rpc('record_step', { p_user: userId, p_step: 'trial_started' });
      }
      break;
    }
    case 'end_at': {
      if (!before) break;
      await elevated
        .from('subscriptions')
        .update(change.endsAt ? { ends_at: change.endsAt } : { status: 'none', ends_at: new Date().toISOString() })
        .eq('provider_subscription_id', subscription.id);
      await elevated.rpc('record_step', { p_user: userId, p_step: 'canceled' });
      break;
    }
    case 'end_now': {
      if (!before) break;
      await elevated
        .from('subscriptions')
        .update({ status: 'none', ends_at: new Date().toISOString() })
        .eq('provider_subscription_id', subscription.id);
      break;
    }
    case 'ignore':
      break;
  }

  if (isRealCharge(event)) await elevated.rpc('record_step', { p_user: userId, p_step: 'first_charge' });

  await elevated.from('payment_events').update({ user_id: userId }).eq('id', event.logId);
  return answer(200, { ok: true });
});
