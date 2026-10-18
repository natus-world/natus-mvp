import { googleSignInEnabled } from '@/supabase/client.ts';
import { isSignedIn } from '@/store/account';
import { requireAccount } from '@/store/account-required';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { track } from '@/store/funnel';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { CrisisBanner } from '@/components/CrisisBanner';
import { StepContext, type StepPlace } from '@/components/onboarding/StepChrome';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { detectCrisis } from '@/lib/safety';
import { computeNumerology, NumerologyInputError } from '@/lib/numerology';
import type { AiError } from '@/ai/client';
import {
  getOrCreateSession,
  setStep,
  updateDraft,
  type OnboardingDraft,
} from '@/store/session';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { copy } from '@/i18n';
import { BasicData } from './BasicData';
import { PresentingNeed } from './PresentingNeed';
import { Openness } from './Openness';
import { Generating, GeneratingFailed } from './Generating';

/**
 * The three steps of O-06 and the generation that follows them. The landing
 * comes before and the Soul Map after; the clinical questions are no longer
 * here — they are «Para cuidarte», between the map and Caminos.
 *
 * Layer 1 safety runs on leaving the step where the person writes, which is
 * before generation, where PDR 6.5 puts it in the pipeline. A high-severity
 * signal replaces the flow with the crisis screen and nothing is generated; a
 * low-severity one adds a persistent banner and lets the person continue.
 * Layer 2 — the model itself answering with a crisis — lands on the same
 * screen, with the lines the server attached.
 */

const STEPS = ['quien', 'pregunta', 'apertura', 'generando'] as const;
type StepName = (typeof STEPS)[number];

/**
 * Package 01 (16 Oct 2026): one photo per step, with its veil and its glass,
 * and a class for what differs between them.
 */
const LOOKS = {
  quien: { photo: 'concretoSombra', veil: 0.4, alpha: 0.7 },
  pregunta: { photo: 'maderaOscura', veil: 0.3, alpha: 0.3 },
  apertura: { photo: 'surcosArena', veil: 0.46, alpha: 0.3 },
} as const;

type Crisis = { eventId: string; message: string; layer: 'text' | 'model' };

export function Onboarding() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getOrCreateSession());
  const [index, setIndex] = useState(0);
  const [crisis, setCrisis] = useState<Crisis | null>(null);
  const [lowSeverity, setLowSeverity] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Remounts Generating so a retry actually re-runs. PDR 6.5: the input is
  // never lost, so retrying costs the person nothing but the wait.
  const [attempt, setAttempt] = useState(0);

  const draft = session.draft;
  const step: StepName = STEPS[index] ?? 'quien';

  const change = useCallback((patch: Partial<OnboardingDraft>) => {
    setSession(updateDraft(patch));
  }, []);

  const advance = useCallback(() => {
    // The updater has to stay pure. Persisting from inside it meant the write
    // ran twice under StrictMode's double-invoke, and React was free to
    // discard the result — the screen simply stopped advancing.
    const next = Math.min(index + 1, STEPS.length - 1);
    setIndex(next);
    setSession(setStep(next));
  }, [index]);

  // The funnel's first step. Recorded once per person by the database.
  useEffect(() => {
    track('onboarding_started');
  }, []);

  const runSafety = useCallback((): boolean => {
    const verdict = detectCrisis({ texts: [draft.presenting_need_text] });
    if (!verdict.crisis) return true;

    const event = recordCrisisEvent(verdict, 'onboarding');
    if (verdict.severity === 'high') {
      setCrisis({ eventId: event.id, message: copy.onboarding.crisis.fromText, layer: 'text' });
      return false;
    }
    setLowSeverity(true);
    return true;
  }, [draft.presenting_need_text]);

  const onModelCrisis = useCallback((error: AiError) => {
    const event = recordCrisisEvent(
      {
        severity: error.crisis?.severity ?? 'high',
        category: error.crisis?.category ?? 'indirecto',
        layer: 'deterministic',
        matched: [],
        excerpt: '',
      },
      'onboarding',
    );
    setCrisis({
      eventId: event.id,
      message: error.crisisResponse ?? copy.onboarding.crisis.fromText,
      layer: 'model',
    });
  }, []);

  // Google before the map (owner, 16 Oct 2026), once the project has it on.
  const [googleOn, setGoogleOn] = useState(false);
  useEffect(() => {
    let live = true;
    void googleSignInEnabled().then((on) => {
      if (live) setGoogleOn(on);
    });
    return () => {
      live = false;
    };
  }, []);

  const onDone = useCallback(() => {
    if (googleOn && !isSignedIn()) {
      requireAccount();
      navigate('/registro');
      return;
    }
    navigate('/carta');
  }, [navigate, googleOn]);

  const numerologyPreview = useMemo(() => {
    if (!draft.legal_birth_name || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birth_date)) return null;
    try {
      return computeNumerology({
        legalBirthName: draft.legal_birth_name,
        birthDate: draft.birth_date,
      });
    } catch (error) {
      // A name with no Latin letters. The flow continues without numbers
      // rather than blocking on a rule the person cannot satisfy.
      if (error instanceof NumerologyInputError) return null;
      throw error;
    }
  }, [draft.legal_birth_name, draft.birth_date]);

  if (crisis) {
    return (
      <CrisisScreen
        country={draft.country}
        message={crisis.message}
        onNotMyCase={() => {
          markFalsePositive(crisis.eventId);
          setCrisis(null);
          if (crisis.layer === 'model') setAttempt((a) => a + 1);
          else advance();
        }}
        onBack={() => {
          setCrisis(null);
          setIndex(STEPS.indexOf('pregunta'));
        }}
      />
    );
  }

  if (step === 'generando') {
    if (failure) {
      return (
        <GeneratingFailed
          message={failure}
          onRetry={() => {
            setFailure(null);
            setAttempt((n) => n + 1);
          }}
        />
      );
    }

    return (
      <Generating
        key={attempt}
        draft={draft}
        numerology={numerologyPreview}
        onDone={onDone}
        onFailed={setFailure}
        onCrisis={onModelCrisis}
      />
    );
  }

  const look = LOOKS[step];
  const place: StepPlace = { step: index + 1, total: STEPS.length - 1, onGoTo: setIndex };

  return (
    <Screen photo={look.photo} veil={look.veil} glassAlpha={look.alpha}>
      <div className={`pz entrada paso ${step}`}>
        {lowSeverity && (
          <div className="aviso-crisis">
            <CrisisBanner country={draft.country} />
          </div>
        )}
        <StepContext.Provider value={place}>
          {step === 'quien' && (
            <BasicData
              draft={draft}
              onChange={change}
              onNext={() => {
                track('birth_data_done');
                advance();
              }}
            />
          )}
          {step === 'pregunta' && (
            <PresentingNeed
              draft={draft}
              onChange={change}
              onNext={() => {
                if (!runSafety()) return;
                track('need_done');
                advance();
              }}
            />
          )}
          {step === 'apertura' && (
            <Openness
              draft={draft}
              onChange={change}
              onNext={() => {
                track('openness_done');
                advance();
              }}
            />
          )}
        </StepContext.Provider>
      </div>
    </Screen>
  );
}
