import { supabase } from '@/supabase/client.ts';
import { read, write } from './db.ts';

/**
 * The admin funnel (agreed 15 Oct 2026), from the browser's side.
 *
 * Only the steps the browser is the one to see. The ones a row proves —
 * account created, map generated, first practice, first chat, a friend
 * accepted — are recorded by the database itself, and the ones about money
 * only by the server. `track_step` refuses anything else.
 *
 * Fire and forget: a funnel that fails must never be what stops a screen.
 * Nothing here carries content — a step, and on two of them a word from a
 * closed list.
 */

export type BrowserStep =
  | 'onboarding_started'
  | 'birth_data_done'
  | 'care_done'
  | 'paths_seen'
  | 'paywall_seen'
  | 'app_opened'
  | 'friend_invited';

export type PaywallPlace = 'chat' | 'meditation' | 'comparison' | 'profile';

type FirstTouch = { source: string | null; campaign: string | null };

/** The closed vocabulary the database accepts: lowercase, digits, `_.-`. */
export function tag(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || null;
}

/**
 * Keep where this browser first arrived from, if the link said. Campaigns
 * mark their links with `utm_source` and `utm_campaign`; until one does this
 * stays empty, and starts filling the day one does, with no code change.
 */
export function rememberFirstTouch(search: string = globalThis.location?.search ?? ''): void {
  if (read<FirstTouch | null>('first_touch', null)) return;
  const params = new URLSearchParams(search);
  const source = tag(params.get('utm_source'));
  const campaign = tag(params.get('utm_campaign'));
  if (source || campaign) write('first_touch', { source, campaign });
}

export function track(step: BrowserStep, detail?: PaywallPlace): void {
  if (!supabase) return;
  const touch = step === 'onboarding_started' ? read<FirstTouch | null>('first_touch', null) : null;
  void supabase
    .rpc('track_step', {
      p_step: step,
      ...(touch?.source ? { p_source: touch.source } : {}),
      ...(touch?.campaign ? { p_campaign: touch.campaign } : {}),
      ...(detail ? { p_detail: detail } : {}),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
