import { parseSsml } from '@/lib/ssml';
import { speakOnce, type SpeechProvider } from './tts';
import type { VoiceSource } from './voice-source';

/**
 * The meditation read by Google's voice (owner, 29 Oct 2026): one recording
 * per spoken passage, in order, played where the browser's voice used to
 * speak, with the script's own silences kept between them as timers.
 *
 * One <audio> element for the whole practice: iPhone lets a page play sound
 * only after a touch, and an element that already played keeps that leave
 * when its source changes; a new element for every passage would not.
 *
 * A passage whose recording does not come is read by the phone's own voice,
 * so no sentence of the practice is lost.
 */
export function recordedVoiceProvider(source: VoiceSource): SpeechProvider {
  return {
    isAvailable: () => typeof Audio !== 'undefined',

    synthesize(request, events = {}) {
      const segments = parseSsml(request.ssml);
      // The n-th spoken segment is the n-th passage.
      const passageOf = new Map<number, number>();
      let spoken = 0;
      segments.forEach((segment, index) => {
        if (segment.kind === 'speak') passageOf.set(index, spoken++);
      });

      const audio = new Audio();
      audio.preload = 'auto';
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let cancelSpeech: (() => void) | null = null;

      // The next recording, fetched while this one plays.
      const fetchAhead = (from: number) => {
        for (let i = from; i < segments.length; i++) {
          const passage = passageOf.get(i);
          if (passage === undefined) continue;
          void source.urlFor(passage).then((url) => {
            if (url && !stopped) {
              const ahead = new Audio();
              ahead.preload = 'auto';
              ahead.src = url;
            }
          });
          return;
        }
      };

      const step = (index: number) => {
        if (stopped) return;
        const segment = segments[index];
        if (!segment) {
          events.onDone?.();
          return;
        }
        events.onSegment?.(index, segments.length, segment);

        if (segment.kind === 'pause') {
          timer = setTimeout(() => step(index + 1), segment.ms);
          return;
        }
        const passage = passageOf.get(index) ?? 0;
        void source.urlFor(passage).then((url) => {
          if (stopped) return;
          if (!url) {
            cancelSpeech = speakOnce(segment.text, segment.rate, request.volume(), () => step(index + 1));
            return;
          }
          audio.onended = () => step(index + 1);
          audio.onerror = () => {
            if (stopped) return;
            cancelSpeech = speakOnce(segment.text, segment.rate, request.volume(), () => step(index + 1));
          };
          audio.src = url;
          audio.volume = Math.min(1, Math.max(0, request.volume()));
          void audio.play().catch(() => {
            if (!stopped) events.onError?.('No pudimos reproducir la voz.');
          });
          fetchAhead(index + 1);
        });
      };

      step(Math.max(0, Math.min(request.from ?? 0, segments.length)));

      return {
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
          cancelSpeech?.();
          audio.pause();
          audio.removeAttribute('src');
        },
        isRunning: () => !stopped,
      };
    },
  };
}
