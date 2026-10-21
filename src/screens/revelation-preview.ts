import { copy } from '@/i18n';

/**
 * How much of each reading the preview shows (owner, 21 Oct 2026): «Lo que
 * estás trabajando» is the one written from what the person told, so it
 * shows more; the others, their first sentence.
 */
export const PREVIEW_SENTENCES: Record<keyof typeof copy.soulMap.sections, number> = {
  tu_camino: 1,
  lo_que_estas_trabajando: 2,
  que_necesitas_ahora: 1,
};

/**
 * The reading's opening sentences, never all of them: at least the last one
 * stays for Carta, so the preview is never the whole reading. A reading of
 * one sentence shows that one, as before.
 */
export function leadSentences(body: string, wanted: number): string {
  const sentences = body.trim().match(/[^.?!…]*[.?!…]+(?=\s|$)|\S[^.?!…]*$/gs) ?? [body.trim()];
  const shown = Math.max(1, Math.min(wanted, sentences.length - 1));
  return sentences.slice(0, shown).join('').trim();
}
