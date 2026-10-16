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
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) onText(result[0].transcript.trim());
      }
    };
    recognition.onend = () => {
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
