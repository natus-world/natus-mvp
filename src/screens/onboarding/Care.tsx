import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { Paywall } from '@/components/Paywall';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import {
  careDestination,
  completeCare,
  hasAnsweredCare,
  needsOpenness,
  saveOpenness,
} from '@/store/care';
import { legacyTarget } from '@/components/routes';
import { markFalsePositive } from '@/store/crisis';
import { writesSettled } from '@/store/hydrate';
import { takeWelcomeOfferDue } from '@/store/revelation';
import type { ClinicalBasics as Answers } from '@/lib/safety';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';
import { ClinicalBasics } from './ClinicalBasics';
import { Openness } from './Openness';
import { track } from '@/store/funnel';

/**
 * On the way to Caminos (reordered by the owner, 20–21 Oct 2026): «Cómo
 * trabajar» first, for whoever has not answered it, under «Antes de tus
 * caminos»; then the four questions of «Para cuidarte»; then, once, Premium's
 * welcome offer for whoever came from the preview of a new map — never after
 * a crisis signal, the server deciding as well (`offer_premium`).
 */
export function Care() {
  const navigate = useNavigate();
  const location = useLocation();
  const requested = (location.state as { next?: unknown } | null)?.next;
  const next = careDestination(legacyTarget(requested) ?? requested);
  const [profile] = useState(() => activeProfile());
  const [alreadyAnswered] = useState(() => hasAnsweredCare(profile?.draft.clinical_basics));
  const [askOpenness, setAskOpenness] = useState(() => needsOpenness(profile?.draft.openness_to_modalities));
  const [openness, setOpenness] = useState<OnboardingDraft | null>(() => profile?.draft ?? null);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(() => profile?.draft.clinical_basics ?? {});
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState(false);
  const toNext = useCallback(() => navigate(next, { replace: true }), [navigate, next]);

  if (!profile || !currentSynthesis()) return <Navigate to="/carta" replace />;
  if (alreadyAnswered && !offer) return <Navigate to={next} replace />;

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={profile.draft.country}
        message={copy.onboarding.crisis.fromAnswer}
        onBack={() => setCrisisEventId(null)}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          // The offer is owed no more: this session saw a crisis screen.
          takeWelcomeOfferDue();
          navigate(next, { replace: true });
        }}
      />
    );
  }

  // «Cómo trabajar»: the dunes (owner, 21 Oct 2026), in place of the package's
  // furrows in the sand.
  if (askOpenness && openness) {
    return (
      <Screen photo="dunas" veil={0.55} glassAlpha={0.3}>
        <div className="pz entrada paso apertura">
          <Openness
            kicker={copy.onboarding.openness.beforePaths}
            draft={openness}
            onChange={(patch) => setOpenness({ ...openness, ...patch })}
            onNext={() => {
              saveOpenness(openness.openness_to_modalities);
              track('openness_done');
              setAskOpenness(false);
            }}
          />
        </div>
      </Screen>
    );
  }

  const submit = async (submitted: Answers) => {
    setAnswers(submitted);
    // That it was answered, never what: recorded the same whatever comes next.
    track('care_done');
    const outcome = completeCare(submitted);
    if (outcome.next === 'crisis') {
      takeWelcomeOfferDue();
      setCrisisEventId(outcome.eventId);
      return;
    }
    setBusy(true);
    await writesSettled();
    // Read and cleared either way: it is owed once.
    const due = takeWelcomeOfferDue();
    // Nothing commercial after a crisis signal: a recorded alert, or frequent
    // thoughts of self-harm, though they do not stop the flow (proposed).
    if (due && !outcome.alerted && submitted.ideation_6m !== 'frecuentes') {
      setOffer(true);
      return;
    }
    navigate(next, { replace: true });
  };

  // Package 01, «Para cuidarte»: the candle, with no veil.
  return (
    <Screen photo="vela" veil={0} glassAlpha={0.32}>
      <div className="pz entrada cuidarte">
        <ClinicalBasics
          initial={answers}
          busy={busy}
          actionLabel={next === '/caminos' ? copy.onboarding.care.toPaths : copy.common.continue}
          onSubmit={(a) => void submit(a)}
        />
      </div>
      {/* Premium's welcome offer, after «Para cuidarte» (owner, 20 Oct 2026). It
          asks the server first and goes on by itself when there is nothing to offer. */}
      {offer && <Paywall feature="welcome" onDismiss={toNext} />}
    </Screen>
  );
}
