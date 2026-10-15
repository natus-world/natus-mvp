/**
 * Where the navigation belongs. Onboarding, the landing and the signup are
 * linear — offering five destinations mid-flow invites someone to leave a form
 * half-answered — so the nav appears only once there is something to navigate
 * between.
 */
const NAV_ROUTES = [
  '/inicio',
  '/mapa',
  '/recomendaciones',
  '/rutina',
  '/cuenta',
  '/chat',
  '/meditaciones',
  '/biblioteca',
  '/comparacion',
];

/** Prefixes, not exact paths: the comparison flow has nested routes and losing
 *  the nav halfway through it strands the person on a sub-screen. */
export function showsNav(pathname: string, takeoverShown: boolean): boolean {
  if (takeoverShown) return false;
  return NAV_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
