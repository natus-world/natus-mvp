import { useEffect, useRef, useState } from 'react';
import { copy } from '@/i18n';
import { currentSession } from '@/supabase/session';
import { PAYPAL_PLAN_ID } from '@/lib/paypal';

const text = copy.paywall;

/**
 * The PayPal subscription button: one free month, then US$10 a month (the
 * owner's plan "Premium mensual", created in PayPal on 2026-10-15).
 *
 * A bridge until dLocal Go (v1.2 P-01). Activation is automatic: the button
 * stamps the subscription with the person's Natus user id (`custom_id`), and
 * PayPal's notification to the paypal-webhook function carries it back, so
 * the subscription finds its account by id, not by an email that may differ.
 * Only the server writes the subscription row; nothing here makes anybody
 * premium.
 *
 * Both ids are public by design — they are what PayPal's own embed code puts
 * in the page. No secret is involved.
 */
const CLIENT_ID =
  'BAA6dUeknCd4kbm9_5bcct-YxE0oI_eAjrWyS2qDq10-qhcZZ8BRWyU5QWhaDSYfMBek0KEavc8DRrYH7Q';
const PLAN_ID = PAYPAL_PLAN_ID;
// Latin American Spanish (es_MX; PayPal refuses es_XC without a country), and no PayPal Credit or Pay Later: both are US
// offers that would only add buttons nobody here can use.
const SDK_URL =
  `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&vault=true&intent=subscription` +
  '&locale=es_MX&disable-funding=credit,paylater';

type PayPalButtons = {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => void;
};
type PayPalNamespace = {
  Buttons: (options: {
    style: Record<string, string | number>;
    createSubscription: (
      data: unknown,
      actions: { subscription: { create: (body: { plan_id: string; custom_id: string }) => Promise<string> } },
    ) => Promise<string>;
    onApprove: (data: { subscriptionID?: string }) => void;
    onError: () => void;
  }) => PayPalButtons;
};

let sdk: Promise<PayPalNamespace> | null = null;

/** Loads PayPal's script once per page, and only when the paywall asks for it. */
function loadSdk(): Promise<PayPalNamespace> {
  sdk ??= new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
      if (paypal) resolve(paypal);
      else reject(new Error('paypal sdk loaded without a namespace'));
    };
    script.onerror = () => reject(new Error('paypal sdk failed to load'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    sdk = null; // a later paywall may try again
    throw error;
  });
  return sdk;
}

type State = 'loading' | 'ready' | 'unavailable' | 'approved';

export function PayPalSubscribe() {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtons | null = null;

    void (async () => {
      const session = await currentSession();
      // Without an account there is nothing to attach the subscription to.
      if (!session) {
        if (!cancelled) setState('unavailable');
        return;
      }
      try {
        const paypal = await loadSdk();
        if (cancelled || !container.current) return;
        buttons = paypal.Buttons({
          style: { shape: 'pill', color: 'white', layout: 'vertical', label: 'subscribe', height: 44 },
          createSubscription: (_data, actions) =>
            actions.subscription.create({ plan_id: PLAN_ID, custom_id: session.user.id }),
          onApprove: () => {
            if (!cancelled) setState('approved');
          },
          onError: () => {
            if (!cancelled) setState('unavailable');
          },
        });
        await buttons.render(container.current);
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      buttons?.close?.();
    };
  }, []);

  if (state === 'approved') {
    return (
      <p role="status" className="text-[length:var(--fs-body-13)] leading-relaxed text-blanco">
        {text.approved}
      </p>
    );
  }

  return (
    <div>
      {state === 'unavailable' && (
        <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">{text.unavailable}</p>
      )}
      <div ref={container} hidden={state === 'unavailable'} className="min-h-11" />
    </div>
  );
}
