import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { useActiveCrisisId } from '@/components/takeover';
import { activeProfile } from '@/store/account';
import { CARE_PATH, needsCare, type CareDestination } from '@/store/care';
import { markFalsePositive } from '@/store/crisis';
import { copy } from '@/i18n';

export function RequireCare({
  next,
  blockOnCrisis = false,
  children,
}: {
  next: CareDestination;
  blockOnCrisis?: boolean;
  children: ReactNode;
}) {
  const crisisId = useActiveCrisisId();

  if (needsCare()) return <Navigate to={CARE_PATH} replace state={{ next }} />;

  if (blockOnCrisis && crisisId) {
    return (
      <CrisisScreen
        country={activeProfile()?.draft.country}
        message={copy.onboarding.crisis.general}
        onNotMyCase={() => markFalsePositive(crisisId)}
      />
    );
  }

  return children;
}
