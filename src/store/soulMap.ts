import { read, write } from './db';
import type { Numerology, SoulMapSynthesis } from '@/lib/schemas';
import type { AiRunMode } from '@/ai/client';
import type { SynthesisTrigger } from '@/lib/model-input';

/**
 * The current synthesis. Mirrors `soul_map_syntheses` with its
 * `one_current_synthesis` unique index: exactly one row is current, and
 * regenerating supersedes rather than deletes.
 *
 * PDR 6.5 also fixes when regeneration happens — a chart uploaded after
 * onboarding, an edited presenting need, or an admin forcing a re-run on a
 * new prompt version. Never automatically per interaction; that is phase 2.
 */

export type StoredSynthesis = {
  id: string;
  prompt_version: string;
  synthesis: SoulMapSynthesis;
  numerology: Numerology | null;
  mode: AiRunMode;
  latency_ms: number;
  model: string | null;
  trigger: SynthesisTrigger;
  created_at: number;
  is_current: boolean;
};

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `synthesis-${Math.trunc(performance.now())}`;
}

function withCurrentMode(stored: StoredSynthesis): StoredSynthesis {
  const mode = (stored.synthesis as { detected_mode?: string }).detected_mode;
  return {
    ...stored,
    model: stored.model ?? null,
    trigger: stored.trigger ?? 'onboarding',
    synthesis:
      mode === 'exploracion' ? { ...stored.synthesis, detected_mode: 'abierto' } : stored.synthesis,
  };
}

export function listSyntheses(): StoredSynthesis[] {
  return read<StoredSynthesis[]>('soul_map_synthesis', []).map(withCurrentMode);
}

export function currentSynthesis(): StoredSynthesis | undefined {
  return listSyntheses().find((s) => s.is_current);
}

export function saveSynthesis(input: {
  synthesis: SoulMapSynthesis;
  numerology: Numerology | null;
  promptVersion: string;
  mode: AiRunMode;
  latencyMs: number;
  model?: string | null;
  trigger?: SynthesisTrigger;
  now?: number;
}): StoredSynthesis {
  const now = input.now ?? Date.now();
  const record: StoredSynthesis = {
    id: newId(),
    prompt_version: input.promptVersion,
    synthesis: input.synthesis,
    numerology: input.numerology,
    mode: input.mode,
    latency_ms: input.latencyMs,
    model: input.model ?? null,
    trigger: input.trigger ?? 'onboarding',
    created_at: now,
    is_current: true,
  };

  const superseded = listSyntheses().map((s) => ({ ...s, is_current: false }));
  write('soul_map_synthesis', [...superseded, record]);
  return record;
}
