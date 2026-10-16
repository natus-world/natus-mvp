/**
 * PayPal's subscription notifications, read (v1.2 P-01, automatic).
 *
 * Pure: the webhook function verifies the signature with PayPal and writes
 * the result; this only says what an event means for Natus, so it can be
 * tested without PayPal.
 *
 * The plan is the owner's "Premium mensual": US$10 a month with the first
 * month free. The button stamps each subscription with the person's Natus id
 * (`custom_id`), which is how an event finds its account — never by email.
 */

export const PAYPAL_PLAN_ID = 'P-6UF36541AB665994MNLIP4SQ';

export type SubscriptionChange =
  | { kind: 'activate'; userId: string; subscriptionId: string }
  | { kind: 'end_at'; subscriptionId: string; endsAt: string | null }
  | { kind: 'end_now'; subscriptionId: string }
  | { kind: 'charged'; subscriptionId: string }
  | { kind: 'ignore'; why: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** One month after a moment, for a cancelled subscription PayPal gives no next date for. */
function oneMonthAfter(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  at.setUTCMonth(at.getUTCMonth() + 1);
  return at.toISOString();
}

export function readPayPalEvent(event: unknown): SubscriptionChange {
  const body = record(event);
  const type = text(body?.['event_type']);
  const resource = record(body?.['resource']);
  if (!type || !resource) return { kind: 'ignore', why: 'not an event' };

  if (type === 'PAYMENT.SALE.COMPLETED') {
    const subscriptionId = text(resource['billing_agreement_id']);
    return subscriptionId ? { kind: 'charged', subscriptionId } : { kind: 'ignore', why: 'a payment outside a subscription' };
  }

  if (!type.startsWith('BILLING.SUBSCRIPTION.')) return { kind: 'ignore', why: type };
  const subscriptionId = text(resource['id']);
  if (!subscriptionId) return { kind: 'ignore', why: 'no subscription id' };

  // Another plan in the same PayPal account is not Natus premium.
  const planId = text(resource['plan_id']);
  if (planId && planId !== PAYPAL_PLAN_ID) return { kind: 'ignore', why: `plan ${planId}` };

  switch (type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED': {
      const userId = text(resource['custom_id']);
      if (!userId || !UUID.test(userId)) return { kind: 'ignore', why: 'no Natus account on it' };
      return { kind: 'activate', userId: userId.toLowerCase(), subscriptionId };
    }
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      // Premium lasts until what was paid runs out: the next billing date if
      // PayPal still gives one, else a month after the last payment, else now.
      const billing = record(resource['billing_info']);
      const next = text(billing?.['next_billing_time']);
      const lastPaid = text(record(billing?.['last_payment'])?.['time']);
      return { kind: 'end_at', subscriptionId, endsAt: next ?? (lastPaid ? oneMonthAfter(lastPaid) : null) };
    }
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      return { kind: 'end_now', subscriptionId };
    default:
      return { kind: 'ignore', why: type };
  }
}
