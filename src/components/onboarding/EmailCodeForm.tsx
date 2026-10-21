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
 *
 * Saving with an address that already has its own space (option A, owner,
 * 20 Oct 2026): it says so, and the button becomes «Entrar con ese correo»,
 * which mails the code to come back into that space; the new map stays
 * behind, as with «Entrar con esa cuenta» on Google. Editing the address
 * brings «Enviarme el código» back.
 */
export function EmailCodeForm({
  purpose,
  email,
  onEmail,
  onSent,
  failureText,
  onReturnSent,
}: {
  purpose: CodePurpose;
  email: string;
  onEmail: (email: string) => void;
  onSent: (sentAt: number) => void;
  /** What the screen says for a failure of its own (`taken`, `none`). */
  failureText: (failure: CodeFailure) => string | null;
  /** When the address already has a space: the code to enter it was sent. */
  onReturnSent?: (sentAt: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [taken, setTaken] = useState<string | null>(null);
  const enterTaken = onReturnSent !== undefined && taken !== null && taken === email.trim();

  const submit = () => {
    if (sending) return;
    if (!isPlausibleEmail(email)) {
      setError(text.invalidEmail);
      return;
    }
    setSending(true);
    if (enterTaken) {
      sendCode(email, 'return')
        .then(() => onReturnSent(Date.now()))
        .catch((e: unknown) => {
          const failure: CodeFailure = e instanceof CodeError ? e.failure : 'failed';
          setError(failure === 'wait' ? text.code.wait : text.code.sendFailed);
        })
        .finally(() => setSending(false));
      return;
    }
    setError(null);
    sendCode(email, purpose)
      .then(() => onSent(Date.now()))
      .catch((e: unknown) => {
        const failure: CodeFailure = e instanceof CodeError ? e.failure : 'failed';
        if (failure === 'taken' && onReturnSent) {
          setTaken(email.trim());
          setError(text.emailTaken);
          return;
        }
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
            setTaken(null);
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
        {enterTaken ? text.useThatEmail : text.send}
      </button>
    </>
  );
}
