import { describe, expect, it } from 'vitest';
import { lintCrisisResponse, lintCrisisText } from './copy-lint.ts';
import { modelCrisisReply, resourcesForCountry } from './crisis-resources.ts';
import { soulMapCrisisSchema, soulMapResultSchema } from './schemas/index.ts';

const CONTAINMENT = 'Lo que cuentas importa y no es algo para atravesar en soledad. Hay personas disponibles ahora mismo.';

describe('S-02: crisis text carries no phone number', () => {
  it.each([
    'Llama al 0800 345 1435 ahora mismo.',
    'Puedes llamar al 1455.',
    'El número es 800-273-8255.',
    'Marca (55) 5259 8121.',
    'Escribe al 4 7 5 8.',
  ])('rejects "%s"', (text) => {
    expect(lintCrisisResponse(text).map((v) => v.rule)).toEqual(['crisis-digits']);
  });

  it.each([CONTAINMENT, 'Hay ayuda disponible las 24 horas.', 'Una línea, el 911, o la guardia más cercana.'])(
    'accepts "%s"',
    (text) => {
      expect(lintCrisisResponse(text)).toEqual([]);
    },
  );

  it('reaches crisis_response anywhere in a payload', () => {
    const violations = lintCrisisText({
      detected_phase: 'crisis',
      crisis_response: 'Llama al 0800 345 1435.',
      follow_up_invitation: '¿Hay alguien cerca?',
    });
    expect(violations).toMatchObject([{ rule: 'crisis-digits', path: '$.crisis_response' }]);
  });

  it('reaches a chat turn the model typed as crisis, and only that one', () => {
    const crisis = { type: 'crisis', message_text: 'Llama al 0800 345 1435.', linked_modality_slugs: [] };
    const reflection = { ...crisis, type: 'reflection', message_text: 'En 2024 empezó a moverse algo.' };
    expect(lintCrisisText(crisis)).toMatchObject([{ rule: 'crisis-digits', path: '$.message_text' }]);
    expect(lintCrisisText(reflection)).toEqual([]);
  });
});

describe('S-02: the model returns only the text', () => {
  const fromModel = {
    detected_phase: 'crisis',
    crisis_response: CONTAINMENT,
    crisis_resources: [
      { type: 'hotline', country: 'AR', name: 'Línea inventada', contact: '0800 000 0000', note: null },
    ],
    follow_up_invitation: '¿Hay alguien cerca con quien estar en este rato?',
  };

  it('has no place in the contract for help lines', () => {
    expect(Object.keys(soulMapCrisisSchema.shape).sort()).toEqual([
      'crisis_response',
      'detected_phase',
      'follow_up_invitation',
    ]);
  });

  it('drops lines the model wrote anyway', () => {
    const parsed = soulMapResultSchema.parse(fromModel);
    expect(parsed).not.toHaveProperty('crisis_resources');
    expect(JSON.stringify(parsed)).not.toContain('0800 000 0000');
  });

  it.each(['AR', 'MX', 'CL', 'ES', undefined])('attaches the lines for %s from the verified data', (country) => {
    const parsed = soulMapCrisisSchema.parse(fromModel);
    const reply = modelCrisisReply(parsed.crisis_response, country);
    expect(reply.resources).toEqual(resourcesForCountry(country));
    expect(reply.crisis_response).toBe(CONTAINMENT);
    expect(JSON.stringify(reply)).not.toContain('Línea inventada');
  });
});
