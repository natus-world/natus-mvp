import { describe, expect, it } from 'vitest';
import { buildRoutineUserMessage } from './routine';
import { modalityBySlug } from '@/lib/catalog';
import type { Modality, SoulMapSynthesis } from '@/lib/schemas';

const synthesis = {
  detected_phase: 'pregunta',
  detected_mode: 'explorar',
  inferred_topics: ['ansiedad'],
  soul_map_synthesis: { tu_camino: 'A.', lo_que_estas_trabajando: 'B.', que_necesitas_ahora: 'C.' },
} as unknown as SoulMapSynthesis;

const [first, second] = ['terapia-somatica', 'terapia-gestalt']
  .map((slug) => modalityBySlug(slug))
  .filter((m): m is Modality => Boolean(m));

describe('the routine user message', () => {
  it('carries why each therapy was recommended, beside that therapy only', () => {
    const message = buildRoutineUserMessage({
      synthesis,
      modalities: [first!, second!],
      reasons: { [first!.slug]: 'Mencionas que el cuerpo no afloja.' },
      gender: 'neutro',
    });
    const [, therapies] = message.split('LAS TERAPIAS QUE SE LE RECOMENDARON');
    const [one, two] = therapies!.split('\n---\n');
    expect(one).toContain('por qué se le recomendó a esta persona: Mencionas que el cuerpo no afloja.');
    expect(two).not.toContain('por qué se le recomendó');
  });
});
