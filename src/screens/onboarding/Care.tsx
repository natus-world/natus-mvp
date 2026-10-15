import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { careDestination, completeCare, hasAnsweredCare } from '@/store/care';
import { legacyTarget } from '@/components/routes';
import { markFalsePositive } from '@/store/crisis';
import { writesSettled } from '@/store/hydrate';
import type { ClinicalBasics as Answers } from '@/lib/safety';
import { copy } from '@/i18n';
import { ClinicalBasics } from './ClinicalBasics';

export function Care() {
  const navigate = useNavigate();
  const location = useLocation();
  const requested = (location.state as { next?: unknown } | null)?.next;
  const next = careDestination(legacyTarget(requested) ?? requested);
  const [profile] = useState(() => activeProfile());
  const [alreadyAnswered] = useState(() => hasAnsweredCare(profile?.draft.clinical_basics));
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(() => profile?.draft.clinical_basics ?? {});
  const [busy, setBusy] = useState(false);

  if (!profile || !currentSynthesis()) return <Navigate to="/carta" replace />;
  if (alreadyAnswered) return <Navigate to={next} replace />;

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={profile.draft.country}
        message={copy.onboarding.crisis.fromAnswer}
        onBack={() => setCrisisEventId(null)}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          navigate(next, { replace: true });
        }}
      />
    );
  }

  const submit = async (submitted: Answers) => {
    setAnswers(submitted);
    const outcome = completeCare(submitted);
    if (outcome.next === 'crisis') {
      setCrisisEventId(outcome.eventId);
      return;
    }
    setBusy(true);
    await writesSettled();
    navigate(next, { replace: true });
  };

  return (
    <Screen backdrop="ella" scrim="even" opacity={PHOTO.veil55}>
      <div className="flex min-h-dvh flex-col px-[22px] pt-[var(--top-inset)] pb-8 sm:min-h-0 sm:h-full">
        <p className="eyebrow mb-5">{copy.onboarding.care.kicker}</p>
        <ClinicalBasics initial={answers} busy={busy} onSubmit={(a) => void submit(a)} />
      </div>
    </Screen>
  );
}
