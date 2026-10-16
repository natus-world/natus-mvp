import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { computeNumerology } from '@/lib/numerology';
import type { AiError } from '@/ai/client';
import { BasicData } from '@/screens/onboarding/BasicData';
import { Generating } from '@/screens/onboarding/Generating';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile, updateActiveProfile } from '@/store/account';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { PATHS } from '@/components/routes';
import type { OnboardingDraft } from '@/store/session';

/**
 * v1.2 M-02 (owner, 16 Oct 2026): the person changes their birth data from
 * the profile. The chart and the numbers are calculated again, the Soul Map
 * is written again with Opus (`base_data_changed`), and — because the why of
 * every therapy cites the chart — Caminos chooses the therapies again, and the
 * routine follows them. The previous map stays readable in Carta.
 *
 * The same «¿Quién eres?» step as the onboarding, so the fields and their
 * rules are one thing. A change that does not touch the birth data (the
 * country, the address) is saved without writing anything again.
 */

const t = copy.profile.birth;

const BIRTH_FIELDS = ['legal_birth_name', 'birth_date', 'birth_time', 'birth_city', 'birth_country', 'chart_without_time'] as const;

function birthChanged(before: OnboardingDraft, after: OnboardingDraft): boolean {
  return BIRTH_FIELDS.some((field) => (before[field] ?? '') !== (after[field] ?? ''));
}

export function BirthDataEdit() {
  const navigate = useNavigate();
  const original = activeProfile()?.draft;
  const [draft, setDraft] = useState<OnboardingDraft | undefined>(original);
  const [step, setStep] = useState<'form' | 'confirm' | 'generating'>('form');
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [crisisId, setCrisisId] = useState<string | null>(null);

  const numerology = useMemo(() => {
    if (!draft?.legal_birth_name || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birth_date)) return null;
    try {
      return computeNumerology({ legalBirthName: draft.legal_birth_name, birthDate: draft.birth_date });
    } catch {
      return null;
    }
  }, [draft?.legal_birth_name, draft?.birth_date]);

  const onDone = useCallback(() => navigate(PATHS.chart), [navigate]);
  const onCrisis = useCallback((error: AiError) => {
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
    setCrisisId(event.id);
  }, []);

  if (!original || !draft) return <Navigate to={PATHS.profile} replace />;

  if (crisisId) {
    return (
      <CrisisScreen
        country={draft.country}
        onNotMyCase={() => {
          markFalsePositive(crisisId);
          setCrisisId(null);
          navigate(PATHS.profile);
        }}
        onBack={() => navigate(PATHS.profile)}
      />
    );
  }

  if (step === 'generating') {
    if (failure) {
      return (
        <Screen backdrop="sala" scrim="diagonal" opacity={PHOTO.veil60}>
          <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8 text-center sm:min-h-0 sm:flex-1">
            <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/75">{failure}</p>
            <button
              type="button"
              className="cta"
              onClick={() => {
                setFailure(null);
                setAttempt((a) => a + 1);
              }}
            >
              {copy.onboarding.generating.retry}
            </button>
          </div>
        </Screen>
      );
    }
    return (
      <Generating
        key={attempt}
        draft={draft}
        numerology={numerology}
        trigger="base_data_changed"
        onDone={onDone}
        onFailed={setFailure}
        onCrisis={onCrisis}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <Screen backdrop="sala" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 sm:min-h-0 sm:flex-1">
          <p className="eyebrow">{t.kicker}</p>
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/80">{t.confirm}</p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              className="cta"
              onClick={() => {
                // The chart is calculated again from the new data.
                updateActiveProfile({ ...draft, natal_chart: null });
                setDraft({ ...draft, natal_chart: null });
                setStep('generating');
              }}
            >
              {t.save}
            </button>
            <button type="button" className="chip chip-p10 text-crema/60" onClick={() => setStep('form')}>
              {copy.common.back}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen backdrop="sala" scrim="even" opacity={PHOTO.veil55}>
      <div className="flex min-h-dvh flex-col px-[22px] pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0 sm:h-full">
        <p className="eyebrow mb-4">{t.kicker}</p>
        <BasicData
          draft={draft}
          onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          onNext={() => {
            if (birthChanged(original, draft)) {
              setStep('confirm');
            } else {
              updateActiveProfile(draft);
              navigate(PATHS.profile);
            }
          }}
        />
      </div>
    </Screen>
  );
}
