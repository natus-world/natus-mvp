import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';
import { onlyMonthlySince, saveSynthesis } from './soulMap';
import { currentMatchFor, saveMatch } from './matches';
import { conversationFor } from './chat';
import type { MatchResult, SoulMapSynthesis } from '@/lib/schemas';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

const synthesis = {} as SoulMapSynthesis;
const result = { matched_modalities: [] } as unknown as MatchResult;
const map = (trigger: 'onboarding' | 'monthly' | 'base_data_changed', now: number) =>
  saveSynthesis({ synthesis, numerology: null, promptVersion: 'v', mode: 'server', latencyMs: 1, trigger, now });

describe('the monthly rewrite of the map (v1.2 M-02)', () => {
  it('keeps the paths and the conversation chosen before it', () => {
    const first = map('onboarding', 1);
    const match = saveMatch({ result, strategy: 'topical', usedFallback: false, synthesisId: first.id, now: 2 });
    const thread = conversationFor(first.id, 3);
    const second = map('monthly', 4);
    const third = map('monthly', 5);
    expect(onlyMonthlySince(first.id, third.id)).toBe(true);
    expect(currentMatchFor(third.id)?.id).toBe(match.id);
    expect(conversationFor(second.id, 6).id).toBe(thread.id);
  });

  it('does not carry them across a rewrite for changed birth data', () => {
    const first = map('onboarding', 1);
    saveMatch({ result, strategy: 'topical', usedFallback: false, synthesisId: first.id, now: 2 });
    const thread = conversationFor(first.id, 3);
    const changed = map('base_data_changed', 4);
    expect(currentMatchFor(changed.id)).toBeUndefined();
    expect(conversationFor(changed.id, 5).id).not.toBe(thread.id);
  });
});
