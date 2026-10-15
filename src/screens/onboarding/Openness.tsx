import { useState } from 'react';
import { StepBody } from '@/components/onboarding/StepChrome';
import { OptionItem } from '@/components/onboarding/OptionItem';
import { expandOpenness, opennessFile, opennessOptionsFor } from '@/lib/catalog';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';

/**
 * PDR 5.2 stores `openness_to_modalities` as modality slugs and PDR 7.2
 * filters on them. Twenty-one checkboxes would be an unusable screen, so the
 * five family-level choices from `data/openness-options.json` are expanded to
 * slugs before the draft is written. The stored contract is untouched.
 */
export function Openness({
  draft,
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onNext: () => void;
}) {
  // Family selection is screen state; the draft holds the expansion.
  const [families, setFamilies] = useState<string[]>(() =>
    opennessOptionsFor(draft.openness_to_modalities),
  );
  const [other, setOther] = useState('');

  const apply = (next: string[], freeText = other) => {
    setFamilies(next);
    const withFreeText =
      freeText.trim().length > 0 ? [...next, `${opennessFile.free_text_prefix} ${freeText.trim()}`] : next;
    onChange({ openness_to_modalities: expandOpenness(withFreeText) });
  };

  const toggle = (slug: string) => {
    if (slug === 'me_da_lo_mismo') {
      apply(families.includes(slug) ? [] : ['me_da_lo_mismo']);
      return;
    }
    const withoutAny = families.filter((f) => f !== 'me_da_lo_mismo');
    apply(
      withoutAny.includes(slug) ? withoutAny.filter((f) => f !== slug) : [...withoutAny, slug],
    );
  };

  const canContinue = draft.openness_to_modalities.length > 0;

  return (
    <StepBody
      title={opennessFile.prompt_es}
      helper={opennessFile.helper_es}
      action={
        <button type="button" className="cta" disabled={!canContinue} onClick={onNext}>
          {copy.common.continue}
          <span aria-hidden="true">→</span>
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {opennessFile.options.map((option) => (
          <OptionItem
            key={option.slug}
            label={option.label_es}
            hint={option.hint_es}
            selected={families.includes(option.slug)}
            onToggle={() => toggle(option.slug)}
          />
        ))}

        <div className="mt-1 mb-1 h-px bg-crema/10" />

        {opennessFile.special.map((option) => (
          <OptionItem
            key={option.slug}
            label={option.label_es}
            hint={option.hint_es}
            selected={families.includes(option.slug)}
            onToggle={() => toggle(option.slug)}
          />
        ))}

        <label className="sr-only" htmlFor="openness-other">
          {copy.onboarding.openness.otherLabel}
        </label>
        <input
          id="openness-other"
          className="field mt-1 w-full text-[length:var(--fs-body-13)] placeholder:text-crema/55"
          placeholder={copy.onboarding.openness.otherPlaceholder}
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            apply(families, e.target.value);
          }}
        />
      </div>
    </StepBody>
  );
}
