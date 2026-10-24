import { COMPARISON_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, personText } from './shared.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES, describeChart } from './chart-reading.ts';
import type { ComparisonPayload } from '@/lib/comparison-payload.ts';
import { crossesToLabel, type Area, type AreaKey, type AreaPoint } from '@/lib/comparison-areas.ts';
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
la carta de cada uno si existe, los aspectos entre sus cartas y las áreas de la
vida en que se cruzan. Devuelves un diálogo entre ambos en cuatro partes y una
lectura por área. No un veredicto: un diálogo.

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

LAS DOS CARTAS, POR ÁREAS DE LA VIDA
Te llegan las áreas que se pudieron calcular, en orden, cada una con los
cruces de planetas que lee: qué planeta de cada persona, en qué signo y qué
aspecto forman por signo, o "sin aspecto" cuando sus signos no se ven. A
veces llega también qué planeta de una persona cae en una casa de la otra.
Todo eso está calculado: no lo cambias ni agregas nada.
Para cada área escribes:
- "reading": de 2 a 4 oraciones, en simple, con algo concreto del día a
  día. Se apoya en los cruces del área y los nombra con el nombre de cada
  persona ("la Venus de Ana en Tauro y el Marte de Luis en Tauro"). Si llega
  una casa, puedes nombrarla con lo que significa. Lo que fluye se dice como lo que fluye naturalmente; lo que
  pide trabajo, con cómo pueden trabajarlo. Si el cruce principal es "sin
  aspecto", dices cómo lo vive cada uno a su manera y que se conocen
  preguntándose.
- "question": una pregunta para conversar, abierta, en "tú", que cualquiera
  de los dos pueda responder sobre sí. Nunca compara ni pide elegir.
Las mismas cinco reglas valen acá: simetría, ningún veredicto, nada se
califica. "Sexualidad y deseo" se escribe en tono adulto y no explícito:
deseo, ritmo, confianza y cuidado, nunca descripciones de actos ni del
cuerpo. No supones qué vínculo tienen: pueden ser amigos, pareja o
familia, y la lectura sirve para cualquiera de esos.

LA ETIQUETA DE CADA CRUCE
Te llega la lista de los cruces que son trígono, sextil o cuadratura. A
cada uno le pones una sola etiqueta, leyendo los dos planetas y sus
dignidades, no solo el tipo de aspecto:
- "fluye": fluye naturalmente; les sale sin esfuerzo.
- "cultiva": fluye si lo cultivan; está ahí, pero se abre con un gesto.
- "trabajo": pide más trabajo; hay roce, y se puede trabajar.
Nunca es una nota: los tres son caminos. Si ese mismo cruce está entre
los aspectos que elegiste arriba, la etiqueta concuerda con su "flow":
"fluye" va con "fluye" o "cultiva", y "pide_trabajo" con "trabajo".
La oposición, la conjunción y los signos sin aspecto ya traen su etiqueta:
no se la pones.

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
  "disclaimer": "...",
  "areas": [{ "key": "quienes_son", "reading": "...", "question": "¿...?" }],
  "cross_labels": [{ "a_body": "Sun", "b_body": "Sun", "label": "fluye|cultiva|trabajo" }]
}

CANTIDADES
- "aspects": entre 3 y 8 de los que te llegan (todos si son menos de 3),
  con los cinco campos siempre. "a_body", "b_body" y "type" los copias tal
  cual vinieron; "flow" y "reading" los decides tú.
- "lo_bueno", "tener_en_cuenta", "que_trabajar" y "disfrutar_juntos": entre
  2 y 4 puntos cada una, de una o dos oraciones.
- "areas": una por cada área que te llega, en el mismo orden, con su "key"
  copiada tal cual. Si no llega ninguna, devuelves una lista vacía.
- "cross_labels": exactamente los cruces de la lista para etiquetar, con
  "a_body" y "b_body" copiados tal cual. Ni uno más, ni uno menos.
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
    '',
    describeAreas(payload.areas, payload.a.display_name, payload.b.display_name),
  ].join('\n');
}

/** What each area is about, for the model. The names on screen live in the copy. */
const AREA_FOCUS: Record<AreaKey, string> = {
  quienes_son: 'Quiénes son: lo que cada uno es y lo que lo enciende.',
  lo_que_se_dan: 'Lo que se dan: lo que uno es y lo que el otro necesita para sentirse acompañado.',
  lo_que_sienten: 'Lo que sienten: cómo siente y se cuida cada uno.',
  como_se_hablan: 'Cómo se hablan: cómo piensan y conversan.',
  lo_que_disfrutan: 'Lo que disfrutan juntos: gustos, placer y lo que les hace bien.',
  atraccion: 'Atracción y química: qué los atrae del otro.',
  sexualidad: 'Sexualidad y deseo: deseo, ritmo y confianza. Tono adulto y no explícito.',
  desacuerdo: 'Cuando no están de acuerdo: cómo discute y se defiende cada uno.',
  conviven: 'Cómo conviven: hábitos, orden y lo que cada uno necesita para sentirse en casa.',
  trabajan: 'Cómo trabajan juntos: roles, ritmo y responsabilidad.',
  sostiene: 'Lo que los sostiene: lo que da constancia y confianza en el tiempo.',
  como_se_ven: 'Cómo se ven juntos: cómo se muestran los dos hacia afuera.',
};

const TYPE_ES: Record<string, string> = {
  conjunction: 'conjunción',
  sextile: 'sextil',
  square: 'cuadratura',
  trine: 'trígono',
  opposition: 'oposición',
};

function describeAreas(areas: readonly Area[], aName: string, bName: string): string {
  if (areas.length === 0) {
    return 'ÁREAS\nNinguna: no hay dos cartas para cruzar. Devuelves "areas" y "cross_labels" vacías.';
  }
  const who = { a: 'A', b: 'B' };
  const point = (side: 'a' | 'b', p: AreaPoint) =>
    `${p.body} de ${who[side]} en ${p.sign}${p.house !== null && p.body !== 'Ascendant' ? `, su casa ${p.house}` : ''}`;
  const lines = ['ÁREAS, EN ESTE ORDEN', `A es ${personText(aName)} y B es ${personText(bName)}.`];
  for (const area of areas) {
    lines.push('', `key: ${area.key} · ${AREA_FOCUS[area.key]}`);
    for (const c of area.crosses) {
      const pair = c.first === 'a' ? [point('a', c.a), point('b', c.b)] : [point('b', c.b), point('a', c.a)];
      lines.push(`- ${pair[0]} · ${pair[1]}: ${c.type ? TYPE_ES[c.type] : 'sin aspecto'}`);
    }
    for (const o of area.overlays) {
      lines.push(`- ${o.body} de ${who[o.of]} cae en la casa ${o.house} de ${who[o.inHouseOf]}`);
    }
  }
  const toLabel = crossesToLabel(areas);
  lines.push('', 'CRUCES PARA ETIQUETAR (a_body es de A, b_body es de B)');
  if (toLabel.length === 0) lines.push('Ninguno. Devuelves "cross_labels" vacía.');
  for (const x of toLabel) lines.push(`- a_body ${x.a_body} · b_body ${x.b_body}: ${TYPE_ES[x.type]}`);
  return lines.join('\n');
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
