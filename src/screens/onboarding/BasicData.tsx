import type { MouseEvent } from 'react';
import { NextButton, StepBody } from '@/components/onboarding/StepChrome';
import { BIRTH_COUNTRIES } from '@/components/birth-countries';
import { BirthPlaceField } from '@/components/onboarding/BirthPlaceField';
import { BirthIcon, GlobeIcon, PinIcon, YouIcon } from '@/components/onboarding/icons';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';
import { hasBirthTime, hasNatalChartInput } from '@/astrology/natal-chart';
import { isAdultOn, latestAdultBirthDate } from '@/lib/age';

const text = copy.onboarding.basicData;

/** The package draws the date and the hour as text: the picker opens on touch. */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Not every browser lets a page open it; the field still takes typing.
  }
}

/**
 * Step 01, «¿Quién eres?» (package 01, 16 Oct 2026): one glass card of rows,
 * each with its icon, what was written and, under it, what the row is for.
 * The rules are the ones it always had: the birth country first and the city
 * picked from it, adults only, the home country chosen, the hour optional.
 */
export function BasicData({
  draft,
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onNext: () => void;
}) {
  // Without the hour, and only when there is enough to calculate a chart at
  // all, the person decides whether to calculate it. Nothing is preselected.
  const askWithoutTime = !hasBirthTime(draft) && hasNatalChartInput(draft);
  // A city typed but not picked from the list would be guessed at; the chart
  // is cast only for a place the person chose (16 Oct 2026).
  const placeUnpicked = draft.birth_city.trim() !== '' && !draft.birth_place;
  // Adults only, and no date to come (owner, 16 Oct 2026).
  const today = new Date();
  const dateGiven = /^\d{4}-\d{2}-\d{2}$/.test(draft.birth_date);
  const underage = dateGiven && !isAdultOn(draft.birth_date, today);
  const nameGiven = draft.legal_birth_name.trim().length > 1;
  const timeDecided = !askWithoutTime || draft.chart_without_time !== undefined;
  const canContinue = !placeUnpicked && !underage && draft.country !== '' && nameGiven && dateGiven && timeDecided;

  // The package: «El botón queda fijo abajo; si falta algo, dice qué.»
  const missing = !nameGiven
    ? text.missing.name
    : !dateGiven
      ? text.missing.date
      : underage
        ? null
        : draft.country === ''
          ? text.missing.country
          : placeUnpicked
            ? text.missing.place
            : !timeDecided
              ? text.missing.withoutTime
              : null;

  return (
    <StepBody
      title={
        <>
          {text.titleLead}
          <em>{text.titleEmphasis}</em>
          {text.titleTail}
        </>
      }
      helper={text.helper}
      action={<NextButton disabled={!canContinue} onClick={onNext} />}
      missing={canContinue ? null : missing}
    >
      <div className="vid bq">
        <div className="campo">
          <YouIcon />
          <div>
            <input
              id="legal-name"
              className="v"
              value={draft.legal_birth_name}
              onChange={(e) => onChange({ legal_birth_name: e.target.value, natal_chart: null })}
              placeholder={text.namePlaceholder}
              autoComplete="name"
              spellCheck={false}
              aria-label={text.nameLabel}
              aria-describedby="legal-name-helper"
            />
            <p id="legal-name-helper" className="l">
              {text.nameHelper}
            </p>
          </div>
        </div>

        <div className="campo">
          <BirthIcon />
          <div>
            <div className="fecha">
              <input
                id="birth-date"
                onClick={openPicker}
                type="date"
                max={latestAdultBirthDate(today)}
                aria-label={text.birthDateLabel}
                aria-describedby="birth-date-helper"
                className={dateGiven ? 'v' : 'v ph'}
                value={draft.birth_date}
                onChange={(e) => onChange({ birth_date: e.target.value, natal_chart: null })}
              />
              <span aria-hidden="true">·</span>
              <input
                id="birth-time"
                onClick={openPicker}
                type="time"
                aria-label={text.birthTimeLabel}
                className={draft.birth_time ? 'v' : 'v ph'}
                value={draft.birth_time}
                onChange={(e) => onChange({ birth_time: e.target.value, natal_chart: null })}
              />
            </div>
            {underage ? (
              <p id="birth-date-helper" role="alert" className="l error">
                {text.underage}
              </p>
            ) : (
              <p id="birth-date-helper" className="l">
                {text.birthDateTimeLabel}
              </p>
            )}
          </div>
        </div>

        <div className="campo">
          <GlobeIcon />
          <div>
            <select
              id="birth-country"
              className={draft.birth_country ? 'v' : 'v ph'}
              value={draft.birth_country}
              aria-label={text.birthCountryLabel}
              // Another country is another search: the city picked goes with it.
              onChange={(e) =>
                onChange({ birth_country: e.target.value, birth_city: '', birth_place: null, natal_chart: null })
              }
            >
              {BIRTH_COUNTRIES.map(([code, name]) => (
                <option key={code || 'empty'} value={code}>
                  {code ? name : text.birthCountryPlaceholder}
                </option>
              ))}
            </select>
            <p className="l">{text.birthCountryLabel}</p>
            <BirthPlaceField
              city={draft.birth_city}
              country={draft.birth_country}
              place={draft.birth_place ?? null}
              fieldClass="v"
              helperClass="l"
              onChange={(birth_city, birth_place) => onChange({ birth_city, birth_place, natal_chart: null })}
            />
          </div>
        </div>

        <div className="campo">
          <PinIcon />
          <div>
            <select
              id="country"
              className={draft.country ? 'v' : 'v ph'}
              value={draft.country}
              onChange={(e) => onChange({ country: e.target.value })}
              aria-label={text.countryLabel}
              aria-describedby="country-helper"
            >
              <option value="" disabled>
                {text.countryLabel}
              </option>
              {text.countries.map(([code, name]) => (
                <option key={code} value={code}>
                  {code === 'XX' ? text.livesElsewhere : `${text.livesIn}${name}`}
                </option>
              ))}
            </select>
            <p id="country-helper" className="l">
              {text.countryHelper}
            </p>
          </div>
        </div>

        <div className="campo solo">
          <p className="v" id="gender-label">
            {text.genderLabel}
          </p>
          <div className="chips" role="radiogroup" aria-labelledby="gender-label">
            {text.genderOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.grammatical_gender === value}
                onClick={() => onChange({ grammatical_gender: value })}
                className={draft.grammatical_gender === value ? 'chip on' : 'chip'}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="l">{text.genderExample}</p>
        </div>

        {askWithoutTime && (
          <div className="campo solo">
            <p className="v" id="without-time-label">
              {text.withoutTimeLabel}
            </p>
            <div className="chips" role="radiogroup" aria-labelledby="without-time-label">
              {text.withoutTimeOptions.map(([value, label]) => {
                const checked = draft.chart_without_time === (value === 'yes');
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => onChange({ chart_without_time: value === 'yes', natal_chart: null })}
                    className={checked ? 'chip on' : 'chip'}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="aviso">{text.notice}</p>
    </StepBody>
  );
}
