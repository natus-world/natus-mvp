import { StepBody } from '@/components/onboarding/StepChrome';
import { BIRTH_COUNTRIES } from '@/components/birth-countries';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';

const text = copy.onboarding.basicData;

const fieldClass =
  'field w-full text-[length:var(--fs-body-14)] leading-5 placeholder:text-crema/55 [color-scheme:dark]';

const labelClass = 'mb-1.5 block text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase';

const helperClass = 'mt-1.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55';

export function BasicData({
  draft,
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onNext: () => void;
}) {
  const canContinue =
    draft.legal_birth_name.trim().length > 1 && /^\d{4}-\d{2}-\d{2}$/.test(draft.birth_date);

  return (
    <StepBody
      title={
        <>
          {text.titleLead}
          <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
          {text.titleTail}
        </>
      }
      helper={text.helper}
      action={
        <button type="button" className="cta" disabled={!canContinue} onClick={onNext}>
          {copy.common.continue}
          <span aria-hidden="true">→</span>
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="legal-name">
            {text.nameLabel}
          </label>
          <input
            id="legal-name"
            className={fieldClass}
            value={draft.legal_birth_name}
            onChange={(e) => onChange({ legal_birth_name: e.target.value, natal_chart: null })}
            placeholder={text.namePlaceholder}
            autoComplete="name"
            aria-describedby="legal-name-helper"
          />
          <p id="legal-name-helper" className={helperClass}>
            {text.nameHelper}
          </p>
        </div>

        <div className="grid grid-cols-[3fr_2fr] gap-3">
          <div>
            <label className={labelClass} htmlFor="birth-date">
              {text.birthDateLabel}
            </label>
            <input
              id="birth-date"
              type="date"
              className={fieldClass}
              value={draft.birth_date}
              onChange={(e) => onChange({ birth_date: e.target.value, natal_chart: null })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="birth-time">
              {text.birthTimeLabel}
            </label>
            <input
              id="birth-time"
              type="time"
              className={fieldClass}
              value={draft.birth_time}
              onChange={(e) => onChange({ birth_time: e.target.value, natal_chart: null })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="birth-city">
            {text.birthCityLabel}
          </label>
          <input
            id="birth-city"
            className={fieldClass}
            value={draft.birth_city}
            onChange={(e) => onChange({ birth_city: e.target.value, natal_chart: null })}
            placeholder={text.birthCityPlaceholder}
          />
        </div>

        {draft.birth_city.trim() !== '' && (
          <div>
            <label className={labelClass} htmlFor="birth-country">
              {text.birthCountryLabel}
            </label>
            <select
              id="birth-country"
              className={fieldClass}
              value={draft.birth_country}
              onChange={(e) => onChange({ birth_country: e.target.value, natal_chart: null })}
              aria-describedby="birth-country-helper"
            >
              {BIRTH_COUNTRIES.map(([code, name]) => (
                <option key={code || 'empty'} value={code} className="bg-negro">
                  {code ? name : text.birthCountryPlaceholder}
                </option>
              ))}
            </select>
            <p id="birth-country-helper" className={helperClass}>
              {text.birthCountryHelper}
            </p>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="country">
            {text.countryLabel}
          </label>
          <select
            id="country"
            className={fieldClass}
            value={draft.country}
            onChange={(e) => onChange({ country: e.target.value })}
            aria-describedby="country-helper"
          >
            {text.countries.map(([code, name]) => (
              <option key={code} value={code} className="bg-negro">
                {name}
              </option>
            ))}
          </select>
          <p id="country-helper" className={helperClass}>
            {text.countryHelper}
          </p>
        </div>

        <fieldset className="border-0 p-0">
          <legend className={labelClass}>{text.genderLabel}</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={text.genderLabel}>
            {text.genderOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.grammatical_gender === value}
                onClick={() => onChange({ grammatical_gender: value })}
                className={[
                  'chip chip-p10 text-center text-[length:var(--fs-body-13)]',
                  draft.grammatical_gender === value ? 'border-tierra/50 bg-verde/60 text-crema' : 'text-blanco/85',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">{text.notice}</p>
      </div>
    </StepBody>
  );
}
