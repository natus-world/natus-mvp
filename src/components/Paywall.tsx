import { copy } from '@/i18n';
import { useEffect, useState } from 'react';
import { fetchQuota, renewalDate } from '@/store/quota';
import { PayPalSubscribe } from './PayPalSubscribe';
import { track } from '@/store/funnel';

const text = copy.paywall;

/** Where this sheet is shown; the chat draws its own («Seguir conversando», package 10). */
type SheetFeature = 'meditation' | 'comparison' | 'welcome';

/** The package's check (`OK`, stroke 1.4). */
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** «16 de noviembre», from a local date. */
function dayName(date: Date): string {
  return `${date.getDate()} de ${copy.quota.months[date.getMonth()]}`;
}

/**
 * The free month day by day, from today: PayPal's trial is one month, and the
 * first charge falls on the same day of the next one.
 */
function FreeMonth() {
  const today = new Date();
  // The 31st of a shorter month is its last day, not the 1st of the next.
  const charge = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  if (charge.getDate() !== today.getDate()) charge.setDate(0);
  const eve = new Date(charge.getFullYear(), charge.getMonth(), charge.getDate() - 1);
  const cal = text.calendar;
  return (
    <div className="mes" role="group" aria-label={cal.label}>
      <p className="k">{cal.label}</p>
      <ol>
        <li>
          <b>{cal.today}</b>
          <span>{cal.start}</span>
        </li>
        <li>
          <b>{cal.until(dayName(eve))}</b>
          <span>{cal.cancel}</span>
        </li>
        <li>
          <b>{dayName(charge)}</b>
          <span>{cal.charge}</span>
        </li>
      </ol>
    </div>
  );
}

/**
 * The end of what a free plan includes, over meditations and comparisons:
 * package 13 (16 Oct 2026), the chat's sheet with what Premium adds.
 *
 * Two rules shape this component. It never appears over a crisis turn — the
 * caller checks safety first, and PDR 1.6 forbids a commercial fallback in
 * that moment. And it does not take the screen: what the person typed is still
 * in the box behind it, still theirs, and comes back untouched if they close
 * this.
 *
 * Premium is taken out with PayPal for now (one free month, then US$10), a
 * bridge until dLocal Go (v1.2 P-01). Only the server can make anybody
 * premium.
 */
export function Paywall({ feature, onDismiss }: { feature: SheetFeature; onDismiss: () => void }) {
  // After a crisis alert the server holds the offer back for seven days
  // (decided 15 Oct 2026): what is used up is still said, Premium is not.
  // Unknown until the server answers, so the offer never flashes.
  const [offer, setOffer] = useState<boolean | null>(null);
  const [renewsOn, setRenewsOn] = useState('');
  const [trying, setTrying] = useState(false);
  useEffect(() => {
    let live = true;
    // «welcome», right after the map (owner, 16 Oct 2026), asks the chat's
    // quota only for the tier and the crisis hold; a premium person skips it.
    void fetchQuota(feature === 'welcome' ? 'chat' : feature).then((q) => {
      if (!live) return;
      if (feature === 'welcome' && (q?.tier === 'premium' || q?.offerPremium === false)) {
        onDismiss();
        return;
      }
      setOffer(q ? q.offerPremium : true);
      setRenewsOn(q?.renewsOn ?? '');
    });
    return () => {
      live = false;
    };
  }, [feature, onDismiss]);

  useEffect(() => {
    if (offer) track('paywall_seen', feature);
  }, [feature, offer]);

  if (offer === null) return null;
  // Free meditations do not renew; the comparisons say when they come back,
  // so nobody feels they have to pay now.
  const next = feature === 'comparison' && renewsOn ? text.renew(renewalDate(renewsOn)) : null;

  return (
    <div className="premium">
      <div className="velo-p" aria-hidden="true" />
      <div className="hoja-p" role="dialog" aria-label={text.label}>
        <p className="k">{feature === 'welcome' ? text.welcomeKicker : text.kicker}</p>
        <p className="t">
          {text.titleLead[feature]}
          <em>{text.titleEmphasis[feature]}</em>
        </p>
        <p className="x">{text.kept}</p>
        {offer ? (
          <>
            <ul className="incluye">
              {text.includes.map((line) => (
                <li key={line}>
                  <CheckGlyph />
                  {line}
                </li>
              ))}
            </ul>
            <div className="precio">
              <b>{text.price}</b>
              <span>
                {text.period}
                <br />
                {text.cancel}
              </span>
            </div>
            {(trying || feature === 'welcome') && <FreeMonth />}
            <div className="bts">
              {trying ? (
                <div className="pago">
                  <PayPalSubscribe />
                </div>
              ) : (
                <button type="button" className="bt-c" onClick={() => setTrying(true)}>
                  {text.trial}
                </button>
              )}
              <button type="button" className="bt-o" onClick={onDismiss}>
                {text.notNow}
              </button>
            </div>
          </>
        ) : (
          <div className="bts">
            <button type="button" className="bt-o" onClick={onDismiss}>
              {text.back}
            </button>
          </div>
        )}
        {next && <p className="prox">{next}</p>}
      </div>
    </div>
  );
}
