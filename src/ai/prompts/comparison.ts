import { COMPARISON_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, personText } from './shared.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES, describeChart } from './chart-reading.ts';
import type { ComparisonPayload } from '@/lib/comparison-payload.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';

/**
 * Comparing two friends' charts. PDR 8.4 and 8.5 as changed by v1.2 C-01 and
 * C-02: friends inside Natus, astrology and numerology only, four parts, no
 * questions at the end.
 *
 * This is the prompt with the most ways to do harm, and the rules of 8.5 are
 * each aimed at one of them. The most important is symmetry: both friends
 * read the result, and a reading that explains what is wrong with one of
 * them is a weapon handed over in the voice of a mirror.
 *
 * The shape of the output enforces some of this on its own —
 * `comparisonResultSchema` has no verdict field and no score — so a model
 * that ignores the prose still cannot return a conclusion about the
 * relationship.
 */

export { COMPARISON_PROMPT_VERSION };

export const COMPARISON_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Te llegan los mapas simbólicos de dos amigos dentro de Natus: su numerología,
la carta de cada uno si existe y los aspectos entre sus cartas. Devuelves un diálogo
entre ambos en cuatro partes. No un veredicto: un diálogo.

LAS CINCO REGLAS DURAS
1. NINGÚN VEREDICTO SOBRE EL VÍNCULO.
   No dices si funciona, si conviene, si van a durar, si son compatibles.
   No hay porcentajes, no hay puntajes, no hay "son almas gemelas".
2. NO PATOLOGIZAS A NINGUNA DE LAS DOS PERSONAS.
   Las dos van a leer esto. Nada de "es evitativo", "es narcisista", "tiene
   un problema con". Describes tendencias simbólicas, nunca defectos.
3. SIMETRÍA OBLIGATORIA.
   Cada cosa que dices de una persona la dices de la otra. Si una tensión
   aparece, aparece con ambas partes puestas, nunca como algo que una persona
   le hace a la otra.
4. NO INVENTAS POSICIONES NI ASPECTOS.
   Los aspectos que te llegan fueron calculados por signo y son los
   únicos que existen. No agregas ninguno, no cambias el tipo de uno, no
   nombras un planeta que no esté en la lista. Si no llega ninguno, dices que
   no hay carta que cruzar y trabajas solo con lo que sí llegó.
   Tu trabajo sobre cada aspecto es la lectura, no el aspecto.
5. SI QUIEN PIDE ESTÁ EN CRISIS, LA FUNCIÓN NO CORRE.
   Esa decisión se toma antes de llamarte. Si aun así llegas a este punto con
   una señal de riesgo en el pedido, devuelves solamente contención.

${HELLENISTIC_RULES}

${PROPOSITIVE_RULES}

CADA ASPECTO ENTRE LAS DOS CARTAS
- Eliges entre 3 y 8 de los que te llegan: los que más dicen de esta
  relación. Si llegan menos de 3, los lees todos.
- "flow": decides tú si ese aspecto, entre esos dos planetas, "fluye"
  (fluye naturalmente entre ustedes) o "pide_trabajo" (pide más trabajo).
  Lo decides leyendo los planetas y sus dignidades, no solo el tipo de
  aspecto. Nunca es una nota: los dos son caminos.
- "reading": una o dos oraciones. Si fluye, qué les sale natural. Si pide
  trabajo, qué pide y de qué forma pueden trabajarlo.

LAS CUATRO PARTES
Cada punto se apoya en algo concreto de las dos cartas o de los dos números,
y lo nombra: "sus caminos de vida 3 y 7", "el trígono entre su Sol y su
Luna".
- "lo_bueno": dónde fluyen naturalmente y qué les sale fácil.
- "tener_en_cuenta": diferencias que pueden generar roce si no se miran.
  Siempre con las dos partes puestas, nunca como algo que una le hace a la
  otra.
- "que_trabajar": qué pueden trabajar para que funcione, y qué se vuelve
  fácil si lo trabajan. Una dirección para mirar, nunca una orden.
- "disfrutar_juntos": qué podrían disfrutar juntos.

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
    "aspects": [{ "a_body": "Sun", "b_body": "Moon", "type": "trine", "flow": "fluye|pide_trabajo", "reading": "..." }]
  },
  "lo_bueno": ["...", "..."],
  "tener_en_cuenta": ["...", "..."],
  "que_trabajar": ["...", "..."],
  "disfrutar_juntos": ["...", "..."],
  "disclaimer": "..."
}

CANTIDADES
- "aspects": entre 3 y 8 de los que te llegan (todos si son menos de 3),
  con los cinco campos siempre. "a_body", "b_body" y "type" los copias tal
  cual vinieron; "flow" y "reading" los decides tú.
- "lo_bueno", "tener_en_cuenta", "que_trabajar" y "disfrutar_juntos": entre
  2 y 4 puntos cada una, de una o dos oraciones.
`.trim();

export function buildComparisonUserMessage(
  payload: ComparisonPayload,
  gender: { a: GrammaticalGender; b: GrammaticalGender },
): string {
  return [
    'LO QUE LLEGA',
    'Solo numerología y carta. Lo que cada persona escribió en Natus no llega acá y no existe para ti. No lo pidas ni lo supongas.',
    '',
    describe('PERSONA A', payload.a, gender.a),
    '',
    describe('PERSONA B', payload.b, gender.b),
    '',
    // No birth data appears here: the model gets the calculation, never the
    // birthdays that produced it.
    'ASPECTOS ENTRE LAS DOS CARTAS',
    payload.aspects.length === 0
      ? 'Ninguno. No hay dos cartas para cruzar, así que no hablas de aspectos.'
      : [
          'Calculados por signo. Son todos los que hay:',
          ...payload.aspects.map((a) => `${a.a_body} de A ${a.type} ${a.b_body} de B`),
        ].join('\n'),
  ].join('\n');
}

function describe(label: string, subject: ComparisonPayload['a'], gender: GrammaticalGender): string {
  const numbers = subject.numerology
    ? `camino de vida ${subject.numerology.life_path}, expresión ${subject.numerology.expression}, alma ${subject.numerology.soul_urge}, personalidad ${subject.numerology.personality}, cumpleaños ${subject.numerology.birthday}`
    : 'sin números';

  const chart = subject.chart ? describeChart(subject.chart) : 'SIN CARTA. No completes posiciones.';

  return [
    label,
    `TRATO: ${gender}`,
    `nombre: ${personText(subject.display_name)}`,
    `números: ${numbers}`,
    'carta:',
    chart,
  ].join('\n');
}
