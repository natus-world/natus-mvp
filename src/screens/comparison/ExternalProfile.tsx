import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { ComparisonGate } from './Gate';
import { BIRTH_COUNTRIES } from '@/components/birth-countries';
import {
  consentFor,
  deleteExternalProfile,
  isConsentActive,
  listExternalProfiles,
  saveExternalProfile,
} from '@/store/comparison';

/**
 * Loading someone else's data. PDR 8.2.
 *
 * The warning is not a checkbox in a settings page: it sits between the form
 * and the save button, at the moment the person is about to enter a date of
 * birth that is not theirs. That is the only moment where it can actually
 * change what someone does.
 *
 * The other half of 8.2 is on this screen too — anyone loaded here can be
 * deleted here, by the person who loaded them, and deleting takes the consent
 * and the reading with it.
 */

const fieldClass =
  'field w-full text-[length:var(--fs-body-14)] leading-5 placeholder:text-crema/55 [color-scheme:dark]';
const labelClass = 'mb-1.5 block text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase';

const text = copy.comparison.external;
const STATUS_LABEL = text.status;

export function ExternalProfile() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(() => listExternalProfiles());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const canSave = name.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  const save = () => {
    const profile = saveExternalProfile({
      display_name: name.trim(),
      legal_birth_name: legalName.trim() || name.trim(),
      birth_date: birthDate,
      birth_time: birthTime,
      birth_city: birthCity.trim(),
      birth_country: birthCountry,
    });
    setProfiles(listExternalProfiles());
    navigate(`/comparacion/consentimiento/${profile.id}`);
  };

  return (
    <ComparisonGate>
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
          <p className="eyebrow mb-3">{text.kicker}</p>
          <h1 className="mb-3 text-[length:var(--fs-title-28)] leading-[var(--lh-heading-1_15)] text-blanco">
            {text.titleLead}
            <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
          </h1>
          <p className="mb-6 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
            {text.helper}
          </p>

          {profiles.length > 0 && (
            <div className="mb-6 flex flex-col gap-2.5">
              {profiles.map((profile) => {
                const consent = consentFor(profile.id);
                const active = isConsentActive(consent);
                return (
                  <article key={profile.id} className="surface surface-p14">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <h2 className="text-[length:var(--fs-heading-14)] text-blanco">{profile.display_name}</h2>
                      <span className="shrink-0 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
                        {consent ? STATUS_LABEL[consent.status] : text.notAsked}
                      </span>
                    </div>
                    <p className="mb-3 text-[length:var(--fs-body-11_5)] text-crema/55">{profile.birth_date}</p>

                    {confirming === profile.id ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            deleteExternalProfile(profile.id);
                            setProfiles(listExternalProfiles());
                            setConfirming(null);
                          }}
                          className="flex-1 rounded-full border border-error/40 px-3 py-2 text-[length:var(--fs-label-11)] tracking-wide text-error uppercase"
                        >
                          {text.deleteTheirData}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="chip chip-p8 flex-1 text-crema/60"
                        >
                          {text.keep}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Link
                          to={
                            active
                              ? `/comparacion/resultado/${profile.id}`
                              : `/comparacion/consentimiento/${profile.id}`
                          }
                          className="chip chip-p8 flex-1 text-center text-crema/75 no-underline"
                        >
                          {active ? text.viewReading : text.permissions}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirming(profile.id)}
                          className="chip chip-p8 px-3.5 text-crema/55"
                        >
                          {text.delete}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!adding ? (
            <button type="button" className="cta" onClick={() => setAdding(true)}>
              {text.add}
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass} htmlFor="external-name">
                  {text.nameLabel}
                </label>
                <input
                  id="external-name"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={text.namePlaceholder}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="external-legal-name">
                  {text.legalNameLabel}
                </label>
                <input
                  id="external-legal-name"
                  className={fieldClass}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder={text.optional}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="external-birth-date">
                  {text.birthDateLabel}
                </label>
                <input
                  id="external-birth-date"
                  type="date"
                  className={fieldClass}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              {/*
               * The three the ephemeris needs. Optional as a group: without
               * them the comparison still runs on numbers and themes, which
               * is the same degradation the Soul Map makes when somebody does
               * not know their birth time.
               */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="external-birth-time">
                    {text.birthTimeLabel}
                  </label>
                  <input
                    id="external-birth-time"
                    type="time"
                    className={fieldClass}
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="external-birth-city">
                    {text.birthCityLabel}
                  </label>
                  <input
                    id="external-birth-city"
                    className={fieldClass}
                    value={birthCity}
                    onChange={(e) => setBirthCity(e.target.value)}
                    placeholder={text.birthCityPlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="external-birth-country">
                  {text.birthCountryLabel}
                </label>
                <select
                  id="external-birth-country"
                  className={fieldClass}
                  value={birthCountry}
                  onChange={(e) => setBirthCountry(e.target.value)}
                >
                  {BIRTH_COUNTRIES.map(([code, label]) => (
                    <option key={code || 'empty'} value={code} className="bg-noche">
                      {label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
                  {text.birthHelper}
                </p>
              </div>

              {/*
               * PDR 8.2. Between the form and the button, at the moment the
               * person is about to type someone else's date of birth — which
               * is the only moment where saying this can change anything.
               */}
              <div className="rounded-[var(--radius-option)] border border-error/25 px-4 py-3.5">
                <p className="eyebrow mb-1.5">{text.warningKicker}</p>
                <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/75">
                  {text.warning}
                </p>
              </div>

              <button type="button" className="cta" disabled={!canSave} onClick={save}>
                {text.save}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="chip chip-p10 text-crema/60"
              >
                {text.cancel}
              </button>
            </div>
          )}
        </div>
      </Screen>
    </ComparisonGate>
  );
}
