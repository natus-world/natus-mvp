import type { ReactNode, SVGProps } from 'react';

/**
 * The thin-line set of the branding package (16 Oct 2026): a 24 grid, a
 * 1.25px stroke that never thickens as the icon grows, round caps. Four
 * pieces — circle, arc, straight line, point — and one filled point per
 * symbol; the other points are open beads, filled with the tone behind them
 * (`.bead`, in primitives.css). Copied from `iconos/` of the package, path
 * for path.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function BrandIcon({ size = 20, children, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `brand-icon ${className}` : 'brand-icon'}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Hoy: a sun rising over the horizon, rays, an axis and a point of light. */
export function TodayIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M1.5 17.5h21" />
      <path d="M7 17.5a5 5 0 0 1 10 0" />
      <path d="M9.5 17.5a2.5 2.5 0 0 1 5 0" />
      <path d="M12 10.5V6.6M16.02 11.77l1.43-2.05M7.98 11.77 6.55 9.72M18.58 15.11l1.88-.69M5.42 15.11l-1.88-.69M12 19.6V22.2" />
      <circle fill="currentColor" stroke="none" cx="12" cy="4.5" r=".95" />
    </BrandIcon>
  );
}

/** Carta, option B «Horizonte»: an open circle with the chart's horizon. */
export function ChartTabIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M17.14 5.87A8 8 0 1 1 14.07 4.27" />
      <path d="M1.5 12h21" />
      <path d="M6.86 18.13 19.52 14.74" />
      <path d="M12 12 9.2 7.2" />
      <circle className="bead" cx="19.52" cy="14.74" r="1.1" />
      <circle className="bead" cx="8.6" cy="6.2" r="1.05" />
      <circle fill="currentColor" stroke="none" cx="6.86" cy="18.13" r="1.1" />
    </BrandIcon>
  );
}

/** Caminos: five lines leaving one point (you) and an arc across them. */
export function PathsIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <circle fill="currentColor" stroke="none" cx="12" cy="19.6" r="1.2" />
      <path d="M7.02 15.42A6.5 6.5 0 0 1 16.98 15.42" />
      <path d="M12 17V3.7M13.1 17.2 17.5 8.2M10.9 17.2 6.5 8.2M13.99 17.9 21.19 12.29M10.01 17.9 2.81 12.29" />
      <circle className="bead" cx="12" cy="2.6" r="1" />
    </BrandIcon>
  );
}

/** Tu rutina: a spiral inward with the light at its centre — coming back to you. */
export function RoutineIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M7.96 12.42L8.03 12.13L8.12 11.84L8.25 11.57L8.41 11.30L8.59 11.05L8.80 10.81L9.03 10.59L9.29 10.39L9.57 10.22L9.87 10.07L10.19 9.95L10.52 9.86L10.86 9.81L11.21 9.78L11.57 9.80L11.92 9.84L12.28 9.92L12.63 10.04L12.97 10.20L13.30 10.38L13.61 10.61L13.90 10.86L14.17 11.15L14.42 11.46L14.63 11.80L14.81 12.17L14.96 12.55L15.07 12.96L15.15 13.38L15.18 13.80L15.17 14.24L15.11 14.68L15.01 15.11L14.87 15.54L14.69 15.96L14.46 16.37L14.19 16.75L13.88 17.11L13.53 17.44L13.15 17.75L12.73 18.01L12.29 18.24L11.82 18.42L11.32 18.56L10.81 18.66L10.29 18.70L9.75 18.69L9.22 18.63L8.68 18.51L8.15 18.34L7.64 18.12L7.14 17.84L6.67 17.52L6.22 17.14L5.81 16.72L5.44 16.25L5.11 15.74L4.83 15.20L4.60 14.62L4.42 14.02L4.31 13.39L4.25 12.75L4.26 12.10L4.33 11.44L4.46 10.78L4.67 10.13L4.94 9.50L5.27 8.89L5.67 8.31L6.12 7.76L6.64 7.25L7.21 6.79L7.83 6.38L8.49 6.03L9.20 5.74L9.93 5.52L10.70 5.38L11.49 5.30L12.29 5.30L13.09 5.39L13.90 5.55L14.69 5.79L15.47 6.12L16.22 6.52L16.94 7.00L17.62 7.55L18.24 8.18L18.81 8.87L19.32 9.63L19.75 10.44" />
      <circle fill="currentColor" stroke="none" cx="10.81" cy="13.35" r="1.05" />
      <circle className="bead" cx="5.44" cy="16.25" r="1.05" />
    </BrandIcon>
  );
}

/** Bitácora: a quill with its barbs and the point of ink where it writes. */
export function JournalIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M19 4.5C13.5 4.8 8.6 9.2 8.2 15.8 14 15.2 18.6 10.6 19 4.5Z" />
      <path d="M5.5 18.5 16 8" />
      <path d="M10.83 13.18 9.63 10.98M12.55 11.45 11.35 9.25M14.28 9.73 13.08 7.53" />
      <circle fill="currentColor" stroke="none" cx="4.2" cy="19.8" r=".95" />
    </BrandIcon>
  );
}

/** Chat: a bubble of one arc with two lines of text. */
export function ChatTabIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M5.07 15A8 8 0 1 1 8 17.93L4.6 20.4Z" />
      <path d="M8.5 9.4h7M8.5 12.7h4.5" />
    </BrandIcon>
  );
}

/** Meditaciones, on Hoy. */
export function MeditationsIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <circle cx="12" cy="4.5" r="2.1" />
      <path d="M11 6.5V8M13 6.5V8" />
      <path d="M11 8C9.2 8.4 7.9 9.3 7.5 10.8M13 8C14.8 8.4 16.1 9.3 16.5 10.8" />
      <path d="M7.5 10.8C6.9 12.2 5.9 13.5 5.6 14.6 5.4 15.6 6.3 16.4 7.8 16.6M16.5 10.8C17.1 12.2 18.1 13.5 18.4 14.6 18.6 15.6 17.7 16.4 16.2 16.6" />
      <path d="M3.2 18.6C7.2 16.2 16.8 16.2 20.8 18.6 16.8 20.8 7.2 20.8 3.2 18.6Z" />
    </BrandIcon>
  );
}

/** Comparar cartas, on Hoy. */
export function CompareIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <circle cx="6.6" cy="7.4" r="2.5" />
      <circle cx="17.4" cy="7.4" r="2.5" />
      <path d="M5.5 9.8V11.8M7.7 9.8V11.8M16.3 9.8V11.8M18.5 9.8V11.8" />
      <path d="M2 20.5V15.2C2 13.2 3.4 12.2 5.5 11.8M7.7 11.8C9.8 12.2 11 13.6 12 15.6 13 13.6 14.2 12.2 16.3 11.8M18.5 11.8C20.6 12.2 22 13.2 22 15.2V20.5" />
      <circle fill="currentColor" stroke="none" cx="12" cy="18" r="1" />
    </BrandIcon>
  );
}
