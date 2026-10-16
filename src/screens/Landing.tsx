import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { ForwardIcon } from '@/components/onboarding/icons';
import { copy } from '@/i18n';
import { currentSynthesis } from '@/store/soulMap';
import { restartOnboarding } from '@/store/session';
import { isSignedIn } from '@/store/account';
import { googleSignInEnabled } from '@/supabase/client';
import { signInWithGoogle } from '@/supabase/session';

const text = copy.landing;

/**
 * Package 01, «Bienvenida» (16 Oct 2026): the monstera, the name, the phrase,
 * and one button. «Comenzar» opens the three steps; the account comes after
 * the map, as it always has.
 */
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
    <Screen photo="monstera" veil={0.3} glassAlpha={0.42}>
      <div className="pz entrada bienvenida">
        <div className="d-izq medio">
          <p className="k">{text.kicker}</p>
          <h1 className="logo mt">{text.brand}</h1>
          <p className="fr mt">
            {text.phraseLead}
            <em>{text.phraseEmphasis}</em>
            {text.phraseTail}
          </p>

          <div className="botones">
            <button type="button" className="btn p" onClick={() => navigate(returning ? '/hoy' : '/onboarding')}>
              {returning ? text.returning : text.start}
              <ForwardIcon />
            </button>

            {/* Launch with Google (owner, 16 Oct 2026): somebody coming back on a
                new device signs in and finds their space. */}
            {!returning && google && !isSignedIn() && (
              <button type="button" className="link" onClick={() => void signInWithGoogle().catch(() => {})}>
                <u>{text.returning}</u>
              </button>
            )}

            {returning && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  restartOnboarding();
                  navigate('/onboarding');
                }}
              >
                <u>{text.restart}</u>
              </button>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
