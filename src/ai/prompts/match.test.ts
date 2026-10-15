import { describe, expect, it } from 'vitest';
import { buildMatchUserMessage } from './match';
import { modalityBySlug } from '@/lib/catalog';
import type { Modality, SoulMapSynthesis } from '@/lib/schemas';

const synthesis = {
  detected_phase: 'pregunta',
  detected_mode: 'explorar',
  inferred_topics: ['ansiedad'],
  soul_map_synthesis: { tu_camino: 'A.', lo_que_estas_trabajando: 'B.', que_necesitas_ahora: 'C.' },
} as unknown as SoulMapSynthesis;

const candidates = [modalityBySlug('terapia-somatica') as Modality];
const outcome = {
  candidates,
  strategy: 'topical' as const,
  excludedForVulnerability: [],
  excludedForDismissal: [],
  droppedForSize: 0,
  poolBeforeTruncation: 1,
};

describe('v1.2 R-02 — the symbols the full why may cite', () => {
  it('carries the numbers and the main placements as given', () => {
    const message = buildMatchUserMessage({
      synthesis,
      outcome,
      presentingNeedText: 'El cuerpo no afloja.',
      gender: 'neutro',
      symbols: {
        numerology: { life_path: 4, expression: 7, soul_urge: 1, personality: 6, birthday: 5, master_numbers_present: [], algorithm_version: 'pythagorean-v1' },
        chart: [
          { name: 'Moon', sign: 'Cancer', house: 4 },
          { name: 'Sun', sign: 'Taurus', house: null },
        ],
      },
    });
    expect(message).toContain('Camino de vida 4');
    expect(message).toContain('Moon en Cancer, casa 4');
    expect(message).toMatch(/Sun en Taurus$/m);
    expect(message).not.toContain('No hay carta');
  });

  it('says so when there are none, so nothing is invented', () => {
    const message = buildMatchUserMessage({
      synthesis,
      outcome,
      presentingNeedText: '',
      gender: 'neutro',
      symbols: { numerology: null, chart: null },
    });
    expect(message).toContain('No hay numerología.');
    expect(message).toContain('No hay carta.');
  });
});
