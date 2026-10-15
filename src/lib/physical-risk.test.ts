import { describe, expect, it } from 'vitest';
import { hasFoodOrWeightSignal, lintPhysicalRisk } from './physical-risk.ts';

const rulesFor = (value: unknown, fastingBarred = false) =>
  lintPhysicalRisk(value, { fastingBarred }).map((v) => v.rule);

const tip = (body: string) => ({
  title: 'Una práctica',
  body,
  invitation: '¿Te gustaría probarlo esta semana?',
  cadence: 'weekly',
});

describe('S-03: a conditioned practice carries its contraindication', () => {
  it.each([
    'Una ducha fría por la mañana puede despertar el cuerpo.',
    'El método Wim Hof trabaja con la respiración y el frío.',
    'Un baño de hielo corto después de entrenar.',
    'La suplementación con magnesio suele acompañar el descanso.',
    'Leer sobre el ayuno y cómo funciona.',
  ])('rejects "%s" without a referral to a doctor', (body) => {
    expect(rulesFor(tip(body))).toContain('contraindication');
  });

  it('accepts the same practice with the contraindication and the referral', () => {
    const body =
      'Una ducha fría por la mañana puede despertar el cuerpo. Si tienes problemas cardíacos o estás en un embarazo, consulta antes con un médico. Para hacerlo con acompañamiento, existe el breathwork.';
    expect(rulesFor(tip(body))).toEqual([]);
  });

  it('reads the contraindication anywhere in the same tip', () => {
    expect(
      rulesFor({
        title: 'Duchas frías',
        body: 'Si tienes epilepsia o problemas cardíacos, consulta antes con un médico.',
        invitation: '¿Te gustaría leer más?',
        cadence: 'weekly',
      }),
    ).toEqual([]);
  });

  it('does not borrow a referral from a different tip', () => {
    const routine = [tip('Una ducha fría al despertar.'), tip('Si algo duele, consulta con un médico.')];
    expect(lintPhysicalRisk(routine)).toMatchObject([{ rule: 'contraindication', path: '$[0]' }]);
  });

  it('leaves the safe list alone', () => {
    expect(rulesFor(tip('Diez minutos de respiración lenta antes de dormir.'))).toEqual([]);
    expect(rulesFor(tip('Una caminata corta, aunque el día esté frío.'))).toEqual([]);
  });
});

describe('S-03: fasting is something to read about, never to do', () => {
  it.each([
    'Podrías probar un ayuno de doce horas. Si tienes diabetes, consulta antes con un médico.',
    'Hacer ayuno intermitente puede ordenar el día. Consulta antes con un médico.',
    'Ayunar un día a la semana. Consulta antes con un médico.',
    'Toma el té en ayunas. Consulta antes con un médico.',
  ])('rejects "%s"', (body) => {
    expect(rulesFor(tip(body))).toContain('fasting-practice');
  });

  it('accepts an invitation to read about it, with the contraindication', () => {
    const body =
      'Lee sobre el ayuno y cómo funciona. Si tienes un trastorno alimentario o estás en un embarazo, consulta antes con un médico.';
    expect(rulesFor(tip(body))).toEqual([]);
  });

  it('does not let it appear at all when the profile bars it', () => {
    const body =
      'Lee sobre el ayuno y cómo funciona. Si tienes un trastorno alimentario, consulta antes con un médico.';
    expect(rulesFor(tip(body), true)).toEqual(['fasting-barred']);
  });

  it('does not extend the read-instead rule to cold, Wim Hof or supplements', () => {
    const body =
      'Prueba una ducha fría de treinta segundos. Si tienes problemas cardíacos, consulta antes con un médico.';
    expect(rulesFor(tip(body), true)).toEqual([]);
  });
});

describe('S-03: food and weight signals', () => {
  it.each([
    'Me cuesta mucho la relación con la comida.',
    'Pienso todo el tiempo en mi peso.',
    'Hice todas las dietas posibles.',
    'Tengo atracones de noche.',
  ])('reads "%s" as a signal', (text) => {
    expect(hasFoodOrWeightSignal({ texts: [text] })).toBe(true);
  });

  it('reads the alimentacion topic as a signal', () => {
    expect(hasFoodOrWeightSignal({ texts: [''], topics: ['ansiedad', 'alimentacion'] })).toBe(true);
  });

  it('stays quiet without one', () => {
    expect(hasFoodOrWeightSignal({ texts: ['Quiero entender por qué me cuesta poner límites.'], topics: ['familia'] })).toBe(
      false,
    );
  });
});
