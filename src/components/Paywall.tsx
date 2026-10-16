import { copy } from '@/i18n';
import { useEffect, useState } from 'react';
import { fetchQuota } from '@/store/quota';
import { PayPalSubscribe } from './PayPalSubscribe';
import { track } from '@/store/funnel';
import type { PlanFeature } from '@/lib/quota';

const text = copy.paywall;

/**
 * The end of the free questions. PDR section 3.
 *
 * Two rules shape this component. It never appears over a crisis turn — the
 * caller checks safety first, and PDR 1.6 forbids a commercial fallback in
 * that moment. And it does not take the screen: what the person typed is still
 * in the box behind it, still theirs, and comes back untouched if they close
 * this.
 *
 * Premium is taken out with PayPal for now (one free month, then US$10), a
 * bridge until dLocal Go (v1.2 P-01). Activation is manual and only the server
 * can make anybody premium. The simulated subscription it used to offer is
 * gone: it changed nothing on the server.
 */
export function Paywall({ feature, onDismiss }: { feature: PlanFeature; onDismiss: () => void }) {
  // After a crisis alert the server holds the offer back for seven days
  // (decided 15 Oct 2026): what is used up is still said, Premium is not.
  // Unknown until the server answers, so the offer never flashes.
  const [offer, setOffer] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void fetchQuota(feature).then((q) => {
      if (live) setOffer(q ? q.offerPremium : true);
    });
    return () => {
      live = false;
    };
  }, [feature]);

  useEffect(() => {
    if (offer) track('paywall_seen', feature);
  }, [feature, offer]);

  return (
    <div
      role="dialog"
      aria-label={text.label}
      className="surface surface-p16"
    >
      <p className="eyebrow mb-2">{text.kicker}</p>
      <h2 className="mb-2 text-[length:var(--fs-heading-17)] leading-snug text-blanco">
        {text.title[feature]}
      </h2>
      <p className="mb-3.5 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
        {text.body[feature]}
      </p>

      {offer && (
        <div className="mb-3.5 border-t border-crema/15 pt-3">
          <p className="text-[length:var(--fs-body-13)] text-blanco">{text.offerTitle}</p>
          <p className="mt-1 mb-3 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
            {text.offerBody}
          </p>
          <PayPalSubscribe />
        </div>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="chip chip-p10 w-full text-crema/60"
      >
        {text.back}
      </button>
    </div>
  );
}
