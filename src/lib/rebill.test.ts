import { describe, expect, it } from 'vitest';
import {
  isRealCharge,
  mayCheckout,
  readRebillEvent,
  readRebillSubscription,
  rebillChange,
  type RebillSubscription,
} from './rebill.ts';

const USER = '0d6a3c55-7c1e-4b7e-9f5e-2f1a8b9c0d11';
const PLAN = 'pln_natus';
const webhook = (event: string, logId = 'we_log_1') => ({ id: 'we_1', event, url: 'https://x', logId });

const subscription = (over: Partial<RebillSubscription> = {}): RebillSubscription => ({
  id: 'sub_1',
  status: 'active',
  statusDetail: 'in_trial',
  planId: PLAN,
  lastChargeDate: '2026-10-22T12:00:00.000Z',
  createdAt: '2026-10-22T12:00:00.000Z',
  natusUserId: null,
  ...over,
});

describe('reading Rebill notifications', () => {
  it('finds the link and the subscription on the first payment of a trial', () => {
    expect(
      readRebillEvent({
        data: {
          payment: { id: 'pay_1', status: 'approved', amount: 0, metadata: { paymentLinkId: 'pl_1' } },
          paymentLinkId: 'pl_1',
          planId: PLAN,
          subscriptionId: 'sub_1',
        },
        webhook: webhook('payment.created'),
      }),
    ).toEqual({
      logId: 'we_log_1',
      event: 'payment.created',
      subscriptionId: 'sub_1',
      paymentLinkId: 'pl_1',
      payment: { status: 'approved', amount: 0 },
    });
  });

  it('takes the link from the payment metadata when the top level lacks it', () => {
    expect(
      readRebillEvent({
        data: { payment: { status: 'approved', amount: 0, metadata: { paymentLinkId: 'pl_2' } }, subscriptionId: 'sub_1' },
        webhook: webhook('payment.created'),
      })?.paymentLinkId,
    ).toBe('pl_2');
  });

  it('finds the subscription where each subscription event keeps it', () => {
    expect(
      readRebillEvent({ data: { subscription: { id: 'sub_c' } }, webhook: webhook('subscription.created') })
        ?.subscriptionId,
    ).toBe('sub_c');
    expect(
      readRebillEvent({ data: { id: 'sub_u', status: 'cancelled' }, webhook: webhook('subscription.updated') })
        ?.subscriptionId,
    ).toBe('sub_u');
  });

  it('refuses a body without a delivery id, which is what makes a retry harmless', () => {
    expect(readRebillEvent({ data: {}, webhook: { event: 'payment.created' } })).toBeNull();
    expect(readRebillEvent('not json')).toBeNull();
  });

  it('keeps an event about something else, with nothing to act on', () => {
    expect(readRebillEvent({ data: { id: 'po_1' }, webhook: webhook('payout.updated') })).toEqual({
      logId: 'we_log_1',
      event: 'payout.updated',
      subscriptionId: null,
      paymentLinkId: null,
      payment: null,
    });
  });
});

describe('reading a Rebill subscription', () => {
  it('reads the plan, the dates and our id when Rebill copied it', () => {
    expect(
      readRebillSubscription({
        id: 'sub_1',
        status: 'active',
        statusDetail: 'in_trial',
        plan: { id: PLAN },
        lastChargeDate: '2026-10-22T12:00:00.000Z',
        createdAt: '2026-10-22T12:00:00.000Z',
        metadata: { natus_user_id: USER.toUpperCase() },
      }),
    ).toEqual(subscription({ natusUserId: USER }));
  });

  it('ignores a metadata id that is not one of ours', () => {
    expect(readRebillSubscription({ id: 'sub_1', status: 'active', metadata: { natus_user_id: 'ana@x.com' } })?.natusUserId).toBeNull();
  });

  it('is null for anything that is not a subscription', () => {
    expect(readRebillSubscription({ status: 'active' })).toBeNull();
  });
});

describe('what a Rebill subscription means for premium', () => {
  const now = new Date('2026-11-01T00:00:00.000Z');

  it('keeps premium in the trial, while paying and while Rebill retries a charge', () => {
    expect(rebillChange(subscription(), PLAN, now)).toEqual({ kind: 'active' });
    expect(rebillChange(subscription({ statusDetail: 'active' }), PLAN, now)).toEqual({ kind: 'active' });
    expect(rebillChange(subscription({ status: 'retrying' }), PLAN, now)).toEqual({ kind: 'active' });
  });

  it('ends premium at once when the subscription is paused or finished', () => {
    expect(rebillChange(subscription({ status: 'paused', statusDetail: 'defaulted' }), PLAN, now)).toEqual({
      kind: 'end_now',
    });
    expect(rebillChange(subscription({ status: 'finished' }), PLAN, now)).toEqual({ kind: 'end_now' });
  });

  it('keeps premium until the covered month runs out when cancelled, the trial included', () => {
    expect(rebillChange(subscription({ status: 'cancelled' }), PLAN, now)).toEqual({
      kind: 'end_at',
      endsAt: '2026-11-22T12:00:00.000Z',
    });
  });

  it('ends at once a cancellation whose month has already run out', () => {
    expect(
      rebillChange(subscription({ status: 'cancelled', lastChargeDate: '2026-09-01T00:00:00.000Z' }), PLAN, now),
    ).toEqual({ kind: 'end_at', endsAt: null });
  });

  it('falls back to the start when Rebill gives no charge date', () => {
    expect(rebillChange(subscription({ status: 'cancelled', lastChargeDate: null }), PLAN, now)).toEqual({
      kind: 'end_at',
      endsAt: '2026-11-22T12:00:00.000Z',
    });
  });

  it('ignores another plan of the same Rebill organization', () => {
    expect(rebillChange(subscription({ planId: 'pln_otro' }), PLAN, now).kind).toBe('ignore');
  });

  it('changes nothing while Rebill is processing', () => {
    expect(rebillChange(subscription({ status: 'processing' }), PLAN, now).kind).toBe('ignore');
  });
});

describe('charges', () => {
  const payment = (status: string, amount: number) => ({
    logId: 'l',
    event: 'payment.created',
    subscriptionId: 'sub_1',
    paymentLinkId: null,
    payment: { status, amount },
  });

  it('counts an approved charge above zero, never the US$0 that opens the trial', () => {
    expect(isRealCharge(payment('approved', 10))).toBe(true);
    expect(isRealCharge(payment('approved', 0))).toBe(false);
    expect(isRealCharge(payment('rejected', 10))).toBe(false);
  });
});

describe('who may open a checkout while Rebill is in its sandbox', () => {
  it('only the listed test addresses, in any case and spacing', () => {
    expect(mayCheckout('Nico@Example.com', ' otra@x.com , nico@example.com ', undefined)).toBe(true);
    expect(mayCheckout('ana@example.com', 'nico@example.com', undefined)).toBe(false);
  });

  it('nobody when the list is empty or the person has no address', () => {
    expect(mayCheckout('nico@example.com', undefined, undefined)).toBe(false);
    expect(mayCheckout(null, 'nico@example.com', undefined)).toBe(false);
  });

  it('everybody once it is opened', () => {
    expect(mayCheckout('ana@example.com', undefined, 'true')).toBe(true);
  });
});
