import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { BrandMark } from '@/design/BrandMark';
import { copy } from '@/i18n';
import { currentSynthesis } from '@/store/soulMap';
import { restartOnboarding } from '@/store/session';
import { isSignedIn } from '@/store/account';
import { googleSignInEnabled } from '@/supabase/client';
import { signInWithGoogle } from '@/supabase/session';

const text = copy.landing;

/** Screen 1 of PDR 6.1, built from mockup screen 01. */
export function Landing() {
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
  const navigate = useNavigate();
  // Someone who already has a map should not be met by a first-run screen.
  const returning = currentSynthesis() !== undefined;

  return (
    <Screen backdrop="hero" scrim="bottom" opacity={PHOTO.hero} focus="center 20%">
      <div className="mt-auto flex flex-col items-center px-7 pb-13 text-center">
        <BrandMark />

        <p className="eyebrow mb-3">{text.kicker}</p>

        <h1 className="mb-3.5 text-[length:var(--fs-display)] leading-[var(--lh-heading-1_12)] text-blanco">
          {text.titleLines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>

        {/*
         * The mockup read "Tu carta astral. Tu dolor. El terapeuta que te
         * entiende." Two problems with it, both from PDR 1.1: "tu dolor" casts
         * the person as a patient rather than the protagonist, and promising
         * "el terapeuta que te entiende" is a prediction of alliance the MVP
         * cannot make — it recommends modalities, not people.
         */}
        <p className="mb-8 max-w-[268px] text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
          {text.helper}
        </p>

        <button
          type="button"
          className="cta"
          onClick={() => navigate(returning ? '/hoy' : '/onboarding')}
        >
          <span>{returning ? text.returning : text.start}</span>
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-crema/15 text-[length:var(--fs-body-14)] leading-5"
          >
            →
          </span>
        </button>

        {/* Launch with Google (owner, 16 Oct 2026): somebody coming back on a
            new device signs in and finds their space. */}
        {!returning && google && !isSignedIn() && (
          <button
            type="button"
            onClick={() => void signInWithGoogle().catch(() => {})}
            className="mt-3 px-2 py-1 text-[length:var(--fs-body-11)] text-crema/60 underline underline-offset-4 hover:text-crema/80"
          >
            {text.signIn}
          </button>
        )}

        {returning && (
          <button
            type="button"
            onClick={() => {
              restartOnboarding();
              navigate('/onboarding');
            }}
            className="mt-3 px-2 py-1 text-[length:var(--fs-body-11)] text-crema/55 underline underline-offset-4 hover:text-crema/70"
          >
            {text.restart}
          </button>
        )}
      </div>
    </Screen>
  );
}
