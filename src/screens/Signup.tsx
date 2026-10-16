import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { SignupError, isSignedIn, signUp } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { googleSignInEnabled, isBackendConfigured } from '@/supabase/client.ts';
import { linkGoogle, oauthErrorInUrl, upgradeToEmail } from '@/supabase/session.ts';

/**
 * The conversion moment of PDR section 3: the account is asked for *after* the
 * Soul Map, never before. By this point the person has answered seven screens
 * and has something on the table; before it, an account is a toll gate.
 *
 * What the screen says about itself has to keep matching what it does, at the
 * moment of the choice rather than in a policy nobody opens. It used to say no
 * account is created on any server, which was true of the static demo and
 * stopped being true the moment there was a backend; the note under the field
 * now branches on whether one is configured, so both builds tell the truth.
 *
 * Still no password field, and now for a better reason than the old one: the
 * address is attached to an `auth.users` row that has existed since the first
 * page load, and confirming it is a link in an email. There is nothing for a
 * password to protect that the anonymous session was not already holding.
 */

const text = copy.signup;

/**
 * Launch with Google only (owner, 16 Oct 2026): the email link needs a mail
 * service, and Supabase's built-in mail refuses anyone outside the team. The
 * email form shows only while Google is not switched on in the project.
 */

const fieldClass =
  'field w-full text-[length:var(--fs-body-14)] leading-5 placeholder:text-crema/55';

export function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    let live = true;
    void googleSignInEnabled().then((on) => {
      if (live) setGoogle(on);
    });
    return () => {
      live = false;
    };
  }, []);
  const [googleError, setGoogleError] = useState<string | null>(() =>
    oauthErrorInUrl() === 'identity_already_exists' ? text.googleTaken : null,
  );

  if (isSignedIn()) {
    return (
      <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content50}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">{text.alreadySignedIn}</p>
          <Link to="/hoy" className="cta no-underline">
            {text.toHome}
          </Link>
        </div>
      </Screen>
    );
  }

  if (!currentSynthesis()) {
    return (
      <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content50}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {text.noMap}
          </p>
          <Link to="/onboarding" className="cta no-underline">
            {text.start}
          </Link>
        </div>
      </Screen>
    );
  }

  const submit = () => {
    let created = false;
    try {
      signUp({ email });
      created = true;
    } catch (e) {
      setError(
        e instanceof SignupError
          ? text.invalidEmail
          : text.localFailed,
      );
      return;
    }

    if (!created || !isBackendConfigured) {
      navigate('/hoy');
      return;
    }

    // The local record is written first and the identity is attached second.
    // If the order were reversed and the local write then failed, the account
    // would exist with nothing on it — the same reasoning `store/account.ts`
    // gives for writing the client before claiming the session.
    //
    // The address goes onto the anonymous auth.users row that has existed
    // since the first page load, so nothing here moves data. That is the whole
    // reason this product asks for an account after the Soul Map rather than
    // before it: by now there is something to attach, and attaching it costs
    // the person nothing.
    setSending(true);
    upgradeToEmail(email)
      .then(() => setSent(true))
      .catch(() => {
        // The answers are saved either way. Only the confirmation failed, and
        // saying "no pudimos crear tu cuenta" here would be false.
        setError(text.mailFailed);
      })
      .finally(() => setSending(false));
  };

  if (sent) {
    return (
      <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content50}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {text.sentLead}
            <span className="text-blanco">{email}</span>
            {text.sentTail}
          </p>
          <p className="text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {text.sentNote}
          </p>
          <Link to="/hoy" className="cta no-underline">
            {text.toHome}
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content50}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-9 sm:min-h-0">
        <p className="eyebrow mb-3">{text.kicker}</p>

        <h1 className="mb-3 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {text.titleLead}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
        </h1>

        <p className="mb-7 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
          {text.helper}
        </p>

        {google ? (
          <>
            {googleError && (
              <p role="alert" className="mb-3 text-[length:var(--fs-body-12)] leading-relaxed text-error">
                {googleError}
              </p>
            )}
            <p className="text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">{text.googleNote}</p>
            <div className="mt-auto flex flex-col gap-2.5 pt-8">
              <button
                type="button"
                className="cta"
                disabled={sending}
                onClick={() => {
                  setSending(true);
                  setGoogleError(null);
                  linkGoogle().catch(() => {
                    setSending(false);
                    setGoogleError(text.googleFailed);
                  });
                }}
              >
                {sending ? text.saving : text.google}
              </button>
              <Link to="/hoy" className="chip chip-p10 text-center text-crema/60 no-underline">
                {text.later}
              </Link>
            </div>
          </>
        ) : (
        <>
        <label className="mb-1.5 block text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase" htmlFor="email">
          {text.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={fieldClass}
          value={email}
          placeholder={text.emailPlaceholder}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          aria-describedby="email-note"
          aria-invalid={error !== null}
        />

        {error && (
          <p role="alert" className="mt-2 text-[length:var(--fs-body-12)] leading-relaxed text-error">
            {error}
          </p>
        )}

        <p id="email-note" className="mt-2.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
          {isBackendConfigured ? text.noteBackend : text.noteOffline}
        </p>

        <div className="mt-auto flex flex-col gap-2.5 pt-8">
          <button
            type="button"
            className="cta"
            onClick={submit}
            disabled={email.trim() === '' || sending}
          >
            {sending ? text.saving : text.create}
          </button>

          <Link
            to="/hoy"
            className="chip chip-p10 text-center text-crema/60 no-underline"
          >
            {text.later}
          </Link>
        </div>
        </>
        )}
      </div>
    </Screen>
  );
}
