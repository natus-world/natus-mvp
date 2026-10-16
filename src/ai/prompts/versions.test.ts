import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import FINGERPRINTS from './prompt-fingerprints.json' with { type: 'json' };
import {
  CHAT_PROMPT_VERSION,
  COMPARISON_PROMPT_VERSION,
  MATCH_PROMPT_VERSION,
  MEDITATION_PROMPT_VERSION,
  PROMPT_HISTORY,
  ROUTINE_PROMPT_VERSION,
  SOUL_MAP_PROMPT_VERSION,
} from './versions';

/**
 * Every change to a prompt bumps its version (CLAUDE.md). Nothing enforced it:
 * a prompt could change under an old version, and a Soul Map stored with that
 * version would then claim text it was never generated from.
 *
 * Each surface is fingerprinted from its own file plus `shared.ts`, which every
 * system prompt interpolates, plus any other local file it imports (such as
 * `chart-reading.ts`). Comment lines are dropped first, so explaining
 * the code does not count as changing the prompt; everything else does,
 * including the builders that write the user message.
 *
 * When this fails because a prompt changed: bump its version in `versions.ts`,
 * add a line to `PROMPT_HISTORY`, and add the new version with the hash the
 * failure prints to `prompt-fingerprints.json`. Old entries stay — they record
 * what each published version was.
 */

const SURFACES = [
  ['soul-map.ts', SOUL_MAP_PROMPT_VERSION],
  ['match.ts', MATCH_PROMPT_VERSION],
  ['chat.ts', CHAT_PROMPT_VERSION],
  ['meditation.ts', MEDITATION_PROMPT_VERSION],
  ['comparison.ts', COMPARISON_PROMPT_VERSION],
  ['routine.ts', ROUTINE_PROMPT_VERSION],
] as const;

function withoutComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .join('\n');
}

function read(file: string): string {
  return readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
}

/** Local prompt files a surface imports besides shared.ts and versions.ts. */
function localImports(file: string): string[] {
  const found = [...read(file).matchAll(/from '\.\/([\w-]+\.ts)'/g)].map((m) => m[1]!);
  return [...new Set(found)].filter((f) => f !== 'shared.ts' && f !== 'versions.ts');
}

function fingerprint(file: string): string {
  const extra = localImports(file).map((f) => `\n---\n${withoutComments(read(f))}`).join('');
  const text = `${withoutComments(read(file))}\n---\n${withoutComments(read('shared.ts'))}${extra}`;
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

const recorded: Record<string, string> = FINGERPRINTS;

describe('prompt versions', () => {
  it.each(SURFACES)('%s has not changed under version %s', (file, version) => {
    const actual = fingerprint(file);
    const known = recorded[version];
    expect(
      known,
      `${version} has no fingerprint. Add "${version}": "${actual}" to prompt-fingerprints.json.`,
    ).toBeDefined();
    expect(
      actual,
      `The prompt in ${file} changed but its version is still ${version}. Bump it in versions.ts, ` +
        `add a PROMPT_HISTORY line, and record "<new version>": "${actual}" in prompt-fingerprints.json.`,
    ).toBe(known);
  });

  it.each(SURFACES)('%s version %s is in PROMPT_HISTORY', (_file, version) => {
    expect(PROMPT_HISTORY.map((entry) => entry.version)).toContain(version);
  });
});
