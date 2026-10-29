import { read, write } from './db';

/**
 * The `preferences` row of PDR 5.2.
 *
 * The language is honest about what it does: the demo's interface is written
 * in Spanish, so choosing English records the preference without translating
 * anything. PDR 11.3 lists the language choice as a data right alongside
 * export and deletion, which is why it is stored at all rather than being a UI
 * toggle.
 *
 * The two volumes are here rather than in component state because PDR 9.5
 * expects them to survive a reload — someone who turned the bed down did so
 * for a reason that is still true tomorrow.
 */

export type Locale = 'es' | 'en';

/** The meditation's voice (owner, 29 Oct 2026): a woman's or a man's. */
export type MeditationVoice = 'mujer' | 'hombre';

export type Preferences = {
  locale: Locale;
  voice_volume: number;
  bed_volume: number;
  /**
   * v1.2 M-01: when the person agreed that Natus learns from what they write
   * (ISO), or null. Express consent, Ley 21.719; withdrawing it pauses the
   * memory without deleting it.
   */
  memory_consent_at: string | null;
  meditation_voice: MeditationVoice;
};

const DEFAULT: Preferences = {
  locale: 'es',
  voice_volume: 1,
  bed_volume: 0.45,
  memory_consent_at: null,
  meditation_voice: 'mujer',
};

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

export function getPreferences(): Preferences {
  const stored = read<Partial<Preferences>>('preferences', DEFAULT);
  return {
    locale: stored.locale === 'en' ? 'en' : 'es',
    voice_volume: clampVolume(stored.voice_volume, DEFAULT.voice_volume),
    bed_volume: clampVolume(stored.bed_volume, DEFAULT.bed_volume),
    memory_consent_at: typeof stored.memory_consent_at === 'string' ? stored.memory_consent_at : null,
    meditation_voice: stored.meditation_voice === 'hombre' ? 'hombre' : 'mujer',
  };
}

export function setMeditationVoice(voice: MeditationVoice): Preferences {
  return patch({ meditation_voice: voice });
}

export function setMemoryConsent(given: boolean, now = new Date()): Preferences {
  return patch({ memory_consent_at: given ? now.toISOString() : null });
}

export function setLocale(locale: Locale): Preferences {
  return patch({ locale });
}

export function setVolumes(volumes: { voice?: number; bed?: number }): Preferences {
  return patch({
    ...(volumes.voice === undefined ? {} : { voice_volume: clampVolume(volumes.voice, 1) }),
    ...(volumes.bed === undefined ? {} : { bed_volume: clampVolume(volumes.bed, 0.45) }),
  });
}

function patch(changes: Partial<Preferences>): Preferences {
  const next: Preferences = { ...getPreferences(), ...changes };
  write('preferences', next);
  return next;
}
