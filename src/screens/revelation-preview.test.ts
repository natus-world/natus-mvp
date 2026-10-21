import { describe, expect, it } from 'vitest';
import { leadSentences } from './revelation-preview';

const THREE =
  'Lo que cuentas no suena a crisis sino a la parte silenciosa que viene después. Hay una vida que ya cambió y una manera de habitarla que todavía no se terminó de armar. Esa etapa se nota menos y se abandona más fácil, porque desde afuera parece que ya está resuelto.';

describe('the preview of a reading', () => {
  it('shows the sentences asked for', () => {
    expect(leadSentences(THREE, 1)).toBe(
      'Lo que cuentas no suena a crisis sino a la parte silenciosa que viene después.',
    );
    expect(leadSentences(THREE, 2)).toBe(
      'Lo que cuentas no suena a crisis sino a la parte silenciosa que viene después. Hay una vida que ya cambió y una manera de habitarla que todavía no se terminó de armar.',
    );
  });

  it('never shows the whole reading', () => {
    expect(leadSentences(THREE, 3)).toBe(leadSentences(THREE, 2));
    expect(leadSentences('Una. Dos.', 2)).toBe('Una.');
  });

  it('keeps a reading of one sentence, and one with no stop', () => {
    expect(leadSentences('Solo una frase.', 2)).toBe('Solo una frase.');
    expect(leadSentences('Sin punto final', 1)).toBe('Sin punto final');
  });

  it('reads questions and ellipses as ends of a sentence', () => {
    expect(leadSentences('¿Qué se gasta? Eso primero… Y luego lo demás.', 2)).toBe('¿Qué se gasta? Eso primero…');
  });
});
