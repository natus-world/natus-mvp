import { useState } from 'react';
import { copy } from '@/i18n';
import { isPlausibleEmail } from '@/store/account';
import { CodeError, sendCode, type CodeFailure, type CodePurpose } from '@/supabase/session';

const text = copy.signup;

/**
 * The address under «Continuar con Google» (owner, 20 Oct 2026, mockup
 * «Entrar con un código», screens 1, 6 and 7): «o», «Tu correo» and
 * «Enviarme el código». What went wrong shows right under the field, which
 * keeps what was written; nothing is sent to an address that does not look
 * like one.
 */
export function EmailCodeForm({
  purpose,
  email,
  onEmail,
  onSent,
  failureText,
}: {
  purpose: CodePurpose;
  email: string;
  onEmail: (email: string) => void;
  onSent: (sentAt: number) => void;
  /** What the screen says for a failure of its own (`taken`, `none`). */
  failureText: (failure: CodeFailure) => string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (sending) return;
    if (!isPlausibleEmail(email)) {
      setError(text.invalidEmail);
      return;
    }
    setError(null);
    setSending(true);
    sendCode(email, purpose)
      .then(() => onSent(Date.now()))
      .catch((e: unknown) => {
        const failure: CodeFailure = e instanceof CodeError ? e.failure : 'failed';
        setError(failureText(failure) ?? (failure === 'wait' ? text.code.wait : text.code.sendFailed));
      })
      .finally(() => setSending(false));
  };

  return (
    <>
      <p className="o">{text.or}</p>
      <div className={`vid campo solo correo${error ? ' campo-err' : ''}`}>
        <label className="l" htmlFor="correo">
          {text.emailLabel}
        </label>
        <input
          id="correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="v"
          value={email}
          placeholder={text.emailPlaceholder}
          onChange={(e) => {
            onEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? 'correo-error' : undefined}
        />
      </div>
      {error && (
        <p id="correo-error" className="estado err" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn s" disabled={email.trim() === '' || sending} onClick={submit}>
        {text.send}
      </button>
    </>
  );
}
