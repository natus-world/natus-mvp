import { createBed, type Bed } from './bed';
import { webSpeechProvider, type SpeechHandle } from './tts';
import { recordedVoiceProvider } from './recorded-voice';
import type { VoiceSource } from './voice-source';
import { estimateDurationMs, parseSsml, type SsmlSegment } from '@/lib/ssml';
import type { BedTrack } from '@/lib/schemas';

/**
 * Voice and bed, on two independent volumes.
 *
 * PDR 9.5 asks for two gain nodes. The bed gets one. The voice does not,
 * because SpeechSynthesis output never enters the audio graph — its level is
 * set per utterance instead, read fresh at the start of each segment so moving
 * the slider mid-practice takes effect on the next sentence.
 *
 * The AudioContext is created on the play gesture, not before: browsers
 * suspend one built without a user interaction, and a bed that silently never
 * starts is a hard thing to notice in a demo.
 */

export type PlayerState = 'idle' | 'playing' | 'finished';

export type PlayerEvents = {
  onSegment?: (index: number, total: number, segment: SsmlSegment) => void;
  onState?: (state: PlayerState) => void;
  onError?: (reason: string) => void;
};

export type MeditationPlayer = {
  play: () => void;
  stop: () => void;
  setVoiceVolume: (value: number) => void;
  setBedVolume: (value: number) => void;
  totalMs: number;
};

export function isPlaybackAvailable(): boolean {
  return webSpeechProvider.isAvailable();
}

export function createPlayer(input: {
  ssml: string;
  /** The segment to begin at (a pause goes on from where it was, QA-31). */
  from?: number;
  bed: BedTrack | undefined;
  /** Google's recordings (owner, 29 Oct 2026); absent, the phone's voice reads. */
  voice?: VoiceSource | null;
  voiceVolume: number;
  bedVolume: number;
  events?: PlayerEvents;
}): MeditationPlayer {
  const events = input.events ?? {};
  let voiceVolume = input.voiceVolume;
  let bedVolume = input.bedVolume;

  let ctx: AudioContext | null = null;
  let bed: Bed | null = null;
  let speech: SpeechHandle | null = null;

  const teardown = () => {
    speech?.stop();
    speech = null;
    bed?.stop();
    bed = null;
    void ctx?.close();
    ctx = null;
  };

  return {
    totalMs: estimateDurationMs(parseSsml(input.ssml)),

    play() {
      if (speech) return;

      if (input.bed && input.bed.id !== 'silencio') {
        try {
          ctx = new AudioContext();
          bed = createBed(ctx, input.bed, ctx.destination);
          bed.start();
          bed.setVolume(bedVolume);
        } catch {
          // No Web Audio, or a context the browser refused to build. The voice
          // is the practice; the bed is not worth failing over.
          bed = null;
        }
      }

      events.onState?.('playing');
      const provider = input.voice ? recordedVoiceProvider(input.voice) : webSpeechProvider;
      speech = provider.synthesize(
        { ssml: input.ssml, from: input.from ?? 0, volume: () => voiceVolume },
        {
          ...(events.onSegment ? { onSegment: events.onSegment } : {}),
          onDone: () => {
            teardown();
            events.onState?.('finished');
          },
          onError: (reason) => {
            teardown();
            events.onError?.(reason);
            events.onState?.('idle');
          },
        },
      );
    },

    stop() {
      teardown();
      events.onState?.('idle');
    },

    setVoiceVolume(value) {
      voiceVolume = value;
    },

    setBedVolume(value) {
      bedVolume = value;
      bed?.setVolume(value);
    },
  };
}
