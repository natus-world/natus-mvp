import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '@/i18n';
import { GoogleMark } from '@/components/onboarding/icons';
import { CodeEntry } from '@/components/onboarding/CodeEntry';
import { EmailCodeForm } from '@/components/onboarding/EmailCodeForm';
import { readPendingCode, savePendingCode, type PendingCode } from '@/components/onboarding/pending-code';
import { signInWithGoogle } from '@/supabase/session';
import { Page } from './Signup';

const text = copy.signup;
const t = text.returning;

/**
 * «Volver a tu espacio» (owner, 20 Oct 2026, mockup «Entrar con un código»,
 * screens 6 and 7): somebody with a space comes back on another device, with
 * Google or with a code. «Volver a mi espacio» in the welcome opens it; it
 * used to open Google straight away.
 *
 * Only an address that already has a space gets a code (`shouldCreateUser:
 * false`), and the screen says so when it has none (the owner chose to say
 * it, 20 Oct 2026). Once the code matches, the page loads again from the start
 * on Hoy, so everything is read from the space signed into.
 */
export function Returning() {
  const [email, setEmail] = useState('');
  const [code, setCodeState] = useState<PendingCode | null>(() => readPendingCode('return'));
  const setCode = (next: PendingCode | null) => {
    savePendingCode('return', next);
    setCodeState(next);
  };
  const [googleError, setGoogleError] = useState<string | null>(null);

  if (code) {
    return (
      <Page photo="ola" veil={0.18} glassAlpha={0.48} className="codigo">
        <CodeEntry
          email={code.email}
          purpose="return"
          sentAt={code.sentAt}
          onVerified={() => {
            savePendingCode('return', null);
            window.location.replace(`${import.meta.env.BASE_URL}hoy`);
          }}
          onResent={(sentAt) => setCode({ email: code.email, sentAt })}
          onOtherEmail={() => setCode(null)}
        />
      </Page>
    );
  }

  return (
    <Page photo="sedaAzul" veil={0.3} glassAlpha={0.3} className="volver">
      <p className="k">{t.kicker}</p>
      <h1 className="t mt">
        {t.titleLead}
        <em>{t.titleEmphasis}</em>
      </h1>
      <p className="cuerpo">{t.helper}</p>

      <div className="botones ancho">
        {googleError && (
          <p role="alert" className="falta">
            {googleError}
          </p>
        )}
        <button
          type="button"
          className="btn p"
          onClick={() => {
            setGoogleError(null);
            signInWithGoogle().catch(() => setGoogleError(text.googleFailed));
          }}
        >
          <GoogleMark />
          {text.required.cta}
        </button>
        <EmailCodeForm
          purpose="return"
          email={email}
          onEmail={setEmail}
          onSent={(sentAt) => setCode({ email: email.trim(), sentAt })}
          failureText={(failure) => (failure === 'none' ? t.none : null)}
        />
        <p className="aviso primera">
          {t.firstLead}
          <Link to="/onboarding">
            <u>{t.firstLink}</u>
          </Link>
        </p>
      </div>
    </Page>
  );
}
