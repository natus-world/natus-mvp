import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The browser's own dictation (Web Speech API): speech becomes text the way
 * a phone keyboard does it. No audio is kept by Natus and no provider is
 * paid (v1.2 B-01, owner, 16 Oct 2026). Chrome sends the audio to Google to
 * transcribe it and Safari to Apple; neither reaches Natus.
 *
 * `supported` is false where the browser has none (Firefox), and then the
 * microphone is simply not offered.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type ResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;

/**
 * What each recognition result said, kept until it is handed over once. Safari
 * on the iPhone, in continuous mode, may never mark a result final, or mark it
 * only as it stops; Chrome marks each as it goes. So the latest words of every
 * result are kept, a final one is handed over at once, and whatever is left is
 * handed over when the recognition ends (owner's report, 22 Oct 2026: the
 * journal's microphone did not transcribe).
 */
export function transcriptCollector(onText: (text: string) => void) {
  const latest = new Map<number, string>();
  const given = new Set<number>();
  const give = (index: number, text: string) => {
    if (given.has(index) || !text) return;
    given.add(index);
    onText(text);
  };
  return {
    result(resultIndex: number, results: ResultList) {
      for (let i = resultIndex; i < results.length; i++) {
        const result = results[i];
        if (!result) continue;
        const text = (result[0]?.transcript ?? '').trim();
        if (result.isFinal) give(i, text);
        else latest.set(i, text);
      }
    },
    end() {
      for (const [i, text] of latest) give(i, text);
      latest.clear();
    },
  };
}

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<Recognition | null>(null);
  const Klass = recognitionClass();

  const stop = useCallback(() => {
    ref.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Klass || ref.current) return;
    const recognition = new Klass();
    recognition.lang = navigator.language?.startsWith('es') ? navigator.language : 'es-419';
    recognition.continuous = true;
    // Interim results too: on the iPhone they may be all there is.
    recognition.interimResults = true;
    const words = transcriptCollector(onText);
    recognition.onresult = (event) => words.result(event.resultIndex, event.results);
    recognition.onend = () => {
      words.end();
      ref.current = null;
      setListening(false);
    };
    recognition.onerror = () => recognition.stop();
    ref.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      ref.current = null;
      setListening(false);
    }
  }, [Klass, onText]);

  useEffect(() => () => ref.current?.stop(), []);

  return { supported: Klass !== null, listening, start, stop };
}
