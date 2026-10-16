import { Link } from 'react-router-dom';
import { copy } from '@/i18n';
import { CrisisResourceList } from '@/components/CrisisResourceList';
import { useTakeover } from '@/components/takeover';

/**
 * The full-screen takeover for high severity. PDR 6.4.
 *
 * Package 12 (16 Oct 2026): a cream sheet, no photograph — plain background,
 * large letters, clear numbers, nothing to distract. Containment, the lines,
 * «Volver» and, discreet, «Esto no aplica a mi caso».
 *
 * What this screen deliberately does not do: interpret, symbolise, offer a
 * reading of the natal chart, suggest a modality, or upsell anything. PDR 1.6
 * — clinical safety before product, without a commercial fallback. It shows
 * containment and phone numbers, and gets out of the way.
 *
 * The copy here is a draft. PDR 14 lists "lenguaje del crisis_response
 * revisado por psicólogo" as a production blocker.
 */
export function CrisisScreen({
  country,
  message,
  onNotMyCase,
  onBack,
}: {
  country: string | undefined;
  /** Layer 2 supplies `crisis_response`; Layer 1 has no model text and uses
   *  the written fallback below. */
  message?: string;
  onNotMyCase?: () => void;
  onBack?: () => void;
}) {
  useTakeover();

  return (
    <div className="pz ayuda-pz crisis">
      <div className="cuerpo-c">
        <p className="k">{copy.crisisScreen.kicker}</p>
        <h1 className="t">
          {copy.crisisScreen.titleLead}
          <em>{copy.crisisScreen.titleEmphasis}</em>
        </h1>
        <p className="x">{message ?? copy.crisisScreen.message}</p>

        <CrisisResourceList country={country} tone="paper" />

        {onBack && (
          <button type="button" className="volver-b" onClick={onBack}>
            {copy.crisisScreen.back}
          </button>
        )}

        {onNotMyCase && (
          /*
           * PDR 6.4. Discreet on purpose: it must exist, and it must not
           * read as an invitation to dismiss the screen. Without it,
           * someone who wrote "ya no aguanto este trabajo" is locked out of
           * the product with no way back.
           */
          <button type="button" className="no-aplica" onClick={onNotMyCase}>
            {copy.crisisScreen.notMyCase}
          </button>
        )}

        <Link to="/perfil" className="no-aplica">
          {copy.crisisScreen.data}
        </Link>
      </div>
    </div>
  );
}
