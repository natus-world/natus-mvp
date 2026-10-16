import type { ReactNode } from 'react';
import { GLYPH_CENTRAL } from '@/design/zodiac-glyphs';

/**
 * The small marks of the full chart (package 05): a glyph set inline in text,
 * the aspects' own line icons, the elements' triangles, close and back. The
 * package draws these on a 20 grid with a 1.3 stroke.
 */

/** A glyph outline set in a line of text, one em tall, centred as the package's characters were. */
export function GlyphMark({ d, advance, evenOdd = false }: { d: string; advance: number; evenOdd?: boolean }) {
  const top = GLYPH_CENTRAL + 500;
  return (
    <svg
      className="glifo"
      viewBox={`0 0 ${advance} 1000`}
      style={{ width: `${advance / 1000}em` }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} transform={`translate(0 ${top}) scale(1 -1)`} fill="currentColor" fillRule={evenOdd ? 'evenodd' : undefined} />
    </svg>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export type AspectKind = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export function AspectIcon({ type }: { type: AspectKind }) {
  switch (type) {
    case 'conjunction':
      return (
        <Line>
          <circle cx="8" cy="12" r="4" />
          <path d="M11 9l5-5" />
        </Line>
      );
    case 'opposition':
      return (
        <Line>
          <circle cx="5.5" cy="14.5" r="2.8" />
          <circle cx="14.5" cy="5.5" r="2.8" />
          <path d="M7.5 12.5l5-5" />
        </Line>
      );
    case 'trine':
      return (
        <Line>
          <path d="M10 3.5 17 16H3Z" />
        </Line>
      );
    case 'square':
      return (
        <Line>
          <rect x="4" y="4" width="12" height="12" />
        </Line>
      );
    case 'sextile':
      return (
        <Line>
          <path d="M10 3v14M4 6.5l12 7M4 13.5l12-7" />
        </Line>
      );
  }
}

/** The elements as the alchemical triangles, for the labels of a point. */
export function ElementTriangle({ element }: { element: 'fire' | 'earth' | 'air' | 'water' }) {
  const d = {
    fire: 'M10 3.5 17 16H3Z',
    water: 'M10 16.5 3 4h14Z',
    air: 'M10 3.5 17 16H3Z M5.6 11.3h8.8',
    earth: 'M10 16.5 3 4h14Z M5.6 8.7h8.8',
  }[element];
  return (
    <Line>
      <path d={d} />
    </Line>
  );
}

export function CloseMark() {
  return (
    <Line>
      <path d="M5 5l10 10M15 5 5 15" />
    </Line>
  );
}

/** «‹», before «Tu mapa». */
export function BackChevron() {
  return (
    <Line>
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </Line>
  );
}
