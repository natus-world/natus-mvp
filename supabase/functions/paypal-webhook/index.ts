import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { readPayPalEvent } from '../_shared/lib/paypal.ts';

/**
 * PayPal's notifications about Natus subscriptions (v1.2 P-01, automatic:
 * owner, 15 Oct 2026).
 *
 * Called by PayPal, not by a person, so there is no JWT (verify_jwt is off
 * for this function in config.toml). What stands in for it is PayPal's own
 * signature, checked with PayPal before anything is written: an event that
 * PayPal does not vouch for changes nothing. A person can therefore never make
 * themselves premium by calling this URL.
 *
 * Each event is recorded once by PayPal's id, so a retry changes nothing, and
 * only who and what: never the payer's name, email or the amount.
 *
 * Secrets, set in Supabase (Edge Functions → Secrets):
 *   PAYPAL_CLIENT_ID      the app's client id (the same one the button uses)
 *   PAYPAL_CLIENT_SECRET  its secret
 *   PAYPAL_WEBHOOK_ID     the id PayPal gives this webhook
 *   PAYPAL_API_BASE       optional; https://api-m.sandbox.paypal.com to test
 */

const API_BASE = Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.paypal.com';

function answer(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function accessToken(clientId: string, secret: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { access_token?: string };
  return body.access_token ?? null;
}

/** Asks PayPal whether it sent this event, exactly as received. */
async function vouchedFor(request: Request, event: unknown, token: string, webhookId: string): Promise<boolean> {
  const header = (name: string) => request.headers.get(name) ?? '';
  const response = await fetch(`${API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: header('paypal-auth-algo'),
      cert_url: header('paypal-cert-url'),
      transmission_id: header('paypal-transmission-id'),
      transmission_sig: header('paypal-transmission-sig'),
      transmission_time: header('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { verification_status?: string };
  return body.verification_status === 'SUCCESS';
}

async function userOf(elevated: SupabaseClient, subscriptionId: string): Promise<string | null> {
  const { data } = await elevated
    .from('subscriptions')
    .select('user_id')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return answer(405, { error: 'method_not_allowed' });

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // PayPal retries what is not answered with a 2xx, so an unconfigured
  // deployment loses nothing: the events arrive again once it is configured.
  if (!clientId || !secret || !webhookId || !url || !serviceKey) return answer(503, { error: 'not_configured' });

  let event: Record<string, unknown>;
  try {
    event = (await request.json()) as Record<string, unknown>;
  } catch {
    return answer(400, { error: 'invalid_body' });
  }

  const token = await accessToken(clientId, secret);
  if (!token) return answer(503, { error: 'paypal_unreachable' });
  if (!(await vouchedFor(request, event, token, webhookId))) return answer(400, { error: 'not_from_paypal' });

  const elevated = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const eventId = typeof event['id'] === 'string' ? event['id'] : null;
  const eventType = typeof event['event_type'] === 'string' ? event['event_type'] : 'unknown';
  if (!eventId) return answer(400, { error: 'no_event_id' });

  // Once per event: a retry of one already handled is acknowledged and dropped.
  const { error: seen } = await elevated.from('payment_events').insert({ id: eventId, event_type: eventType });
  if (seen) {
    return seen.code === '23505' ? answer(200, { ok: true, repeated: true }) : answer(500, { error: 'not_recorded' });
  }

  const change = readPayPalEvent(event);
  let userId: string | null = null;

  switch (change.kind) {
    case 'activate': {
      userId = change.userId;
      const { error } = await elevated.from('subscriptions').upsert({
        user_id: change.userId,
        status: 'active',
        activated_at: new Date().toISOString(),
        provider: 'paypal',
        provider_subscription_id: change.subscriptionId,
        ends_at: null,
      });
      if (error) {
        // An account that does not exist (deleted, or a stamp that was never
        // one of ours). Acknowledged, so PayPal stops retrying; nothing changed.
        console.error('paypal_activate_failed', error.code);
        userId = null;
        break;
      }
      await elevated.rpc('record_step', { p_user: change.userId, p_step: 'trial_started' });
      break;
    }
    case 'end_at': {
      userId = await userOf(elevated, change.subscriptionId);
      const endsAt = change.endsAt && new Date(change.endsAt) > new Date() ? change.endsAt : null;
      await elevated
        .from('subscriptions')
        .update(endsAt ? { ends_at: endsAt } : { status: 'none', ends_at: new Date().toISOString() })
        .eq('provider_subscription_id', change.subscriptionId);
      if (userId) await elevated.rpc('record_step', { p_user: userId, p_step: 'canceled' });
      break;
    }
    case 'end_now': {
      userId = await userOf(elevated, change.subscriptionId);
      await elevated
        .from('subscriptions')
        .update({ status: 'none', ends_at: new Date().toISOString() })
        .eq('provider_subscription_id', change.subscriptionId);
      break;
    }
    case 'charged': {
      userId = await userOf(elevated, change.subscriptionId);
      if (userId) await elevated.rpc('record_step', { p_user: userId, p_step: 'first_charge' });
      break;
    }
    case 'ignore':
      break;
  }

  if (userId) await elevated.from('payment_events').update({ user_id: userId }).eq('id', eventId);
  return answer(200, { ok: true });
});
