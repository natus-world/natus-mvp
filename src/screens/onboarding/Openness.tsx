import { useState } from 'react';
import { NextButton, StepBody, emphasizeLast } from '@/components/onboarding/StepChrome';
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

  // Package 01: five options in one glass card, «Me da lo mismo» in its own
  // (it clears the others), and «Otro» to write.
  return (
    <StepBody
      title={emphasizeLast(opennessFile.prompt_es)}
      helper={opennessFile.helper_es}
      action={<NextButton disabled={!canContinue} onClick={onNext} />}
    >
      <div className="vid bq">
        {opennessFile.options.map((option) => (
          <OptionItem
            key={option.slug}
            label={option.label_es}
            hint={option.hint_es}
            selected={families.includes(option.slug)}
            onToggle={() => toggle(option.slug)}
          />
        ))}
      </div>

      <div className="vid sigue">
        {opennessFile.special.map((option) => (
          <OptionItem
            key={option.slug}
            label={option.label_es}
            hint={option.hint_es}
            selected={families.includes(option.slug)}
            onToggle={() => toggle(option.slug)}
          />
        ))}
      </div>

      <div className="vid campo solo sigue">
        <label className="sr-only" htmlFor="openness-other">
          {copy.onboarding.openness.otherLabel}
        </label>
        <input
          id="openness-other"
          className="v"
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
