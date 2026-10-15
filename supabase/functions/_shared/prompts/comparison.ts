import { COMPARISON_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, personText } from './shared.ts';
import type { ComparisonPayload } from '@/lib/comparison-payload.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';

/**
 * Comparing two charts. PDR sections 8.4 and 8.5. Reconstructed — see
 * `shared.ts` for provenance.
 *
 * This is the prompt with the most ways to do harm, and the six rules of 8.5
 * are each aimed at one of them. The most important is symmetry: the person
 * asking is the only one reading, and a reading that explains what is wrong
 * with the other one is a weapon handed over in the voice of a mirror.
 *
 * The shape of the output enforces some of this on its own —
 * `comparisonResultSchema` has no verdict field, no score, and ends in
 * questions — so a model that ignores the prose still cannot return a
 * conclusion about the relationship.
 */

export { COMPARISON_PROMPT_VERSION };

export const COMPARISON_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Te llegan dos mapas simbólicos y devuelves un diálogo entre ambos. No un
veredicto: un diálogo.

LAS SEIS REGLAS DURAS
1. NINGÚN VEREDICTO SOBRE EL VÍNCULO.
   No dices si funciona, si conviene, si van a durar, si son compatibles.
   No hay porcentajes, no hay puntajes, no hay "son almas gemelas".
2. NO PATOLOGIZAS A LA OTRA PERSONA.
   La otra persona no está leyendo esto y no puede responderte. Nada de
   "es evitativo", "es narcisista", "tiene un problema con". Describes
   tendencias simbólicas, nunca defectos.
3. SIMETRÍA OBLIGATORIA.
   Cada cosa que dices de una persona la dices de la otra. Si una tensión
   aparece, aparece con ambas partes puestas, nunca como algo que una persona
   le hace a la otra.
4. TERMINAS EN PREGUNTAS.
   El cierre son entre 2 y 3 preguntas para conversar entre ustedes. No
   conclusiones, no recomendaciones, no "lo que tendrían que hacer".
5. NO INVENTAS POSICIONES NI ASPECTOS.
   Los aspectos que te llegan fueron calculados por efeméride y son los
   únicos que existen. No agregas ninguno, no cambias el tipo de uno, no
   nombras un planeta que no esté en la lista. Si no llega ninguno, dices que
   no hay carta que cruzar y trabajas solo con lo que sí llegó.
   Tu trabajo sobre cada aspecto es la lectura, no el aspecto.
6. SI QUIEN PIDE ESTÁ EN CRISIS, LA FUNCIÓN NO CORRE.
   Esa decisión se toma antes de llamarte. Si aun así llegas a este punto con
   una señal de riesgo en el pedido, devuelves solamente contención.

REGISTRO
Hablas en segunda persona del plural: "ustedes", "les pasa", "tienen".
Concreto, corto, sin lenguaje new age.

TRATO DE CADA PERSONA
Cada persona trae su propia línea TRATO. Lo que digas de una persona respeta
su trato, y lo que digas de la otra respeta el suyo. Cuando hablas de las dos
a la vez y sus tratos no coinciden, o alguno es neutro, reformulas para no
marcar género ("ambas partes", "cada persona").

${JSON_DISCIPLINE}

CONTRATO
{
  "prompt_version": "${COMPARISON_PROMPT_VERSION}",
  "headline": "...",
  "numerology_dialogue": {
    "summary": "...",
    "pairs": [{ "a_number": 0, "b_number": 0, "kind": "life_path|expression|soul_urge|personality|birthday", "reading": "..." }]
  },
  "astro_dialogue": {
    "available": false,
    "summary": "...",
    "aspects": [{ "a_body": "Sun", "b_body": "Moon", "type": "trine", "reading": "..." }]
  },
  "where_you_flow": ["...", "..."],
  "where_you_friction": ["...", "..."],
  "questions_to_explore": ["¿...?", "¿...?"],
  "disclaimer": "..."
}

CANTIDADES
- "aspects": uno por cada aspecto que te llegue, con los cuatro campos
  siempre. "a_body", "b_body" y "type" los copias tal cual vinieron; solo
  "reading" lo escribes tú.
- "where_you_flow" y "where_you_friction": entre 2 y 4 cada una.
- "questions_to_explore": entre 2 y 3.
`.trim();

export function buildComparisonUserMessage(
  payload: ComparisonPayload,
  gender: { a: GrammaticalGender; b: GrammaticalGender },
): string {
  return [
    'ALCANCE CONSENTIDO',
    `números: ${payload.scope.numerology ? 'sí' : 'no'} · carta: ${payload.scope.astro ? 'sí' : 'no'} · temas: ${payload.scope.soul_map_themes ? 'sí' : 'no'}`,
    'Lo que no está consentido no llegó acá. No lo pidas ni lo supongas.',
    '',
    describe('PERSONA A', payload.a, gender.a),
    '',
    describe('PERSONA B', payload.b, gender.b),
    '',
    // The birth data that produced these never appears here: it goes to the
    // ephemeris and stops there. The model gets the result of the
    // calculation, which is all it can do anything with.
    'ASPECTOS ENTRE LAS DOS CARTAS',
    payload.aspects.length === 0
      ? 'Ninguno. No hay dos cartas para cruzar, así que no hablas de aspectos.'
      : [
          'Calculados por efeméride. Son todos los que hay:',
          ...payload.aspects.map(
            (a) => `${a.a_body} de A ${a.type} ${a.b_body} de B (orbe ${a.orb.toFixed(1)}°)`,
          ),
        ].join('\n'),
  ].join('\n');
}

function describe(label: string, subject: ComparisonPayload['a'], gender: GrammaticalGender): string {
  const numbers = subject.numerology
    ? `camino de vida ${subject.numerology.life_path}, expresión ${subject.numerology.expression}, alma ${subject.numerology.soul_urge}, personalidad ${subject.numerology.personality}, cumpleaños ${subject.numerology.birthday}`
    : 'sin números consentidos';

  const chart = subject.chart.available
    ? subject.chart.positions.map((p) => `${p.body} en ${p.sign}${p.house ? ` casa ${p.house}` : ''}`).join(', ')
    : 'SIN CARTA. No completes posiciones.';

  return [
    label,
    `TRATO: ${gender}`,
    `nombre: ${personText(subject.display_name)}`,
    `números: ${numbers}`,
    `carta: ${chart}`,
    `temas: ${subject.soul_map_themes.length ? personText(subject.soul_map_themes.join(', ')) : 'sin temas consentidos'}`,
  ].join('\n');
}
