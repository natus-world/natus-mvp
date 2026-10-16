import type { ReactNode } from 'react';

/**
 * The window the app lives in: the whole viewport, at every width (16 Oct
 * 2026). Below 1024px it is the phone layout with the floating tab bar; from
 * 1024px it is the desktop layout, full screen with the rail on the left —
 * no longer a phone drawn on a laptop.
 *
 * Fixed height, so a screen scrolls inside itself and the header, the tab bar
 * and the photograph stay where they are.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return <div className="relative h-dvh w-full overflow-hidden bg-noche">{children}</div>;
}
