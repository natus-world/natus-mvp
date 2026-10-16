import { describe, expect, it } from 'vitest';
import { PAYPAL_PLAN_ID, readPayPalEvent } from './paypal.ts';

const USER = '0d6a3c55-7c1e-4b7e-9f5e-2f1a8b9c0d11';
const sub = (type: string, resource: Record<string, unknown>) => ({ id: 'WH-1', event_type: type, resource });

describe('reading PayPal notifications (v1.2 P-01)', () => {
  it('activates the account stamped on the subscription', () => {
    expect(
      readPayPalEvent(sub('BILLING.SUBSCRIPTION.ACTIVATED', { id: 'I-1', plan_id: PAYPAL_PLAN_ID, custom_id: USER })),
    ).toEqual({ kind: 'activate', userId: USER, subscriptionId: 'I-1' });
  });

  it('ignores a subscription with no Natus account on it', () => {
    expect(readPayPalEvent(sub('BILLING.SUBSCRIPTION.ACTIVATED', { id: 'I-1', custom_id: 'ana@example.com' })).kind).toBe(
      'ignore',
    );
  });

  it('ignores another plan of the same PayPal account', () => {
    expect(
      readPayPalEvent(sub('BILLING.SUBSCRIPTION.ACTIVATED', { id: 'I-1', plan_id: 'P-OTRO', custom_id: USER })).kind,
    ).toBe('ignore');
  });

  it('keeps premium until what was paid runs out when cancelled', () => {
    expect(
      readPayPalEvent(
        sub('BILLING.SUBSCRIPTION.CANCELLED', {
          id: 'I-1',
          billing_info: { next_billing_time: '2026-11-15T10:00:00Z' },
        }),
      ),
    ).toEqual({ kind: 'end_at', subscriptionId: 'I-1', endsAt: '2026-11-15T10:00:00Z' });
    expect(
      readPayPalEvent(
        sub('BILLING.SUBSCRIPTION.CANCELLED', { id: 'I-1', billing_info: { last_payment: { time: '2026-10-15T10:00:00Z' } } }),
      ),
    ).toEqual({ kind: 'end_at', subscriptionId: 'I-1', endsAt: '2026-11-15T10:00:00.000Z' });
  });

  it('ends premium at once when suspended or expired', () => {
    expect(readPayPalEvent(sub('BILLING.SUBSCRIPTION.SUSPENDED', { id: 'I-1' }))).toEqual({
      kind: 'end_now',
      subscriptionId: 'I-1',
    });
    expect(readPayPalEvent(sub('BILLING.SUBSCRIPTION.EXPIRED', { id: 'I-1' })).kind).toBe('end_now');
  });

  it('reads a monthly charge by its subscription', () => {
    expect(readPayPalEvent(sub('PAYMENT.SALE.COMPLETED', { id: 'S-1', billing_agreement_id: 'I-1' }))).toEqual({
      kind: 'charged',
      subscriptionId: 'I-1',
    });
  });

  it('ignores anything else, and anything that is not an event', () => {
    expect(readPayPalEvent(sub('BILLING.SUBSCRIPTION.PAYMENT.FAILED', { id: 'I-1' })).kind).toBe('ignore');
    expect(readPayPalEvent(null).kind).toBe('ignore');
    expect(readPayPalEvent({ event_type: 'X' }).kind).toBe('ignore');
  });
});
