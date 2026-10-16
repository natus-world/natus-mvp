import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SunriseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 17.5h18M7 20.5h10" />
      <path d="M7 17.5a5 5 0 0 1 10 0" />
      <path d="M12 8.5v2M6.2 11.2l1.3 1.3M17.8 11.2l-1.3 1.3M3.5 15h1.6M18.9 15h1.6" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" />
    </Icon>
  );
}

export function ConstellationIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 18.5 10.5 12l6.5 2.5M10.5 12 17.5 5" />
      <circle cx="6" cy="18.5" r="1.4" />
      <circle cx="10.5" cy="12" r="1.4" />
      <circle cx="17" cy="14.5" r="1.4" />
      <circle cx="17.5" cy="5" r="1.4" />
    </Icon>
  );
}

export function SproutIcon({ ground = true, ...props }: IconProps & { ground?: boolean }) {
  return (
    <Icon {...props}>
      {ground && <path d="M7 20.5h10" />}
      <path d="M12 20.5V11" />
      <path d="M12 14c-.4-3-2.6-4.8-6-4.8.2 3 2.4 4.8 6 4.8Z" />
      <path d="M12 11.5c.4-3 2.6-4.8 6-4.8-.2 3-2.4 4.8-6 4.8Z" />
    </Icon>
  );
}

export function NotebookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.8C9.6 5.2 6.6 4.8 3.5 5.6v12.6c3.1-.8 6.1-.4 8.5 1.2" />
      <path d="M12 6.8c2.4-1.6 5.4-2 8.5-1.2v12.6c-3.1-.8-6.1-.4-8.5 1.2Z" />
      <path d="M12 6.8v12.6" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v2.5" />
    </Icon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4.5h12a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7L7 20v-3H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 12.5h5" />
    </Icon>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c-2.3 2.4-3.4 5.2-3.4 8.5s1.1 6.1 3.4 8.5M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </Icon>
  );
}

export function WaterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5h17L12 19.5Z" />
      <path d="M7.4 9c1.1-.7 2.2-.7 3.3 0s2.2.7 3.3 0 2.2-.7 3.3 0M9.6 12.5c.8-.5 1.6-.5 2.4 0s1.6.5 2.4 0" />
    </Icon>
  );
}

export function DropIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5c-3.6 4.6-5.5 7.7-5.5 10.4a5.5 5.5 0 0 0 11 0c0-2.7-1.9-5.8-5.5-10.4Z" />
    </Icon>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m10 7.5 4.5 4.5-4.5 4.5" />
    </Icon>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  );
}
