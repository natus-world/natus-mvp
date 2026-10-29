import { supabase } from '@/supabase/client';
import type { MeditationVoice } from '@/store/preferences';

/**
 * Google's voice for a meditation (owner, 29 Oct 2026), asked of the
 * `meditation-voice` function a range of passages at a time: the first few,
 * so the practice can start, then the rest while it plays.
 *
 * Every failure answers null — no session, no voice configured, the month's
 * ceiling reached, Google down — and the phone's own voice reads instead, as
 * it always has. Nothing here is worth stopping a practice over.
 */
export type VoiceRange = { from: number; urls: string[]; total: number };

const TIMEOUT_MS = 90_000;

export async function voiceRange(
  scriptId: string,
  voice: MeditationVoice,
  from: number,
  to: number,
): Promise<VoiceRange | null> {
  if (!supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return null;
    const { data, error } = await supabase.functions.invoke<VoiceRange>('meditation-voice', {
      body: { scriptId, voice, from, to },
      timeout: TIMEOUT_MS,
    });
    if (error || !data || !Array.isArray(data.urls)) return null;
    return data;
  } catch {
    return null;
  }
}
