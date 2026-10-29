import { parseSsml } from './ssml.ts';

/**
 * The meditation's voice (owner, 29 Oct 2026): what Google's Gemini TTS is
 * asked to read, and what that costs.
 *
 * One passage per spoken segment of the script, in order, so the player can
 * put each recording where the browser's voice used to speak and keep the
 * script's own silences between them.
 */

export type VoicePassage = { text: string; rate: number };

export function voicePassages(ssml: string): VoicePassage[] {
  return parseSsml(ssml).flatMap((s) => (s.kind === 'speak' ? [{ text: s.text, rate: s.rate }] : []));
}

/**
 * Google takes at most 900 bytes of text per request. A longer passage is
 * read in pieces cut at the end of a sentence (or, failing that, a comma or a
 * space), and the pieces are joined back into one recording.
 */
export const MAX_REQUEST_BYTES = 850;

export function piecesOf(text: string, maxBytes = MAX_REQUEST_BYTES): string[] {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(text) <= maxBytes) return [text];
  const pieces: string[] = [];
  let rest = text.trim();
  while (bytes(rest) > maxBytes) {
    let cut = -1;
    for (const mark of ['. ', '? ', '! ', '; ', ', ', ' ']) {
      let at = rest.lastIndexOf(mark);
      while (at > 0 && bytes(rest.slice(0, at + 1)) > maxBytes) at = rest.lastIndexOf(mark, at - 1);
      if (at > 0) {
        cut = at + 1;
        break;
      }
    }
    if (cut <= 0) cut = Math.max(1, Math.floor(rest.length / 2));
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Google answers with the audio, not with a bill, so the cost is estimated
 * from the characters: a slow, calm reading runs near 13 characters a second,
 * Gemini's audio is billed at 25 tokens a second, and the text in at about
 * four characters a token plus the style prompt on every request.
 */
export const CHARACTERS_PER_SECOND = 13;
export const AUDIO_TOKENS_PER_SECOND = 25;

export function voiceTokens(characters: number, requests: number, promptCharacters: number): {
  inputTokens: number;
  outputTokens: number;
} {
  return {
    inputTokens: Math.ceil((characters + requests * promptCharacters) / 4),
    outputTokens: Math.ceil((characters / CHARACTERS_PER_SECOND) * AUDIO_TOKENS_PER_SECOND),
  };
}
