import type { ReactNode } from 'react';

/**
 * The icons of package 01 (Entrada, 16 Oct 2026), drawn as the package draws
 * them: a 24 grid, a thin stroke that grows with the icon, round ends. Sized
 * by the CSS of the piece that holds them.
 */
function Icon({ width = 0.85, children }: { width?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function YouIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20c.9-3.8 3.9-6 7.5-6s6.6 2.2 7.5 6" />
    </Icon>
  );
}

export function BirthIcon() {
  return (
    <Icon>
      <path d="M2.5 17.5h19" />
      <path d="M6.5 17.5a5.5 5.5 0 0 1 11 0" />
      <path d="M12 4v2.4M4.9 7.4l1.7 1.7M19.1 7.4l-1.7 1.7" />
    </Icon>
  );
}

export function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.2 12h17.6M12 3.2c2.6 2.6 3.6 5.6 3.6 8.8s-1 6.2-3.6 8.8c-2.6-2.6-3.6-5.6-3.6-8.8s1-6.2 3.6-8.8z" />
    </Icon>
  );
}

export function PinIcon() {
  return (
    <Icon>
      <path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Icon>
  );
}

export function ForwardIcon() {
  return (
    <Icon width={1.3}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function TickIcon() {
  return (
    <Icon width={1.8}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function EnvelopeIcon() {
  return (
    <Icon>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </Icon>
  );
}

export function LockIcon() {
  return (
    <Icon width={1.1}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Icon>
  );
}

/** Google's own mark, in its colours, on the button that opens Google. */
export function GoogleMark() {
  return (
    <svg className="g" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
