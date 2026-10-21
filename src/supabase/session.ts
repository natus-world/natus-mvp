import type { Session, User } from '@supabase/supabase-js';
import { requiresInvite, supabase } from './client';

/**
 * Identity, from the first page load.
 *
 * This is the Supabase-side counterpart of `store/session.ts`'s
 * `getOrCreateSession`, and it exists for one reason: `auth.uid()` has to
 * return something before any Row Level Security policy means anything. An
 * anonymous sign-in gives a real `auth.users` row to somebody who has typed
 * nothing and agreed to nothing, which is exactly the state PDR 5.1
 * describes — the account is asked for after the Soul Map, never before.
 *
 * The upgrade path is why the model is anonymous-then-email rather than a
 * mandatory login. `updateUser({ email })` attaches an identity to the row
 * that already exists, so the eight onboarding answers underneath it are not
 * migrated, re-parented or re-asked. Signing up moves no data.
 */

export type AuthState =
  | { kind: 'none' }
  | { kind: 'anonymous'; user: User }
  | { kind: 'identified'; user: User; email: string };

export class AuthError extends Error {}

/**
 * The session, if there is one. Never creates one.
 *
 * It used to sign in anonymously here, and for one day that was the whole auth
 * model. A door now sits in front of the product, so an identity
 * now arrives only by walking through it — creating one silently would be a
 * second way in, past the allow-list.
 *
 * Returns null when the backend is unconfigured or unreachable rather than
 * throwing. A paused free-tier project must degrade the demo to fixtures, not
 * end it — the same reasoning that governs `store/db.ts`'s swallowed reads.
 */
let inFlight: Promise<Session | null> | null = null;

export function currentSession(): Promise<Session | null> {
  if (!supabase) return Promise.resolve(null);
  // Shared between concurrent callers. StrictMode invokes the mount effect
  // twice, and without this both observe "no session" before either resolves
  // and both sign in — which produced two anonymous users eight microseconds
  // apart the first time this ran in a browser.
  inFlight ??= acquire().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function acquire(): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    // Only when the door is open. With VITE_REQUIRE_INVITE on, an identity
    // must arrive by walking through Google, and creating one here would be a
    // second way in past the allow-list.
    if (requiresInvite) return null;

    const { data: created, error } = await supabase.auth.signInAnonymously();
    if (error) return null;
    return created.session;
  } catch {
    // Network failure, DNS, a project mid-restore. Not a crash.
    return null;
  }
}

export function describe(user: User | null): AuthState {
  if (!user) return { kind: 'none' };
  return user.email
    ? { kind: 'identified', user, email: user.email }
    : { kind: 'anonymous', user };
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Attach an email to the anonymous row that already exists.
 *
 * Sends a confirmation link; the row keeps its id, so everything already
 * keyed to `auth.uid()` stays keyed to it. Nothing here writes the profile —
 * that is the store's job, and in this phase the store is still local.
 *
 * `emailRedirectTo` points at the application root rather than a nested
 * route. Under GitHub Pages a nested path returns HTTP 404 with the app as
 * its body — the SPA fallback working correctly — and sending an auth
 * callback through it makes every future failure ambiguous.
 */
export async function upgradeToEmail(email: string): Promise<void> {
  if (!supabase) throw new AuthError('There is no backend configured.');

  const { error } = await supabase.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString() },
  );

  if (error) throw new AuthError(error.message);
}

/**
 * The door.
 *
 * Sends the person to Google and back. Who is allowed through is not decided
 * here and not decided in this repository: it is the test-user list on the
 * OAuth consent screen, which refuses anyone not on it before the redirect
 * ever returns. There is nothing to check on this side, and adding a check
 * here would only be a second, weaker copy of that list.
 *
 * `redirectTo` resolves against `BASE_URL`, so it carries the `/natus-mvp/`
 * prefix and lands on the application root — which returns HTTP 200. A nested
 * route would resolve too, through the `404.html` fallback, but it returns 404
 * with the app as its body and makes every future auth failure ambiguous.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new AuthError('There is no backend configured.');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
    },
  });

  if (error) throw new AuthError(error.message);
}

/**
 * Keep everything already answered and give it a Google account (launch,
 * owner, 16 Oct 2026: Google only until there is a mail service).
 *
 * Links Google to the anonymous `auth.users` row that has existed since the
 * first page load, so its id — and every row keyed to it — stays. Needs
 * manual linking enabled in the project's Auth settings. After the round
 * trip, `completeLinkedSignup` (store/account-link.ts) creates the account
 * from the address Google returns.
 */
