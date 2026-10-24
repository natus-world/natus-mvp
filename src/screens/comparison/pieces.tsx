import { useEffect, useState, type SVGProps } from 'react';
import { PLANET_GLYPHS, type GlyphPlanet } from '@/design/planet-glyphs';
import { SIGN_GLYPHS, type GlyphSign } from '@/design/zodiac-glyphs';
import { copy } from '@/i18n';

/**
 * What the comparison screens share (package 15, 16 Oct 2026): the glyphs
 * as outlines, the package's two line icons, and which layout is on.
 */

const DESK = '(min-width: 1024px)';

/** The desktop layout is a different composition, not the phone's stretched. */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESK).matches);
  useEffect(() => {
    const list = window.matchMedia(DESK);
    const on = () => setWide(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return wide;
}

export function firstNameOf(fullName: string | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/** «Desde septiembre», with the year when it is not this one. */
export function sinceLabel(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})/.exec(iso) : null;
  if (!m) return '';
  const month = copy.quota.months[Number(m[2]) - 1] ?? '';
  return copy.friends.since(Number(m[1]) === new Date().getFullYear() ? month : `${month} de ${m[1]}`);
}

/** The package's chevron and arrow: its own strokes, not the app's icon set. */
export function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The aspects' signs, drawn on the planets' grid (1000 units to the em,
 * baseline at 800) at the stroke weight of Noto Sans Symbols 300. Only the
 * five a comparison by sign can produce; any other has no sign drawn.
 */
const ASPECT_GLYPHS: Record<string, { advance: number; d: string }> = {
  trine: { advance: 760, d: 'M70 780H690L380 230Z' },
  square: { advance: 700, d: 'M110 290H590V760H110Z' },
  sextile: { advance: 700, d: 'M350 280V760M142 400L558 640M142 640L558 400' },
  conjunction: { advance: 700, d: 'M120 600a150 150 0 1 0 300 0a150 150 0 1 0 -300 0M376 494L600 270' },
  opposition: {
    advance: 760,
    d: 'M90 650a105 105 0 1 0 210 0a105 105 0 1 0 -210 0M460 390a105 105 0 1 0 210 0a105 105 0 1 0 -210 0M270 576L490 464',
  },
};

function isPlanet(body: string): body is GlyphPlanet {
  return body in PLANET_GLYPHS;
}

/** A planet's glyph inline with text, one em tall. Nothing for a body without one. */
export function BodyGlyph({ body, ...props }: { body: string } & SVGProps<SVGSVGElement>) {
  if (!isPlanet(body)) return null;
  const { advance, d } = PLANET_GLYPHS[body];
  return (
    <svg className="gli" viewBox={`0 0 ${advance} 1000`} aria-hidden="true" {...props}>
      <path d={d} transform="translate(0 800) scale(1 -1)" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function AspectGlyph({ type }: { type: string }) {
  const glyph = ASPECT_GLYPHS[type.toLowerCase()];
  if (!glyph) return null;
  return (
    <svg className="gli" viewBox={`0 0 ${glyph.advance} 1000`} aria-hidden="true">
      <path d={glyph.d} fill="none" stroke="currentColor" strokeWidth={48} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A planet's glyph centred on (x, y) at `size` user units, for the threads. */
export function GlyphAt({ body, x, y, size }: { body: string; x: number; y: number; size: number }) {
  if (!isPlanet(body)) {
    // The Ascendant and the rest have no glyph in the set: two letters instead.
    const short = body === 'Ascendant' ? 'AC' : body.slice(0, 2);
    return (
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" className="gl-tx">
        {short}
      </text>
    );
  }
  const { advance, d } = PLANET_GLYPHS[body];
  const s = size / 1000;
  return (
    <path
      className="gl"
      d={d}
      fillRule="evenodd"
      transform={`translate(${(x - (advance * s) / 2).toFixed(2)} ${(y + 355 * s).toFixed(2)}) scale(${s} ${-s})`}
    />
  );
}

/** A sign's glyph inline with text, one em tall (las dos cartas, 23 Oct 2026). */
export function SignGlyph({ sign }: { sign: string }) {
  if (!(sign in SIGN_GLYPHS)) return null;
  const { advance, d } = SIGN_GLYPHS[sign as GlyphSign];
  return (
    <svg className="gli" viewBox={`0 -200 ${advance} 1000`} aria-hidden="true">
      <path d={d} transform="translate(0 800) scale(1 -1)" fill="currentColor" />
    </svg>
  );
}
