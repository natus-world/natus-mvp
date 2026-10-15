import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MOCKUP_PALETTE = {
  '--natus-noche': '#0b120e',
  '--natus-verde': '#1e3a2b',
  '--natus-crema': '#e8dcc8',
  '--natus-blanco-calido': '#f5efe6',
  '--natus-dorado': '#c9a876',
  '--natus-tierra': '#8b6f52',
  '--natus-error': '#e2b393',
  '--natus-tinta': '#ece2d0',
  '--natus-tinta-2': 'rgb(236 226 208 / 0.65)',
  '--natus-tinta-3': 'rgb(236 226 208 / 0.45)',
} as const;

/** Mockup: rgba(255,255,255,0.08 / 0.15 / 0.13). Alpha is what matters. */
const MOCKUP_GLASS_ALPHA = {
  '--glass-bg': '0.08',
  '--glass-border': '0.15',
  '--glass-hover': '0.13',
} as const;

const MOCKUP_GEOMETRY = {
  '--radius-frame': '48px',
  '--radius-cta': '27px',
  '--radius-option': '14px',
  '--h-cta': '54px',
  '--h-option': '52px',
  '--radius-card': '24px',
  '--h-pill': '36px',
  '--h-tab-bar': '74px',
  '--tab-bar-gap': '12px',
  '--touch': '44px',
  '--glass-blur-card': '24px',
  '--glass-blur-bar': '20px',
  '--glass-saturate': '1.4',
  '--glass-bar': 'rgb(16 20 18 / 0.72)',
  '--ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/**
 * Tokens this demo adds that have no counterpart in the mockup. Kept apart so
 * MOCKUP_GEOMETRY keeps meaning exactly one thing: fidelity to the design.
 */
const DEMO_CHROME = {
  '--top-inset': '62px',
  '--bottom-inset': '98px',
} as const;

function readTokens(): Map<string, string> {
  const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim().toLowerCase());
  }
  return tokens;
}

describe('design tokens match the interface guide', () => {
  const tokens = readTokens();

  it.each(Object.entries(MOCKUP_PALETTE))('%s is %s', (name, expected) => {
    expect(tokens.get(name)).toBe(expected);
  });

  it.each(Object.entries(MOCKUP_GLASS_ALPHA))('%s carries alpha %s', (name, alpha) => {
    const value = tokens.get(name);
    expect(value, `${name} is not defined`).toBeDefined();
    // Accept either rgb(255 255 255 / a) or rgba(255,255,255,a).
    expect(value).toMatch(/^rgba?\(\s*255[\s,]+255[\s,]+255\s*[/,]\s*([\d.]+)\s*\)$/);
    expect(value?.match(/([\d.]+)\s*\)$/)?.[1]).toBe(alpha);
  });

  it.each(Object.entries(MOCKUP_GEOMETRY))('%s is %s', (name, expected) => {
    expect(tokens.get(name)).toBe(expected);
  });

  it.each(Object.entries(DEMO_CHROME))('%s is %s (demo chrome, not from the mockup)', (name, expected) => {
    expect(tokens.get(name)).toBe(expected);
  });

  it('has no red: errors are warm', () => {
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.includes('.test.')) {
          const text = readFileSync(full, 'utf8');
          for (const hit of text.matchAll(/\balerta\b|#e05a5a|\b(?:text|bg|border)-red-\d+/gi)) {
            found.push(`${full}: ${hit[0]}`);
          }
        }
      }
    };
    walk(join(__dirname, '..'));
    expect(found).toEqual([]);
  });
});