export async function linkGoogle(): Promise<void> {
  if (!supabase) throw new AuthError('There is no backend configured.');

  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
    },
  });

  if (error) throw new AuthError(error.message);
}

/**
 * Entering with a 6-digit code by e-mail (owner, 20 Oct 2026, the approved
 * mockup «Entrar con un código»). Two ways in, one code screen:
 *
 * - Saving the map: the address goes onto the anonymous row that has existed
 *   since the first page load (`updateUser`), so its id — and every row keyed
 *   to it — stays, as with `linkGoogle`. Supabase mails the code with the
 *   «Change email address» template and the code is checked as
 *   `email_change`. Needs «Confirm email» on in the project: without it the
 *   address is attached with no code at all.
 * - Coming back on another device: `signInWithOtp` with `shouldCreateUser:
 *   false`, so an address with no space gets no mail and no empty account.
 *   «Magic link» template, checked as `email`.
 *
 * Both were walked against the local stack with the approved templates on
 * 20 Oct 2026. Supabase answers a wrong code and an expired one the same way
 * (`otp_expired`), so the screen tells them apart by the time the code was
 * sent — see `CODE_TTL_MS`.
 */
export type CodePurpose = 'save' | 'return';

/** Why a code could not be sent or checked, in the terms the screen speaks. */
export type CodeFailure =
  /** The address already has its own space (saving the map). */
  | 'taken'
  /** No space with that address (coming back). */
  | 'none'
  /** Supabase allows one code a minute per address. */
  | 'wait'
  /** The code does not match, or it expired. */
  | 'invalid'
  /** Anything else: the network, the mail service. */
  | 'failed';

export class CodeError extends Error {
  constructor(readonly failure: CodeFailure) {
    super(failure);
  }
}

/** The project's «Email OTP expiration» (3600 s, checked 20 Oct 2026). */
export const CODE_TTL_MS = 60 * 60 * 1000;

/** Supabase's minimum interval between two mails to the same address. */
export const RESEND_AFTER_MS = 60 * 1000;

function sendFailure(error: { code?: string | undefined; status?: number | undefined }): CodeFailure {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return 'taken';
  if (error.code === 'otp_disabled') return 'none';
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) return 'wait';
  return 'failed';
}

/** Mail a code: to save the map with this address, or to come back with it. */
export async function sendCode(email: string, purpose: CodePurpose): Promise<void> {
  if (!supabase) throw new CodeError('failed');
  const address = email.trim();
  try {
    const { error } =
      purpose === 'save'
        ? await supabase.auth.updateUser({ email: address })
        : await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
    if (error) throw new CodeError(sendFailure(error));
  } catch (e) {
    throw e instanceof CodeError ? e : new CodeError('failed');
  }
}

/** Mail the code again. Saving resends the pending address change. */
export async function resendCode(email: string, purpose: CodePurpose): Promise<void> {
  if (!supabase) throw new CodeError('failed');
  if (purpose === 'return') return sendCode(email, purpose);
  try {
    const { error } = await supabase.auth.resend({ type: 'email_change', email: email.trim() });
    if (error) throw new CodeError(sendFailure(error));
  } catch (e) {
    throw e instanceof CodeError ? e : new CodeError('failed');
  }
}

/** Check the six digits. On success the session is the account's. */
export async function verifyCode(email: string, token: string, purpose: CodePurpose): Promise<void> {
  if (!supabase) throw new CodeError('failed');
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: purpose === 'save' ? 'email_change' : 'email',
    });
    if (error) throw new CodeError(error.code === 'otp_expired' || error.status === 403 ? 'invalid' : 'failed');
  } catch (e) {
    throw e instanceof CodeError ? e : new CodeError('failed');
  }
}

/**
 * What came back in the address after a Google round trip that failed, if
 * anything: `identity_already_exists` means that Google account already has
 * its own Natus space.
 */
export function oauthErrorInUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  return params.get('error_code') ?? params.get('error');
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export function onAuthChange(handler: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
