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
