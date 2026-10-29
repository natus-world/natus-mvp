import { describe, expect, it } from 'vitest';
import { MAX_REQUEST_BYTES, piecesOf, voicePassages, voiceTokens } from './voice.ts';

describe('the meditation voice (owner, 29 Oct 2026)', () => {
  it('reads one passage per spoken segment, silences left to the player', () => {
    const ssml =
      '<speak><prosody rate="82%">Quédate como estés.</prosody><break time="3s"/><prosody rate="80%">Nota el peso de tu cuerpo.</prosody></speak>';
    expect(voicePassages(ssml)).toEqual([
      { text: 'Quédate como estés.', rate: 0.82 },
      { text: 'Nota el peso de tu cuerpo.', rate: 0.8 },
    ]);
  });

  it('cuts a passage longer than Google takes at the end of a sentence', () => {
    const sentence = 'Lleva la atención a la respiración, sin cambiarla, solo notando cómo entra y cómo sale. ';
    const long = sentence.repeat(20).trim();
    const pieces = piecesOf(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(new TextEncoder().encode(piece).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
      expect(piece.endsWith('.')).toBe(true);
    }
    expect(pieces.join(' ')).toBe(long);
  });

  it('leaves a short passage whole', () => {
    expect(piecesOf('Respira.')).toEqual(['Respira.']);
  });

  it('estimates what a ten-minute meditation costs in tokens', () => {
    // About five thousand characters of speech in some forty passages.
    const { inputTokens, outputTokens } = voiceTokens(5000, 40, 160);
    expect(outputTokens).toBe(Math.ceil((5000 / 13) * 25));
    expect(inputTokens).toBe(Math.ceil((5000 + 40 * 160) / 4));
  });
});
