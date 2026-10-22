import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { allowOrigin, parseAllowedOrigins } from '../_shared/lib/cors.ts';
import { mayCheckout } from '../_shared/lib/rebill.ts';
import { createPaymentLink, premiumPlanId, RebillUnavailable } from '../_shared/rebill.ts';

/**
 * Opens a Rebill checkout for the person calling (sandbox trial, owner,
 * 22 Oct 2026): the first month free with the card saved, then US$10.
 *
 * The person is the one the token names, never one named in a body. The
 * link carries nothing that makes anybody premium: only Rebill's signed
 * notification to rebill-webhook does, after Rebill confirms the
 * subscription. While the key is the sandbox one, only the addresses in
 * `REBILL_TEST_EMAILS` get a link (`mayCheckout`), so a fake card can never
 * make a real person premium.
 */

/** Where Rebill sends the person back: their plan, on the site they came from. */
function returnTo(request: Request): string | null {
  const configured = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
  const origin = allowOrigin(request.headers.get('Origin'), configured);
  // Rebill refuses localhost, and an origin it would refuse is no address.
  if (!origin || !origin.startsWith('https://')) return null;
  return `${origin}/perfil?ver=plan`;
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

  const apiKey = Deno.env.get('REBILL_API_KEY');
  if (!apiKey) return json(request, { error: 'not_configured' }, 503);

  const { data: user } = await auth.elevated.auth.admin.getUserById(auth.userId);
  const email = user.user?.is_anonymous ? null : (user.user?.email ?? null);
  if (!email) return json(request, { error: 'account_required' }, 403);
  if (!mayCheckout(email, Deno.env.get('REBILL_TEST_EMAILS'), Deno.env.get('REBILL_OPEN'))) {
    return json(request, { error: 'not_available' }, 403);
  }

  // Somebody already premium — paying, or given it — is not sold it again.
  const { data: tier } = await auth.elevated.rpc('plan_tier', { p_user: auth.userId });
  if (tier === 'premium') return json(request, { error: 'already_premium' }, 409);

  try {
    const planId = await premiumPlanId(apiKey, auth.elevated);
    const link = await createPaymentLink(apiKey, { planId, userId: auth.userId, email, returnTo: returnTo(request) });
    const { error } = await auth.elevated
      .from('rebill_checkouts')
      .insert({ payment_link_id: link.id, user_id: auth.userId });
    if (error) return json(request, { error: 'not_recorded' }, 500);
    return json(request, { url: link.url });
  } catch (error) {
    if (error instanceof RebillUnavailable) return json(request, { error: 'rebill_unavailable' }, 502);
    throw error;
  }
});
