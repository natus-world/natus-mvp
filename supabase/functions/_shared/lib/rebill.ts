/**
 * Rebill's subscription notifications, read (sandbox trial, owner, 22 Oct 2026).
 *
 * Pure, like `paypal.ts`: the rebill-webhook function checks the signature,
 * asks Rebill for the subscription itself and writes the result; this only
 * says what Rebill's data means for Natus, so it can be tested without Rebill.
 *
 * The plan is the same Premium as PayPal's — US$10 a month, the first month
 * free — created through the API because the trial (`trialPeriodDays`) is
 * not in Rebill's dashboard form.
 *
 * How an event finds its account: the checkout function creates one payment
 * link per person and keeps `payment_link_id → user_id` on the server
 * (`rebill_checkouts`). The first payment of a subscription (US$0 during the
 * trial) names the link it came through; from then on the subscription id is
 * on the person's row. Never by email.
 */

export const REBILL_TRIAL_DAYS = 30;

/** What Natus needs from one notification. Anything else in it is ignored. */
export type RebillEvent = {
  /** Rebill's id for this delivery: what makes a retry change nothing. */
  logId: string;
  event: string;
  subscriptionId: string | null;
  paymentLinkId: string | null;
  payment: { status: string | null; amount: number | null } | null;
};

/** The subscription as Rebill answers `GET /v3/subscriptions/{id}`. */
export type RebillSubscription = {
  id: string;
  status: string;
  statusDetail: string | null;
  planId: string | null;
  lastChargeDate: string | null;
  createdAt: string | null;
  /** Our own id, if Rebill copied the payment link's metadata onto it. */
  natusUserId: string | null;
};

export type RebillChange =
  | { kind: 'active' }
  | { kind: 'end_at'; endsAt: string | null }
  | { kind: 'end_now' }
  | { kind: 'ignore'; why: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function natusUserId(value: unknown): string | null {
  const id = text(value);
  return id && UUID.test(id) ? id.toLowerCase() : null;
}

/**
 * The parts of a notification Natus uses. The subscription id sits in a
 * different place in each event (Rebill's webhook guide, 22 Oct 2026):
 * `data.subscription.id` when created, `data.id` when updated, and
 * `data.subscriptionId` on a payment.
 */
export function readRebillEvent(body: unknown): RebillEvent | null {
  const root = record(body);
  const webhook = record(root?.['webhook']);
  const data = record(root?.['data']);
  const logId = text(webhook?.['logId']);
  const event = text(webhook?.['event']);
  if (!logId || !event || !data) return null;

  if (event.startsWith('payment.')) {
    const payment = record(data['payment']) ?? data;
    const paymentLinkId = text(data['paymentLinkId']) ?? text(record(payment['metadata'])?.['paymentLinkId']);
    return {
      logId,
      event,
      subscriptionId: text(data['subscriptionId']),
      paymentLinkId,
      payment: { status: text(payment['status']), amount: number(payment['amount']) },
    };
  }

  if (event.startsWith('subscription.')) {
    const subscription = record(data['subscription']);
    return {
      logId,
      event,
      subscriptionId: text(subscription?.['id']) ?? text(data['id']),
      paymentLinkId: null,
      payment: null,
    };
  }

  return { logId, event, subscriptionId: null, paymentLinkId: null, payment: null };
}

/** Reads Rebill's answer for one subscription; null when it is not one. */
export function readRebillSubscription(body: unknown): RebillSubscription | null {
  const sub = record(body);
  const id = text(sub?.['id']);
  const status = text(sub?.['status']);
  if (!sub || !id || !status) return null;
  return {
    id,
    status,
    statusDetail: text(sub['statusDetail']),
    planId: text(record(sub['plan'])?.['id']) ?? text(sub['planId']),
    lastChargeDate: text(sub['lastChargeDate']),
    createdAt: text(sub['createdAt']),
    natusUserId: natusUserId(record(sub['metadata'])?.['natus_user_id']),
  };
}

/** One month after a moment: what a cancelled month still covers. */
function oneMonthAfter(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  at.setUTCMonth(at.getUTCMonth() + 1);
  return at.toISOString();
}

/**
 * What the subscription's state means for premium.
 *
 * - `active` (in the trial or paying) and `retrying` (a charge failed and
 *   Rebill is still trying) keep premium.
 * - `paused` (stopped by hand or after the retries ran out) and `finished`
 *   end it at once, as a PayPal suspension does.
 * - `cancelled` keeps it until what was covered runs out: a month after the
 *   last charge — the US$0 of the trial counts, so a cancelled trial lasts to
 *   its end — or after the start when Rebill gives no charge date.
 * - `processing` is Rebill's own transient state: nothing changes.
 */
export function rebillChange(sub: RebillSubscription, planId: string, now: Date = new Date()): RebillChange {
  if (sub.planId && sub.planId !== planId) return { kind: 'ignore', why: `plan ${sub.planId}` };

  switch (sub.status) {
    case 'active':
    case 'retrying':
      return { kind: 'active' };
    case 'paused':
    case 'finished':
      return { kind: 'end_now' };
    case 'cancelled': {
      const from = sub.lastChargeDate ?? sub.createdAt;
      const endsAt = from ? oneMonthAfter(from) : null;
      return { kind: 'end_at', endsAt: endsAt && new Date(endsAt) > now ? endsAt : null };
    }
    default:
      return { kind: 'ignore', why: `status ${sub.status}` };
  }
}

/** A real charge, not the US$0 that opens the trial. */
export function isRealCharge(event: RebillEvent): boolean {
  return event.payment?.status === 'approved' && (event.payment.amount ?? 0) > 0;
}

/**
 * Who may open a Rebill checkout. While the trial runs in Rebill's sandbox
 * the cards are fake, so a sandbox subscription must never make a real
 * person premium: only the addresses the owner lists in
 * `REBILL_TEST_EMAILS` get a link, until `REBILL_OPEN` is `true`.
 */
export function mayCheckout(email: string | null, testEmails: string | undefined, open: string | undefined): boolean {
  if (open === 'true') return true;
  if (!email) return false;
  const allowed = (testEmails ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
