import { useState } from 'react';
import { PHOTO, Screen } from '@/design/Screen';
import { BrandMark } from '@/design/BrandMark';
import { copy } from '@/i18n';
import { AuthError, signInWithGoogle } from '@/supabase/session.ts';

/**
 * The door, for a closed pilot.
 *
 * PDR section 3 asks for the account *after* the Soul Map, because before it
 * an account is a toll gate on a product the person has not seen the value of.
 * That reasoning is about strangers. It does not apply to fifty people invited
 * by name, and this screen says so rather than pretending the sign-in is for
 * the person's benefit.
 *
 * It renders only when a backend is configured. Without one there is nothing
 * to protect and nothing to sign in to, and the fixture demo runs untouched.
 */
const text = copy.gate;

export function Gate() {
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(false);

  const enter = () => {
    setGoing(true);
    setError(null);
    signInWithGoogle().catch((e: unknown) => {
      setGoing(false);
      setError(
        e instanceof AuthError
          ? text.authFailed
          : text.failed,
      );
    });
  };

  return (
    <Screen backdrop="nebulosa" scrim="bottom" opacity={PHOTO.hero} focus="center 20%">
      <div className="mt-auto flex flex-col items-center px-7 pb-13 text-center">
        <BrandMark />

        <h1 className="mb-4 text-[length:var(--fs-display-sm)] leading-[var(--lh-heading-1_14)] text-blanco">
          {text.titleLead}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
        </h1>

        <p className="mb-8 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/60">
          {text.helper}
        </p>

        <button type="button" className="cta w-full" onClick={enter} disabled={going}>
          {going ? text.opening : text.enter}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-[length:var(--fs-body-12)] leading-relaxed text-error">
            {error}
          </p>
        )}

        {/*
          Said here rather than discovered mid-flow. Google shows an
          "unverified app" warning to anybody on the test-user list, and
          somebody who was not expecting it reasonably reads it as a scam.
        */}
        <p className="mt-5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
          {text.unverified}
        </p>

        <p className="mt-3 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
          {text.notListed}
        </p>
      </div>
    </Screen>
  );
}
