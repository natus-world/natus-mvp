import { useState } from 'react';
import { NextButton, StepBody } from '@/components/onboarding/StepChrome';
import { BIRTH_COUNTRIES } from '@/components/birth-countries';
import { ELSEWHERE, LIVING_COUNTRIES } from '@/components/countries';
import { BirthPlaceField } from '@/components/onboarding/BirthPlaceField';
import { BirthIcon, GlobeIcon, PinIcon, YouIcon } from '@/components/onboarding/icons';
import type { OnboardingDraft } from '@/store/session';
import { copy } from '@/i18n';
import { hasBirthTime, hasNatalChartInput } from '@/astrology/natal-chart';
import { isAdultOn, latestAdultBirthDate } from '@/lib/age';

const text = copy.onboarding.basicData;

const pad = (n: number) => String(n).padStart(2, '0');
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** «1990-03-02» → its parts; anything else → empty parts. */
function dateParts(value: string): { d: string; m: string; y: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { y: match[1]!, m: match[2]!, d: match[3]! } : { d: '', m: '', y: '' };
}

/** The date only when the three parts make a day that exists. */
function joinDate(d: string, m: string, y: string): string {
  if (!d || !m || !y) return '';
  const day = Number(d);
  const date = new Date(Number(y), Number(m) - 1, day);
  return date.getDate() === day ? `${y}-${m}-${d}` : '';
}

/**
 * The date and the hour as day · month · year · hh:mm, each a native select
 * (17 Oct 2026). The browser's own date field could not be filled from some
 * phones: drawn as bare text, as the package asks, an empty one has nothing to
 * touch on iPhone. A select is a wheel on every phone and a list on desktop.
 */
