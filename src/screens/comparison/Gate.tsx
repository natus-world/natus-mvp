import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
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
    return (
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex flex-col justify-center gap-6 px-6 text-center flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {copy.comparison.gate.noMap}
          </p>
          <Link to="/onboarding" className="cta no-underline">
            {copy.comparison.gate.start}
          </Link>
        </div>
      </Screen>
    );
  }

  if (comparisonWithheld(profile)) {
    return (
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex flex-col justify-center gap-6 px-6 text-center flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">
            {copy.comparison.gate.withheld}
          </p>
          <Link to={PATHS.today} className="cta no-underline">
            {copy.comparison.gate.back}
          </Link>
        </div>
      </Screen>
    );
  }

  return <>{children}</>;
}
