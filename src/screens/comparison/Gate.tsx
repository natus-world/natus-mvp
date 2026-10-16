import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { hadCrisisWithin30Days, markFalsePositive } from '@/store/crisis';
import { isComparisonWithheld } from '@/lib/safety';
import { useActiveCrisisId } from '@/components/takeover';
import { activeProfile, type ActiveProfile } from '@/store/account';
import { PATHS } from '@/components/routes';
import { currentSynthesis } from '@/store/soulMap';

/**
 * PDR 8.5 rule 6: while the person asking is in crisis, the comparison does
 * not run at all.
 *
 * The check sits in front of all three screens rather than in front of the
 * model call, because the feature being unavailable is the point — reaching
 * the consent screen and then being refused at the last step would be worse
 * than not offering it.
 */
/**
 * Rule 6 for the browser: whether to offer the comparison at all. The server
 * applies the same rule from the stored answers before spending anything;
 * this only keeps the person from being offered what would be refused.
 */
export function comparisonWithheld(profile: ActiveProfile | null | undefined): boolean {
  if (!profile) return false;
  return isComparisonWithheld({
    clinicalBasics: profile.draft.clinical_basics,
    recentCrisisWithin30Days: hadCrisisWithin30Days(),
  });
}

export function ComparisonGate({ children }: { children: ReactNode }) {
  const crisisId = useActiveCrisisId();
  const profile = activeProfile();

  if (crisisId) {
    return <CrisisScreen country={profile?.draft.country} onNotMyCase={() => markFalsePositive(crisisId)} />;
  }

  if (!profile || !currentSynthesis()) {
    return <Notice text={copy.comparison.gate.noMap} to="/onboarding" cta={copy.comparison.gate.start} />;
  }

  if (comparisonWithheld(profile)) {
    return <Notice text={copy.comparison.gate.withheld} to={PATHS.today} cta={copy.comparison.gate.back} />;
  }

  return <>{children}</>;
}

/** Why the comparison is not on offer, on the screen's own photo (package 15). */
function Notice({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <Screen photo="bote" veil={0.38} glassAlpha={0.39}>
      <div className="pz comparar aviso mar">
        <div className="sc">
          <div className="d-izq">
            <p className="k">{copy.comparison.home.kicker}</p>
            <div className="vid bloque-c">
              <p className="cuerpo">{text}</p>
            </div>
            <Link to={to} className="btn s sola">
              {cta}
            </Link>
          </div>
        </div>
      </div>
    </Screen>
  );
}
