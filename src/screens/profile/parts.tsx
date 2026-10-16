import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The pieces of Perfil (package 11, 16 Oct 2026): the row icons, drawn in the
 * package's own thin line (1.1), and the glass row every list is made of.
 */

function Line({ children, width = 1.1 }: { children: ReactNode; width?: number }) {
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

export const RowIcon = {
  lock: (
    <Line>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Line>
  ),
  voice: (
    <Line>
      <path d="M4 6h16M4 12h10M4 18h7" />
    </Line>
  ),
  country: (
    <Line>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
    </Line>
  ),
  friends: (
    <Line>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="16.5" cy="10" r="2.6" />
      <path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6M14.5 15.2c2.6-.4 5 1 6 3.8" />
    </Line>
  ),
  plan: (
    <Line>
      <path d="M12 3.5l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7z" />
    </Line>
  ),
  memory: (
    <Line>
      <path d="M9 4.5a3.5 3.5 0 0 0-3.5 3.5 3 3 0 0 0-1 5.6A3.5 3.5 0 0 0 9 19.5V4.5zM15 4.5a3.5 3.5 0 0 1 3.5 3.5 3 3 0 0 1 1 5.6A3.5 3.5 0 0 1 15 19.5V4.5z" />
    </Line>
  ),
  download: (
    <Line>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Line>
  ),
};

export const Chevron = (
  <Line width={1.3}>
    <path d="M9 6l6 6-6 6" />
  </Line>
);

export const Tick = (
  <Line width={2}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Line>
);

type RowProps = {
  icon: ReactNode;
  title: string;
  line?: string | undefined;
  /** A route, or a handler: the row is a link or a button. */
  to?: string | undefined;
  onClick?: (() => void) | undefined;
};

/** One row of a glass list: icon, title, a line under it, the chevron. */
export function Row({ icon, title, line, to, onClick }: RowProps) {
  const body = (
    <>
      <span className="ic">{icon}</span>
      <span className="tx">
        <span className="t1">{title}</span>
        {line && <span className="t2">{line}</span>}
      </span>
      <span className="fl-ch">{Chevron}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="fila">
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className="fila" onClick={onClick}>
      {body}
    </button>
  );
}

/** «Tus datos *son tuyos*»: a title whose second half is in italics. */
export function Title({
  lead,
  emphasis,
  tail,
  as = 'h1',
}: {
  lead: string;
  emphasis: string;
  tail?: string;
  as?: 'h1' | 'h2';
}) {
  const Tag = as;
  return (
    <Tag className="t">
      {lead}
      <em>{emphasis}</em>
      {tail}
    </Tag>
  );
}
