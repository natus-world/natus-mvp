import { voiceRange } from '@/ai/voice';
import type { MeditationVoice } from '@/store/preferences';

/**
 * Where each passage's recording comes from (owner, 29 Oct 2026): the first
 * few are asked for at once, so the practice can begin within seconds, and
 * the rest straight after, while it plays. A passage whose recording never
 * arrives answers null and is read by the phone's own voice.
 */
export const FIRST_PASSAGES = 3;

export type VoiceSource = {
  /** The recording of passage `index` (0-based, spoken passages only), or null. */
  urlFor: (index: number) => Promise<string | null>;
  /** Settles once the first passages are known, true when they came. */
  ready: Promise<boolean>;
};

export function voiceSource(scriptId: string, voice: MeditationVoice): VoiceSource {
  const first = voiceRange(scriptId, voice, 0, FIRST_PASSAGES);
  const rest = first.then((got) =>
    got && got.total > FIRST_PASSAGES ? voiceRange(scriptId, voice, FIRST_PASSAGES, got.total) : null,
  );
  const pick = async (index: number) => {
    const range = index < FIRST_PASSAGES ? await first : await rest;
    if (!range) return null;
    return range.urls[index - range.from] ?? null;
  };
  return { urlFor: pick, ready: first.then((got) => got !== null && got.urls.length > 0) };
}
