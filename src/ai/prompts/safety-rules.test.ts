import { describe, expect, it } from 'vitest';
import { CHAT_SYSTEM_PROMPT } from './chat';
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
