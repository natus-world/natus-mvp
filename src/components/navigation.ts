import { copy } from '@/i18n';
import { PATHS } from './routes';

/**
 * Where the navigation belongs. Onboarding, the landing and the signup are
 * linear — offering five destinations mid-flow invites someone to leave a form
 * half-answered — so the nav appears only once there is something to navigate
 * between.
 */
const NAV_ROUTES: readonly string[] = Object.values(PATHS);

function isDestination(pathname: string): boolean {
  return NAV_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Prefixes, not exact paths: the comparison flow has nested routes and losing
 *  the nav halfway through it strands the person on a sub-screen. */
export function showsNav(pathname: string, takeoverShown: boolean): boolean {
  if (takeoverShown) return false;
  return isDestination(pathname);
}

export function showsProfile(pathname: string, takeoverShown: boolean): boolean {
  return takeoverShown || isDestination(pathname);
}

/**
 * Screens opened from another (package, 16 Oct 2026): the header shows
 * «Volver» instead of NATUS, and on the phone neither the initial nor the
 * tab bar. On desktop the rail stays, with the tab they hang from lit.
 * Returns that tab, or null for a sub-screen that hangs from none.
 */
type SubScreenOptions = {
  /** In place of «Volver»: «Tu mapa» on the full chart. */
  backLabel?: string;
  /** The package keeps the initial and the tab bar on the phone. */
  keepsPhoneChrome?: boolean;
};

const SUB_SCREENS: readonly [prefix: string, parent: string | null, backOnDesktop: boolean, options?: SubScreenOptions][] = [
  // Carta completa (package 05): «‹ Tu mapa» in place of NATUS, on the phone
  // and the desktop, with the initial and the tab bar still there.
  [PATHS.fullChart, PATHS.chart, true, { backLabel: copy.fullChart.back, keepsPhoneChrome: true }],
  [PATHS.meditations, PATHS.today, true],
  [PATHS.library, PATHS.today, true],
  [PATHS.comparison, PATHS.today, true],
  ['/amigos', PATHS.today, true],
  // Perfil: «Volver» on the phone, NATUS on desktop, as the package draws it.
  [PATHS.profile, null, false],
];

export function subScreenOf(
  pathname: string,
): ({ parent: string | null; backOnDesktop: boolean } & SubScreenOptions) | null {
  const hit = SUB_SCREENS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit ? { parent: hit[1], backOnDesktop: hit[2], ...hit[3] } : null;
}
