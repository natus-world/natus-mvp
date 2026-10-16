import { NextButton, StepBody, emphasizeLast } from '@/components/onboarding/StepChrome';
import { OptionItem } from '@/components/onboarding/OptionItem';
import { presentingNeedsFile, PRESENTING_NEEDS } from '@/lib/catalog';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';

/**
 * PDR 1.1, the non-negotiable one: "¿Qué te estás preguntando últimamente?",
 * never "¿qué problema venís a resolver?". The person is the protagonist, not
 * a patient, and the copy must never invite them to diagnose themselves.
 *
 * The mockup offered "Superar la depresión" and "Reducir ansiedad" here. Both
 * are exactly what the principle forbids, and a test in catalog.test.ts now
 * rejects any shortcut that names a condition.
 */
export function PresentingNeed({
  draft,
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onNext: () => void;
}) {
  const toggle = (slug: string) => {
    const selected = draft.presenting_need_slugs.includes(slug);
    onChange({
      presenting_need_slugs: selected
        ? draft.presenting_need_slugs.filter((s) => s !== slug)
        : [...draft.presenting_need_slugs, slug],
    });
  };

  const canContinue =
    draft.presenting_need_text.trim().length > 2 || draft.presenting_need_slugs.length > 0;

  // Package 01: free text that grows with what is written, and eight
  // shortcuts in one glass card. Either, or both.
  return (
    <StepBody
      title={emphasizeLast(presentingNeedsFile.prompt_es)}
      helper={presentingNeedsFile.helper_es}
      action={<NextButton disabled={!canContinue} onClick={onNext} />}
    >
      <textarea
        id="presenting-need"
        aria-label={presentingNeedsFile.prompt_es}
        rows={3}
        className="vid area bq"
        placeholder={copy.onboarding.presentingNeed.placeholder}
        value={draft.presenting_need_text}
        onChange={(e) => onChange({ presenting_need_text: e.target.value })}
      />

      <div className="vid lista">
        {PRESENTING_NEEDS.map((need) => (
          <OptionItem
            key={need.slug}
            label={need.label_es}
            selected={draft.presenting_need_slugs.includes(need.slug)}
            onToggle={() => toggle(need.slug)}
          />
        ))}
      </div>
    </StepBody>
  );
}
