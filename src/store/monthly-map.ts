import { generateSoulMap } from '@/ai/soul-map';
import { SOUL_MAP_PROMPT_VERSION } from '@/ai/prompts/versions';
import { activeProfile, attachSoulMapToClient } from './account';
import { activeHighSeverityEvent } from './crisis';
import { hasRemoteIdentity } from './hydrate';
import { attachSoulMap } from './session';
import { currentSynthesis, saveSynthesis } from './soulMap';

/**
 * v1.2 M-02: the Soul Map is written again once a month (Sonnet), with the
 * same data, so it keeps up with the person. Only the map: the therapies, the
 * routine and the conversation stay (`onlyMonthlySince`). The person sees the
 * date of the last version in Carta and can read the one before.
 *
 * Background work, started when the app opens; never while a crisis signal is
 * active, and never twice at once.
 */
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
let running = false;

export async function refreshMapMonthly(now = Date.now()): Promise<boolean> {
  if (running || !hasRemoteIdentity() || activeHighSeverityEvent(now)) return false;
  const current = currentSynthesis();
  const profile = activeProfile();
  if (!current || !profile || now - current.created_at < MONTH_MS) return false;
  running = true;
  try {
    const result = await generateSoulMap({ draft: profile.draft, numerology: current.numerology, trigger: 'monthly' });
    const stored = saveSynthesis({
      synthesis: result.value,
      numerology: current.numerology,
      promptVersion: SOUL_MAP_PROMPT_VERSION,
      mode: result.mode,
      latencyMs: result.latencyMs,
      model: result.model,
      trigger: 'monthly',
    });
    attachSoulMap(stored.id);
    attachSoulMapToClient(stored.id);
    return true;
  } catch {
    return false;
  } finally {
    running = false;
  }
}
