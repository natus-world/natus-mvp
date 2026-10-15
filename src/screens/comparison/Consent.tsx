import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { ComparisonGate } from './Gate';
import {
  CONSENT_TTL_MS,
  consentFor,
  externalProfileById,
  isConsentActive,
  requestConsent,
  respondToConsent,
  revokeConsent,
} from '@/store/comparison';
import type { ComparisonScope } from '@/lib/comparison-payload';
import { isScopeUsable } from '@/lib/comparison-payload';

/**
 * The consent of PDR 8.2, simulated between two local profiles.
 *
 * In production this is a transactional email to a second person, who opens a
 * link and answers. There is no mail provider in a static build, so the second
 * person's side is a panel on this screen — which changes who taps the button
 * and nothing about the rule: no granted, unexpired consent, no reading.
 *
 * The screen says that out loud rather than pretending an email went out. A
 * demo that mimes sending mail teaches whoever is watching something false
 * about what exists.
 */

const text = copy.comparison.consent;

const SCOPE_LABELS: [keyof ComparisonScope, string, string][] = (
  ['numerology', 'astro', 'soul_map_themes'] as const
).map((key) => [key, text.scope[key][0], text.scope[key][1]]);

function days(ms: number): number {
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function Consent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = externalProfileById(id);
  const [consent, setConsent] = useState(() => consentFor(id));
  const [scope, setScope] = useState<ComparisonScope>(
    () => consent?.scope ?? { numerology: true, astro: false, soul_map_themes: true },
  );

  if (!profile) {
    return (
      <ComparisonGate>
        <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content45}>
          <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
            <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">{text.missing}</p>
            <Link to="/comparacion" className="cta no-underline">
              {text.back}
            </Link>
          </div>
        </Screen>
      </ComparisonGate>
    );
  }

  const active = isConsentActive(consent);

  return (
    <ComparisonGate>
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
          <p className="eyebrow mb-3">{text.kicker(profile.display_name)}</p>
          <h1 className="mb-3 text-[length:var(--fs-title-27)] leading-[var(--lh-heading-1_15)] text-blanco">
            {text.titleLead}
            <span className="font-serif text-crema italic">{text.titleEmphasis}</span>
          </h1>
          <p className="mb-6 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">
            {text.helper(profile.display_name, days(CONSENT_TTL_MS))}
          </p>

          <div className="mb-5 flex flex-col gap-2">
            {SCOPE_LABELS.map(([key, label, detail]) => (
              <button
                key={key}
                type="button"
                role="checkbox"
                aria-checked={scope[key]}
                disabled={consent?.status === 'granted'}
                onClick={() => setScope((current) => ({ ...current, [key]: !current[key] }))}
                className="surface surface-p12 flex items-start gap-3 text-left disabled:opacity-60"
              >
                <span
                  aria-hidden="true"
                  className={[
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border text-[length:var(--fs-micro-10)]',
                    scope[key] ? 'border-crema bg-crema text-noche' : 'border-crema/30 text-transparent',
                  ].join(' ')}
                >
                  ✓
                </span>
                <span>
                  <span className="block text-[length:var(--fs-body-13)] text-blanco">{label}</span>
                  <span className="mt-0.5 block text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/55">
                    {detail}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mb-6 rounded-[var(--radius-option)] border border-crema/10 px-3.5 py-2.5 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
            {text.neverShared}
          </p>

          {/*
           * The other person's side. Labelled as the simulation it is: no mail
           * was sent, and saying so is more useful than a convincing mime.
           */}
          <div className="rounded-[var(--radius-option)] border border-crema/15 px-4 py-4">
            <p className="eyebrow mb-2">{text.otherSide(profile.display_name)}</p>
            <p className="mb-3.5 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/55">
              {text.simulation}
            </p>

            {!consent && (
              <button
                type="button"
                className="cta"
                disabled={!isScopeUsable(scope)}
                onClick={() => setConsent(requestConsent({ externalProfileId: id, scope }))}
              >
                {text.ask}
              </button>
            )}

            {consent?.status === 'pending' && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="cta"
                  onClick={() => {
                    respondToConsent(consent.id, 'granted');
                    setConsent(consentFor(id));
                  }}
                >
                  {text.accepts(profile.display_name)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    respondToConsent(consent.id, 'denied');
                    setConsent(consentFor(id));
                  }}
                  className="chip chip-p10 text-crema/60"
                >
                  {text.declines(profile.display_name)}
                </button>
              </div>
            )}

            {consent && consent.status !== 'pending' && (
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-[length:var(--fs-body-12)] leading-relaxed text-crema/75">
                  {active
                    ? text.activeUntil(days(consent.expires_at - Date.now()))
                    : consent.status === 'granted'
                      ? text.expired
                      : consent.status === 'denied'
                        ? text.denied
                        : text.revoked}
                </p>

                {active && (
                  <>
                    <button
                      type="button"
                      className="cta"
                      onClick={() => navigate(`/comparacion/resultado/${id}`)}
                    >
                      {text.viewReading}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        revokeConsent(consent.id);
                        setConsent(consentFor(id));
                      }}
                      className="rounded-full border border-error/40 px-3 py-2.5 text-[length:var(--fs-label-11)] tracking-wide text-error uppercase"
                    >
                      {text.revoke}
                    </button>
                  </>
                )}

                {!active && (
                  <button
                    type="button"
                    onClick={() => setConsent(requestConsent({ externalProfileId: id, scope }))}
                    className="chip chip-p10 text-crema/60"
                  >
                    {text.askAgain}
                  </button>
                )}
              </div>
            )}
          </div>

          <Link
            to="/comparacion"
            className="chip chip-p10 mt-4 text-center text-crema/60 no-underline"
          >
            {text.back}
          </Link>
        </div>
      </Screen>
    </ComparisonGate>
  );
}
