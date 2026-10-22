import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { supabase } from '@/supabase/client';

const text = copy.rebillTest;

type State = 'opening' | keyof typeof text.errors;

/**
 * The Rebill trial, by hand (owner, 22 Oct 2026). Not linked from anywhere:
 * the owner opens `/prueba/rebill` signed in with an address listed in
 * `REBILL_TEST_EMAILS`, and is sent to Rebill's sandbox checkout. Everybody
 * else is refused by the server, whatever this page shows.
 */
export function RebillTest() {
  const [state, setState] = useState<State>('opening');

  useEffect(() => {
    let live = true;
    void (async () => {
      if (!supabase) {
        if (live) setState('failed');
        return;
      }
      const { data, error } = await supabase.functions.invoke<{ url?: string }>('rebill-checkout', { body: {} });
      if (!live) return;
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      const reason = await (error as { context?: Response } | null)?.context?.json?.().catch(() => null);
      const code = (reason as { error?: string } | null)?.error;
      setState(code && code in text.errors ? (code as State) : 'failed');
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex flex-col justify-center gap-6 px-6 text-center flex-1">
        <h1 className="font-serif text-[length:var(--fs-voice-22)] leading-snug font-light text-blanco">
          {state === 'opening' ? text.opening : text.errors[state]}
        </h1>
        {state !== 'opening' && (
          <Link to="/" className="cta no-underline">
            {copy.notFound.home}
          </Link>
        )}
      </div>
    </Screen>
  );
}
