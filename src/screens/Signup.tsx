import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { EnvelopeIcon, GoogleMark } from '@/components/onboarding/icons';
import { copy } from '@/i18n';
import { SignupError, isSignedIn, signUp } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { googleSignInEnabled, isBackendConfigured } from '@/supabase/client.ts';
import { LegalLinks } from '@/components/LegalLinks';
import { linkGoogle, oauthErrorInUrl, signInWithGoogle, upgradeToEmail, type CodePurpose } from '@/supabase/session.ts';
import { accountRequired, clearAccountRequirement } from '@/store/account-required';
import { completeLinkedSignup } from '@/store/account-link';
import { CodeEntry } from '@/components/onboarding/CodeEntry';
import { EmailCodeForm } from '@/components/onboarding/EmailCodeForm';
import { readPendingCode, savePendingCode, type PendingCode } from '@/components/onboarding/pending-code';
import { track } from '@/store/funnel';
import { CARE_PATH } from '@/store/care';
import { PATHS } from '@/components/routes';

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

/**
 * Package 01, «Crear cuenta»: the incense; «Revisa tu correo»: the night ocean.
 * «Escribe tu código» (mockup «Entrar con un código», 20 Oct 2026): the wave,
 * veil .18 and glass .48; «Volver a tu espacio»: the blue silk, .30 and .30.
 */
