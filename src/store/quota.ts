import { copy } from '@/i18n';
import { isBackendConfigured, supabase } from '@/supabase/client';
import type { PlanFeature } from '@/lib/quota';

/**
 * What the person's plan has left of a feature (v1.2 F-01), as the server
 * counts it: `my_quota` reads `plan_quotas`, the ledger and the subscription,
 * none of which the browser can write. Shown before the feature is used, so
 * the end of what is included is never a surprise.
 *
 * Null without a backend or a session — the fixture demo counts on its own.
 */
export type Quota = {
  tier: 'free' | 'premium';
  /** Null when unlimited. */
  remaining: number | null;
  /** YYYY-MM-DD, when the monthly part renews. */
  renewsOn: string;
  /**
   * This month's renewed part is still unused and the person used the
   * feature in an earlier month: «Este mes tienes 1 pregunta nueva».
   */
  newThisMonth: number;
  /** False for seven days after a crisis alert: the offer is held back (decided 15 Oct 2026). */
  offerPremium: boolean;
  /** Premium given by the team from the panel: nothing renews, nothing to cancel. */
  gift: boolean;
  /** YYYY-MM-DD when a gift ends; null when it has no end. */
  giftEndsOn: string | null;
};

export async function fetchQuota(feature: PlanFeature): Promise<Quota | null> {
  if (!isBackendConfigured || !supabase) return null;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await supabase.rpc('my_quota', { p_feature: feature });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  return {
    tier: row['tier'] === 'premium' ? 'premium' : 'free',
    remaining: typeof row['remaining'] === 'number' ? row['remaining'] : null,
    renewsOn: typeof row['resets_on'] === 'string' ? row['resets_on'] : '',
    offerPremium: row['offer_premium'] !== false,
    gift: row['gift'] === true,
    giftEndsOn: typeof row['gift_ends_on'] === 'string' ? row['gift_ends_on'] : null,
    newThisMonth:
      row['used_before'] === true && typeof row['monthly_left'] === 'number' ? row['monthly_left'] : 0,
  };
}

/** "1 de noviembre", from YYYY-MM-DD. */
export function renewalDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} de ${copy.quota.months[Number(match[2]) - 1]}`;
}
