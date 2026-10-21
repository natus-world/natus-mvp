import { useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { ForwardIcon } from '@/components/onboarding/icons';
import { copy } from '@/i18n';
import { currentSynthesis } from '@/store/soulMap';
import { restartOnboarding } from '@/store/session';
import { isSignedIn } from '@/store/account';
import { isBackendConfigured } from '@/supabase/client';

const text = copy.landing;

/**
 * Package 01, «Bienvenida» (16 Oct 2026): the monstera, the name, the phrase,
 * and one button. «Comenzar» opens the three steps; the account comes after
 * the map, as it always has.
 */
export function Landing() {
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

            {/* Somebody coming back on a new device finds their space, with
                Google or with a code (owner, 20 Oct 2026): «Volver a tu espacio». */}
            {!returning && isBackendConfigured && !isSignedIn() && (
              <button type="button" className="link" onClick={() => navigate('/volver')}>
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
