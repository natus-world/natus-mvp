import { describe, expect, it } from 'vitest';
import { buildDailyTipUserMessage, DAILY_TIP_SYSTEM_PROMPT } from './daily-tip.ts';
import { buildChatUserMessage } from './chat.ts';
import type { DailySky } from '@/lib/daily-sky.ts';

const DAY: DailySky = {
  version: 'daily-sky-v1',
  date: '2026-10-18',
  has_birth_time: true,
  personal_day: 3,
  moon: { sign: 'Gemini', house: 10 },
  lord_of_year: 'Mercury',
  transits: [
    { planet: 'Mercury', natal: 'Ascendant', type: 'opposition', orb: 0, lord_of_year: true },
    { planet: 'Moon', natal: 'Sun', type: 'conjunction', orb: 0.5, lord_of_year: false },
  ],
};

describe('the tip of the day (daily-tip-v1.0)', () => {
  it('hands the day over in Spanish, in its order', () => {
    const message = buildDailyTipUserMessage(DAY, 'neutro');
    expect(message).toContain('1. Mercurio de hoy en oposición con su Ascendente natal');
    expect(message).toContain('2. Luna de hoy en conjunción con su Sol natal');
    expect(message).toContain('La Luna está en Géminis, en su casa 10.');
    expect(message).toContain('Día personal: 3.');
  });

  it('never names the lord of the year', () => {
    const message = buildDailyTipUserMessage(DAY, 'neutro');
    expect(message).not.toMatch(/regente del año|profecci/i);
    expect(DAILY_TIP_SYSTEM_PROMPT).not.toMatch(/regente del año/i);
  });

  it('without the hour: no house, and says so', () => {
    const message = buildDailyTipUserMessage(
      { ...DAY, has_birth_time: false, lord_of_year: null, moon: { sign: 'Gemini', house: null }, transits: [DAY.transits[1]!] },
      'neutro',
    );
    expect(message).toContain('La Luna está en Géminis.');
    expect(message).toContain('Sin hora de nacimiento');
    expect(message).not.toContain('Ascendente natal');
  });

  it('asks for invitations, never orders or predictions', () => {
    expect(DAILY_TIP_SYSTEM_PROMPT).toContain('Nunca una orden');
    expect(DAILY_TIP_SYSTEM_PROMPT).toContain('Sin predicción');
  });
});

describe('the chat reads the sky of the day (chat-v2.0)', () => {
  const base = {
    question: '¿Cómo viene mi día?',
    synthesis: {
      detected_phase: 'pregunta' as const,
      detected_mode: 'abierto' as const,
      soul_map_synthesis: { tu_camino: 'a', lo_que_estas_trabajando: 'b', que_necesitas_ahora: 'c' },
      follow_up_invitation: '¿d?',
      inferred_topics: [],
    },
    numerology: null,
    risk: 'none' as const,
    recommendedSlugs: [],
    history: [],
    gender: 'neutro' as const,
  };

  it('with the day and the tip left, when there are', () => {
    const message = buildChatUserMessage({ ...base, today: { day: DAY, tips: ['Date un momento para respirar.'] } });
    expect(message).toContain('SUS ASTROS DE HOY');
    expect(message).toContain('2. Luna de hoy en conjunción con su Sol natal');
    expect(message).toContain('EL TIP QUE YA LE DEJASTE HOY: Date un momento para respirar.');
    expect(message).not.toMatch(/regente del año/i);
  });

  it('without the block when there is no day', () => {
    expect(buildChatUserMessage({ ...base, today: null })).not.toContain('SUS ASTROS DE HOY');
    expect(buildChatUserMessage(base)).not.toContain('SUS ASTROS DE HOY');
  });
});
