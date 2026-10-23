import { afterEach, describe, expect, it, vi } from 'vitest';
import { webSpeechProvider } from './tts';

/** A speechSynthesis that ends every utterance at once and records its text. */
function fakeSpeech(spoken: string[]) {
  class Utterance {
    text: string;
    rate = 1;
    volume = 1;
    lang = '';
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [],
    cancel: () => {},
    speak: (u: Utterance) => {
      spoken.push(u.text);
      queueMicrotask(() => u.onend?.());
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('a paused practice goes on from where it was (QA-31)', () => {
  const ssml = '<speak><s>Uno.</s><s>Dos.</s><s>Tres.</s></speak>';

  it('CONTROL: speaks every sentence from the start', async () => {
    const spoken: string[] = [];
    fakeSpeech(spoken);
    await new Promise<void>((done) => webSpeechProvider.synthesize({ ssml, volume: () => 1 }, { onDone: done }));
    expect(spoken).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });

  it('begins at the segment it is given', async () => {
    const spoken: string[] = [];
    fakeSpeech(spoken);
    const segments: number[] = [];
    await new Promise<void>((done) =>
      webSpeechProvider.synthesize(
        { ssml, from: 1, volume: () => 1 },
        { onSegment: (i) => segments.push(i), onDone: done },
      ),
    );
    expect(spoken).toEqual(['Dos.', 'Tres.']);
    expect(segments[0]).toBe(1);
  });
});