export function Page({
  photo = 'incienso',
  veil = 0.14,
  glassAlpha = 0.3,
  className = '',
  children,
}: {
  photo?: 'incienso' | 'oceanoNoche' | 'ola' | 'sedaAzul';
  veil?: number;
  glassAlpha?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Screen photo={photo} veil={veil} glassAlpha={glassAlpha}>
      <div className={`pz entrada cuenta${className ? ` ${className}` : ''}`}>
        <div className="sc">
          <div className="d-izq medio">{children}</div>
        </div>
      </div>
    </Screen>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The code on its way (owner, 20 Oct 2026): to which address, and when.
  // Saving, or entering the space an address already has (option A).
  type Pending = PendingCode & { purpose: CodePurpose };
  const [code, setCodeState] = useState<Pending | null>(() => {
    const save = readPendingCode('save');
    if (save) return { ...save, purpose: 'save' };
    const back = readPendingCode('return');
    return back ? { ...back, purpose: 'return' } : null;
  });
  const setCode = (next: Pending | null) => {
    savePendingCode(next?.purpose ?? 'save', next && { email: next.email, sentAt: next.sentAt });
    if (!next) savePendingCode('return', null);
    setCodeState(next);
  };
  // Somebody sent here to save a new map already knows Google is on.
  const [google, setGoogle] = useState(() => accountRequired());
  useEffect(() => {
    let live = true;
    void googleSignInEnabled().then((on) => {
      if (live) setGoogle(on);
    });
    return () => {
      live = false;
    };
  }, []);
  // The funnel's Google screen: seen with a map waiting to be saved.
  useEffect(() => {
    if (!isSignedIn() && currentSynthesis()) track('signup_seen');
  }, []);
  const taken = oauthErrorInUrl() === 'identity_already_exists';
  // Google before the map (owner, 16 Oct 2026): no «Ahora no».
  const required = accountRequired();
  const r = text.required;
  const [googleError, setGoogleError] = useState<string | null>(() =>
    taken ? (required ? r.taken : text.googleTaken) : null,
  );

  if (isSignedIn()) {
    return (
      <Page>
        <p className="k">{text.kicker}</p>
        <p className="cuerpo">{text.alreadySignedIn}</p>
        <div className="botones">
          <Link to="/hoy" className="btn p">
            {text.toHome}
          </Link>
        </div>
      </Page>
    );
  }

  if (!currentSynthesis()) {
    return (
      <Page>
        <p className="k">{text.kicker}</p>
        <p className="cuerpo">{text.noMap}</p>
        <div className="botones">
          <Link to="/onboarding" className="btn p">
            {text.start}
          </Link>
        </div>
      </Page>
    );
  }

  // The code matched: the anonymous row now carries the address, and the
  // account is created from it as after Google; the way goes on to «Cómo
  // trabajar» and «Para cuidarte» (owner, 20 Oct 2026).
  const saved = () => {
    void completeLinkedSignup().then((created) => {
      if (created) {
        savePendingCode('save', null);
        clearAccountRequirement();
        navigate(CARE_PATH, { replace: true, state: { next: PATHS.paths } });
      } else {
        setCode(null);
        setGoogleError(text.localFailed);
      }
    });
  };

  if (code) {
    return (
      <Page photo="ola" veil={0.18} glassAlpha={0.48} className="codigo">
        <CodeEntry
          email={code.email}
          purpose={code.purpose}
          sentAt={code.sentAt}
          onVerified={
            code.purpose === 'save'
              ? saved
              : () => {
                  // Into the space that address already has; the new map
                  // stays behind on the anonymous row, as with Google.
                  savePendingCode('return', null);
                  window.location.replace(`${import.meta.env.BASE_URL}hoy`);
                }
          }
          onResent={(sentAt) => setCode({ ...code, sentAt })}
          onOtherEmail={() => setCode(null)}
        />
      </Page>
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
      <Page photo="oceanoNoche">
        <p className="k">{text.sentKicker}</p>
        <h1 className="t mt">
          {text.sentTitleLead}
          <em>{text.sentTitleEmphasis}</em>
        </h1>
        <p className="cuerpo">
          {text.sentLead}
          <span className="dir">{email}</span>
          {text.sentTail}
        </p>
        <div className="vid correo-b bq">
          <EnvelopeIcon />
          <p className="l">{text.sentSpam}</p>
        </div>
        <p className="aviso">{text.sentNote}</p>
        <div className="botones abajo">
          <Link to="/hoy" className="btn p">
            {text.toHome}
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <p className="k">{text.kicker}</p>
      <h1 className="t mt">
        {required ? r.titleLead : text.titleLead}
        <em>{required ? r.titleEmphasis : text.titleEmphasis}</em>
      </h1>
      <p className="cuerpo">{required ? r.helper : text.helper}</p>

      {google ? (
        <div className="botones ancho">
          {googleError && (
            <p role="alert" className="falta">
              {googleError}
            </p>
          )}
          <button
            type="button"
            className="btn p"
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
            <GoogleMark />
            {sending ? text.saving : required ? r.cta : text.google}
          </button>
          {required && (
            <EmailCodeForm
              purpose="save"
              email={email}
              onEmail={setEmail}
              onSent={(sentAt) => setCode({ email: email.trim(), sentAt, purpose: 'save' })}
              onReturnSent={(sentAt) => setCode({ email: email.trim(), sentAt, purpose: 'return' })}
              failureText={() => null}
            />
          )}
          <p className="aviso">{required ? r.note : text.googleNote}</p>
          {required ? (
            taken && (
              <button
                type="button"
                className="btn s"
                onClick={() => void signInWithGoogle().catch(() => setGoogleError(text.googleFailed))}
              >
                {r.useThatAccount}
              </button>
            )
          ) : (
            <Link to="/hoy" className="link">
              <u>{text.later}</u>
            </Link>
          )}
          <LegalLinks className="legal" />
        </div>
      ) : (
        <div className="botones ancho">
          <div className="vid campo solo correo">
            <label className="l" htmlFor="email">
              {text.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="v"
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
          </div>

          {error && (
            <p role="alert" className="falta">
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn p"
            onClick={submit}
            disabled={email.trim() === '' || sending}
          >
            {sending ? text.saving : text.create}
          </button>

          <p id="email-note" className="aviso">
            {isBackendConfigured ? text.noteBackend : text.noteOffline}
          </p>

          <Link to="/hoy" className="link">
            <u>{text.later}</u>
          </Link>
        </div>
      )}
    </Page>
  );
}
