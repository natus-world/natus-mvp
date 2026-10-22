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
 * Nothing here carries content — a step, and on three of them a word from a
 * closed list.
 */

export type BrowserStep =
  | 'onboarding_started'
  | 'birth_data_done'
  | 'need_done'
  | 'openness_done'
  | 'signup_seen'
  | 'care_done'
  | 'paths_seen'
  | 'paywall_seen'
  | 'app_opened'
  | 'friend_invited'
  | 'birth_city_not_found';

export type PaywallPlace = 'chat' | 'meditation' | 'comparison' | 'profile' | 'welcome' | 'tip';

/** Whether the hour was given on the birth step (owner, 22 Oct 2026). */
export type BirthDetail = 'con-hora' | 'sin-hora' | 'solo-numeros';

type Detail = PaywallPlace | BirthDetail;

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
 * The in-app browser of a social network, read from the user agent, or
 * `navegador` for any other. A closed list: the database refuses the rest.
 */
export function browserKind(ua: string = globalThis.navigator?.userAgent ?? ''): string {
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'tiktok';
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/LinkedInApp/i.test(ua)) return 'linkedin';
  return 'navegador';
}

/** Phone, tablet or computer, read from the user agent. */
export function deviceKind(ua: string = globalThis.navigator?.userAgent ?? ''): string {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'movil';
  return 'computador';
}

/**
 * Where somebody came from when the link said nothing (owner, 22 Oct 2026):
 * the in-app browser first, then the page that sent them. Only the network's
 * name, never the address. Natus's own pages and the sign-in round trip are
 * not an origin.
 */
export function guessSource(ua: string, referrer: string): string | null {
  const kind = browserKind(ua);
  if (kind !== 'navegador') return kind;
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  const known: [RegExp, string][] = [
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)(facebook\.com|fb\.me|fb\.com)$/, 'facebook'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
    [/(^|\.)threads\.(net|com)$/, 'threads'],
    [/(^|\.)linkedin\.com$/, 'linkedin'],
    [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
    [/(^|\.)youtube\.com$/, 'youtube'],
    [/(^|\.)natus\.world$/, 'web-natus'],
  ];
  if (host === 'app.natus.world' || host.endsWith('supabase.co') || host === 'accounts.google.com') return null;
  for (const [pattern, name] of known) if (pattern.test(host)) return name;
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google';
  return host ? 'otro' : null;
}

/**
 * Keep where this browser first arrived from. Campaigns mark their links
 * with `utm_source` and `utm_campaign`; without them, the in-app browser or
 * the page that sent the person (`guessSource`). Kept once, even when empty,
 * so the way back from the sign-in is never taken for an origin.
 */
export function rememberFirstTouch(
  search: string = globalThis.location?.search ?? '',
  ua: string = globalThis.navigator?.userAgent ?? '',
  referrer: string = globalThis.document?.referrer ?? '',
): void {
  if (read<FirstTouch | null>('first_touch', null)) return;
  const params = new URLSearchParams(search);
  const campaign = tag(params.get('utm_campaign'));
  const source = tag(params.get('utm_source')) ?? (campaign ? null : guessSource(ua, referrer));
  write('first_touch', { source, campaign });
}

export function track(step: BrowserStep, detail?: Detail): void {
  if (!supabase) return;
  const touch = step === 'onboarding_started' ? read<FirstTouch | null>('first_touch', null) : null;
  // The first step says the kind of device and browser (owner, 22 Oct 2026).
  const said = step === 'onboarding_started' ? `${deviceKind()}-${browserKind()}` : detail;
  void supabase
    .rpc('track_step', {
      p_step: step,
      ...(touch?.source ? { p_source: touch.source } : {}),
      ...(touch?.campaign ? { p_campaign: touch.campaign } : {}),
      ...(said ? { p_detail: said } : {}),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
