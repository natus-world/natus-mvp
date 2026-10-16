import { describe, expect, it } from 'vitest';
import { CHAT_SYSTEM_PROMPT, buildChatUserMessage } from './chat';
import { ROUTINE_SYSTEM_PROMPT } from './routine';
import { ROUTINE_REVIEW_SYSTEM_PROMPT } from './routine-review';
import { SOUL_MAP_SYSTEM_PROMPT } from './soul-map';
import { PHYSICAL_RISK_RULES } from './shared';

describe('S-02: the prompts never ask the model for help lines', () => {
  it.each([
    ['soul-map', SOUL_MAP_SYSTEM_PROMPT],
    ['chat', CHAT_SYSTEM_PROMPT],
  ])('%s leaves the lines to the system', (_name, prompt) => {
    expect(prompt).not.toContain('crisis_resources');
    expect(prompt).toContain('el sistema agrega las líneas verificadas del país');
  });
});

describe('S-03: the three lists reach every surface that suggests a practice', () => {
  it.each([
    // v1.2 R-01: the routine is the one place practices are proposed; the
    // Soul Map and the match no longer suggest any.
    ['routine', ROUTINE_SYSTEM_PROMPT],
    ['routine-review', ROUTINE_REVIEW_SYSTEM_PROMPT],
    ['chat', CHAT_SYSTEM_PROMPT],
  ])('%s carries them', (_name, prompt) => {
    expect(prompt).toContain(PHYSICAL_RISK_RULES);
  });

  it('names the three lists and the fasting rule', () => {
    expect(PHYSICAL_RISK_RULES).toMatch(/SEGURAS[\s\S]*CONDICIONADAS[\s\S]*VETADAS SEGÚN EL PERFIL/);
    expect(PHYSICAL_RISK_RULES).toContain('consulta antes con un médico');
    expect(PHYSICAL_RISK_RULES).toContain('lee sobre el ayuno y cómo funciona');
  });

  it('is written without voseo', () => {
    expect(PHYSICAL_RISK_RULES).not.toMatch(
      /(?<![\p{L}])(?:vos|podés|tenés|mencionás|consultá|leé|sugerí|nombrá|ubicala)(?![\p{L}])/iu,
    );
  });
});

describe('the chat does not do work for the person (owner decision)', () => {
  it('turns requests for work back to how they are living it', () => {
    expect(CHAT_SYSTEM_PROMPT).toContain('No haces trabajos por la persona');
    expect(CHAT_SYSTEM_PROMPT).toMatch(/cómo lo está\s+viviendo/);
  });
});

describe('the chat over a comparison with a friend', () => {
  const synthesis = {
    detected_phase: 'exploracion' as const,
    detected_mode: 'abierto' as const,
    soul_map_synthesis: { tu_camino: 'a', lo_que_estas_trabajando: 'b', que_necesitas_ahora: 'c' },
    follow_up_invitation: '¿d?',
    inferred_topics: [],
  };
  const base = { question: 'q', synthesis, numerology: null, risk: 'none' as const, recommendedSlugs: [], history: [], gender: 'neutro' as const };
  const comparison = {
    prompt_version: 'v',
    headline: 'Dos ritmos distintos',
    numerology_dialogue: { summary: 'Números que se complementan.', pairs: [] },
    astro_dialogue: {
      available: true,
      summary: 'Sol y Luna conversan.',
      aspects: [{ a_body: 'Sol', b_body: 'Luna', type: 'trígono', flow: 'fluye' as const, reading: 'Se entienden sin esfuerzo.' }],
    },
    lo_bueno: ['x', 'y'],
    tener_en_cuenta: ['x', 'y'],
    que_trabajar: ['x', 'y'],
    disfrutar_juntos: ['x', 'y'],
    disclaimer: 'Esto es un espejo.',
  };

  it('carries the result only when one is sent', () => {
    expect(buildChatUserMessage(base)).not.toContain('LA COMPARACIÓN QUE QUIERE CONVERSAR');
    const message = buildChatUserMessage({ ...base, comparison });
    expect(message).toContain('LA COMPARACIÓN QUE QUIERE CONVERSAR');
    expect(message).toContain('Sol trígono Luna (fluye naturalmente)');
  });

  it('is told to read it as a mirror, never a verdict', () => {
    expect(CHAT_SYSTEM_PROMPT).toContain('no un\nveredicto');
    expect(CHAT_SYSTEM_PROMPT).toMatch(/No hables por el amigo/);
  });
});
