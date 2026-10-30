import { describe, expect, it } from 'vitest';
import type { ChartPoint, NatalChart, Sign } from '@/lib/natal-chart.ts';
import { CORRESPONDENCES, SPIRITUAL_RULES, describeCorrespondences } from './spiritual.ts';
import { CHAT_SYSTEM_PROMPT, buildChatUserMessage } from './chat.ts';

const ELEMENT: Record<string, ChartPoint['element']> = { fuego: 'fire', tierra: 'earth', aire: 'air', agua: 'water' };

function point(name: string, sign: Sign): ChartPoint {
  return {
    name,
    sign,
    degree: 10,
    longitude: 0,
    retrograde: false,
    element: ELEMENT[CORRESPONDENCES[sign].element]!,
    modality: 'cardinal',
    house: null,
    whole_sign_house: null,
    dignity: null,
  };
}

const CHART: NatalChart = {
  version: 'placidus-v1',
  house_system: 'whole_sign',
  cusps: null,
  has_birth_time: true,
  points: [
    point('Sun', 'Gemini'),
    point('Moon', 'Cancer'),
    point('Mercury', 'Gemini'),
    point('Venus', 'Taurus'),
    point('Mars', 'Pisces'),
    point('Jupiter', 'Cancer'),
    point('Saturn', 'Capricorn'),
  ],
  ascendant: { sign: 'Virgo', degree: 20 },
  ascendant_ruler: { planet: 'Mercury', sign: 'Gemini', house: 10 },
  sect: { kind: 'diurna', planets: ['Sun', 'Jupiter', 'Saturn'] },
  aspects: [],
};

describe('stones, aromas and colours from the chart (chat-v1.7)', () => {
  it('gives the rows of the Sun, the Moon and the Ascendant', () => {
    const text = describeCorrespondences(CHART);
    expect(text).toContain('Sol en Géminis (aire)');
    expect(text).toContain('Luna en Cáncer (agua): piedras piedra de luna');
    expect(text).toContain('Ascendente en Virgo (tierra)');
  });

  it('names the element the chart has little of', () => {
    // Fire: none of the seven planets nor the Ascendant.
    expect(describeCorrespondences(CHART)).toMatch(/Poco fuego: para traer fuego/);
  });

  it('leaves the Ascendant out without the hour', () => {
    const text = describeCorrespondences({ ...CHART, has_birth_time: false, ascendant: null });
    expect(text).not.toContain('Ascendente en');
  });

  it('reaches the chat with the chart, never the clinical answers', () => {
    expect(CHAT_SYSTEM_PROMPT).toContain(SPIRITUAL_RULES);
    const message = buildChatUserMessage({
      question: '¿Qué cuarzo me recomiendas?',
      synthesis: {
        detected_phase: 'pregunta',
        detected_mode: 'abierto',
        soul_map_synthesis: { tu_camino: 'a', lo_que_estas_trabajando: 'b', que_necesitas_ahora: 'c' },
        follow_up_invitation: '¿d?',
        inferred_topics: [],
      },
      numerology: null,
      risk: 'none',
      recommendedSlugs: [],
      history: [],
      gender: 'neutro',
      person: { chart: CHART, birth: '1990-06-04 a las 08:30 en Santiago', told: 'algo tiene que cambiar', routine: ['Respirar'] },
    });
    expect(message).toContain('SU CARTA NATAL');
    expect(message).toContain('CORRESPONDENCIAS');
    expect(message).toContain('Luna en Cáncer');
    expect(message).toContain('SU RUTINA: Respirar');
    expect(message).not.toMatch(/ideation|ideaci[oó]n|clinical/i);
  });
});

describe('numerology speaks of stones too', () => {
  it('gives the life path its stones and colours', async () => {
    const { describeNumberCorrespondences } = await import('./spiritual.ts');
    expect(describeNumberCorrespondences(4)).toContain('cuarzo ahumado');
    expect(describeNumberCorrespondences(11)).toContain('número maestro, se lee desde 2');
    expect(describeNumberCorrespondences(null)).toBeNull();
  });
});