function BirthDateTime({
  date,
  time,
  latestYear,
  onDate,
  onTime,
}: {
  date: string;
  time: string;
  latestYear: number;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}) {
  const initial = dateParts(date);
  const [parts, setParts] = useState(initial);
  const set = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onDate(joinDate(next.d, next.m, next.y));
  };
  const [hh, mm] = time ? time.split(':') : ['', ''];
  const f = text.dateParts;

  return (
    <div className="fecha">
      <select
        id="birth-date"
        aria-label={f.day}
        className={parts.d ? 'v' : 'v ph'}
        value={parts.d}
        onChange={(e) => set({ d: e.target.value })}
      >
        <option value="" disabled>
          {f.dd}
        </option>
        {range(1, 31).map((n) => (
          <option key={n} value={pad(n)}>
            {n}
          </option>
        ))}
      </select>
      <span aria-hidden="true">·</span>
      <select
        aria-label={f.month}
        className={parts.m ? 'v' : 'v ph'}
        value={parts.m}
        onChange={(e) => set({ m: e.target.value })}
      >
        <option value="" disabled>
          {f.mm}
        </option>
        {f.months.map((name, i) => (
          <option key={name} value={pad(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <span aria-hidden="true">·</span>
      <select
        aria-label={f.year}
        className={parts.y ? 'v' : 'v ph'}
        value={parts.y}
        onChange={(e) => set({ y: e.target.value })}
      >
        <option value="" disabled>
          {f.yyyy}
        </option>
        {range(1900, latestYear)
          .reverse()
          .map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
      </select>
      <span aria-hidden="true">·</span>
      <select
        id="birth-time"
        aria-label={f.hour}
        className={hh ? 'v' : 'v ph'}
        value={hh}
        onChange={(e) => onTime(e.target.value ? `${e.target.value}:${mm || '00'}` : '')}
      >
        <option value="">{f.hh}</option>
        {range(0, 23).map((n) => (
          <option key={n} value={pad(n)}>
            {pad(n)}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label={f.minute}
        className={hh ? 'v' : 'v ph'}
        value={hh ? mm : ''}
        disabled={!hh}
        onChange={(e) => onTime(`${hh}:${e.target.value}`)}
      >
        <option value="" disabled>
          {f.min}
        </option>
        {range(0, 59).map((n) => (
          <option key={n} value={pad(n)}>
            {pad(n)}
          </option>
        ))}
      </select>
    </div>
  );
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
  // Not knowing the hour is said, with «No sé mi hora» under the date (owner,
  // 22 Oct 2026): a blank hour is no longer read as not knowing it. Then, and
  // only when there is enough to calculate a chart at all, the person decides
  // there whether to calculate it. Nothing is preselected.
  const [noHour, setNoHour] = useState(() => !hasBirthTime(draft) && draft.chart_without_time !== undefined);
  const askWithoutTime = noHour && !hasBirthTime(draft) && hasNatalChartInput(draft);
  // A city typed but not picked from the list would be guessed at; the chart
  // is cast only for a place the person chose (16 Oct 2026).
  const placeUnpicked = draft.birth_city.trim() !== '' && !draft.birth_place;
  // Adults only, and no date to come (owner, 16 Oct 2026).
  const today = new Date();
  const dateGiven = /^\d{4}-\d{2}-\d{2}$/.test(draft.birth_date);
  const underage = dateGiven && !isAdultOn(draft.birth_date, today);
  const nameGiven = draft.legal_birth_name.trim().length > 1;
  const timeGiven = hasBirthTime(draft) || noHour;
  const dayNightGiven = !askWithoutTime || draft.birth_daynight !== undefined;
  const timeDecided = timeGiven && dayNightGiven && (!askWithoutTime || draft.chart_without_time !== undefined);
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
            : !timeGiven
              ? text.missing.time
              : !dayNightGiven
                ? text.missing.dayNight
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
            <BirthDateTime
              date={draft.birth_date}
              time={draft.birth_time}
              latestYear={Number(latestAdultBirthDate(today).slice(0, 4))}
              onDate={(value) => onChange({ birth_date: value, natal_chart: null })}
              onTime={(value) => {
                if (value) setNoHour(false);
                onChange({ birth_time: value, natal_chart: null });
              }}
            />
            {underage ? (
              <p id="birth-date-helper" role="alert" className="l error">
                {text.underage}
              </p>
            ) : (
              <p id="birth-date-helper" className="l">
                {text.birthDateTimeLabel}
              </p>
            )}
            <div className="chips sin-hora">
              <button
                type="button"
                aria-pressed={noHour}
                className={noHour ? 'chip on' : 'chip'}
                onClick={() => {
                  const next = !noHour;
                  setNoHour(next);
                  // Not knowing it clears the hour; knowing it again asks for it.
                  if (next) onChange({ birth_time: '', natal_chart: null });
                }}
              >
                {text.noHour}
              </button>
            </div>
            {askWithoutTime && (
              <div className="sin-hora-p">
                <p className="v" id="day-night-label">
                  {text.dayNightLabel}
                </p>
                <div className="chips" role="radiogroup" aria-labelledby="day-night-label">
                  {text.dayNightOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={draft.birth_daynight === value}
                      onClick={() => onChange({ birth_daynight: value, natal_chart: null })}
                      className={draft.birth_daynight === value ? 'chip on' : 'chip'}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {askWithoutTime && (
              <div className="sin-hora-p">
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
              {/* Every country (owner, 16 Oct 2026): the five with help lines
                  first, then the rest of the world. */}
              {LIVING_COUNTRIES.first.map(([code, name]) => (
                <option key={code} value={code}>
                  {`${text.livesIn}${name}`}
                </option>
              ))}
              <optgroup label={text.otherCountries}>
                {LIVING_COUNTRIES.rest.map(([code, name]) => (
                  <option key={code} value={code}>
                    {`${text.livesIn}${name}`}
                  </option>
                ))}
              </optgroup>
              {draft.country === ELSEWHERE && <option value={ELSEWHERE}>{text.livesElsewhere}</option>}
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

      </div>

      <p className="aviso">{text.notice}</p>
    </StepBody>
  );
}
