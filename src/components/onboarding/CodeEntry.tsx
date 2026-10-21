import { useEffect, useRef, useState } from 'react';
import { copy } from '@/i18n';
import { EnvelopeIcon } from '@/components/onboarding/icons';
import {
  CODE_TTL_MS,
  CodeError,
  RESEND_AFTER_MS,
  resendCode,
  verifyCode,
  type CodePurpose,
} from '@/supabase/session';

const text = copy.signup;
const c = text.code;
const LENGTH = 6;

type Status = 'idle' | 'checking' | 'wrong' | 'expired' | 'failed';

/**
 * «Escribe tu código» (owner, 20 Oct 2026, mockup «Entrar con un código»,
 * screens 2 to 5): the same screen for saving the map and for coming back.
 *
 * Six boxes drawn over one real input, so the phone offers the code from the
 * mail (`one-time-code`), opens the number pad, and a paste fills all six.
 * No «Continuar»: the sixth digit checks it. A wrong code keeps the digits so
 * one can be fixed; Supabase answers a wrong code and an expired one alike,
 * so «vencido» is told by the time it was sent. «Reenviar» waits the minute
 * Supabase asks between two mails, with a fixed line and no countdown.
 */
export function CodeEntry({
  email,
  purpose,
  sentAt: firstSentAt,
  onVerified,
  onResent,
  onOtherEmail,
}: {
  email: string;
  purpose: CodePurpose;
  sentAt: number;
  onVerified: () => void;
  onResent: (sentAt: number) => void;
  onOtherEmail: () => void;
}) {
  const [digits, setDigits] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [focused, setFocused] = useState(true);
  const [sentAt, setSentAt] = useState(firstSentAt);
  const [canResend, setCanResend] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendFailed, setResendFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanResend(false);
    const wait = Math.max(0, sentAt + RESEND_AFTER_MS - Date.now());
    const timer = setTimeout(() => setCanResend(true), wait);
    return () => clearTimeout(timer);
  }, [sentAt]);

  const check = (code: string) => {
    setStatus('checking');
    verifyCode(email, code, purpose)
      .then(onVerified)
      .catch((e: unknown) => {
        if (e instanceof CodeError && e.failure === 'invalid') {
          setStatus(Date.now() - sentAt >= CODE_TTL_MS ? 'expired' : 'wrong');
        } else {
          setStatus('failed');
        }
      });
  };

  const change = (value: string) => {
    if (status === 'checking') return;
    const next = value.replace(/\D/g, '').slice(0, LENGTH);
    setDigits(next);
    setResent(false);
    setResendFailed(false);
    if (next !== digits && status !== 'idle') setStatus('idle');
    if (next.length === LENGTH && next !== digits) check(next);
  };

  const again = () => {
    setResendFailed(false);
    resendCode(email, purpose)
      .then(() => {
        setDigits('');
        setStatus('idle');
        setResent(true);
        const now = Date.now();
        setSentAt(now);
        onResent(now);
        input.current?.focus();
      })
      .catch((e: unknown) => {
        // The minute is not over yet: the line under the button says so.
        if (e instanceof CodeError && e.failure === 'wait') setSentAt(Date.now());
        else setResendFailed(true);
      });
  };

  const error = status === 'wrong' || status === 'expired' || status === 'failed';
  const boxes = `cod${status === 'checking' ? ' revisa' : ''}${error ? ' err' : ''}`;
  const expired = status === 'expired';

  let line = null;
  if (status === 'checking') {
    line = (
      <p className="estado" role="status">
        <span className="pulso" aria-hidden="true" />
        {c.checking}
      </p>
    );
  } else if (error) {
    line = (
      <p className="estado err" role="alert">
        {status === 'wrong' ? c.wrong : status === 'expired' ? c.expired : c.checkFailed}
      </p>
    );
  } else if (resendFailed) {
    line = (
      <p className="estado err" role="alert">
        {c.sendFailed}
      </p>
    );
  } else if (resent) {
    line = (
      <p className="estado" role="status">
        {c.resent}
      </p>
    );
  }

  return (
    <>
      <p className="k">{text.sentKicker}</p>
      <h1 className="t mt" id="codigo-titulo">
        {c.titleLead}
        <em>{c.titleEmphasis}</em>
      </h1>
      <p className="cuerpo" id="codigo-ayuda">
        {c.leadHead}
        <span className="dir">{email}</span>
        {c.leadTail}
      </p>

      <div className="cod-zona">
        <div className="cod-caja">
          <div className={boxes} aria-hidden="true">
            {Array.from({ length: LENGTH }, (_, i) => (
              <span
                key={i}
                className={
                  focused && status === 'idle' && i === Math.min(digits.length, LENGTH - 1) && digits.length < LENGTH
                    ? 'foco'
                    : undefined
                }
              >
                {digits.charAt(i)}
              </span>
            ))}
          </div>
          <input
            ref={input}
            id="codigo"
            className="cod-in"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={LENGTH}
            value={digits}
            readOnly={status === 'checking'}
            aria-labelledby="codigo-titulo"
            aria-describedby="codigo-ayuda"
            aria-invalid={error}
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => change(e.target.value)}
          />
        </div>
        {line ?? (
          <div className="vid correo-b bq">
            <EnvelopeIcon />
            <p className="l">{text.sentSpam}</p>
          </div>
        )}
      </div>

      <div className="botones abajo">
        {expired ? (
          <button type="button" className="btn p" onClick={again}>
            {c.newCode}
          </button>
        ) : (
          <>
            <button type="button" className="btn s" disabled={!canResend} onClick={again}>
              {c.resend}
            </button>
            {!canResend && <p className="espera">{c.wait}</p>}
          </>
        )}
        <button type="button" className="link" onClick={onOtherEmail}>
          <u>{text.otherEmail}</u>
        </button>
      </div>
    </>
  );
}
