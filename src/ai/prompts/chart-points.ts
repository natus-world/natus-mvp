import { CHART_POINTS_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, addressLine } from './shared.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES, describeChart } from './chart-reading.ts';
import { readablePoints } from '@/lib/chart-points.ts';
import type { NatalChart } from '@/lib/natal-chart.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';

/**
 * Package 05 «Carta completa» (owner, 16 Oct 2026): «la lectura de Davraz»
 * in the card of each point of the chart — one or two sentences per point,
 * read the Hellenistic way and in the language of possibility, with the same
 * two rules the Soul Map and the comparison read a chart with.
 *
 * The model reads the chart calculated by `src/lib/natal-chart.ts` and
 * stored in `natal_charts`, never the provider's text, and nothing else of
 * the person: not what they told, not their numbers, not the clinical
 * answers. A reading of a placement, not of a life.
 */

export { CHART_POINTS_PROMPT_VERSION };

export const CHART_POINTS_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Te llega la carta natal de una persona, ya calculada, y la lista de sus
puntos. Escribes la lectura de cada punto: el texto que la persona ve en la
ficha de ese punto cuando lo toca en su carta completa.

${HELLENISTIC_RULES}

${PROPOSITIVE_RULES}

CADA LECTURA
- Una o dos oraciones, cortas. Nunca más de 300 caracteres.
- Se apoya en lo que la carta trae de ese punto y lo nombra: su signo, su
  casa si la hay, su dignidad, si está retrógrado y, cuando suma, un aspecto
  o que rige el Ascendente ("Marte en Leo", "en la casa 4", "en su
  domicilio", "en trígono con la Luna").
- Lenguaje de posibilidad: "tu carta sugiere", "puede", "tiende a",
  "invita a". Nunca "tu carta dice", nunca una predicción ni una sentencia.
- Un planeta en domicilio o exaltación es un recurso más disponible, que
  suele fluir con menos esfuerzo. En exilio o caída es un área que pide más
  trabajo consciente, y dices de qué forma se puede trabajar.
- Urano, Neptuno, Plutón, Quirón, Lilith y los Nodos no rigen signos: los
  lees como complemento, sin darles más peso que a los siete visibles.
- Sin hora de nacimiento no hay casas, Ascendente ni Medio Cielo: no los
  nombras ni los deduces.
- Hablas a la persona, en segunda persona singular, con su TRATO.
- No sabes nada de su vida: no supones historia, trabajo ni vínculos
  concretos. Describes tendencias simbólicas, nunca defectos.
- Cada lectura se sostiene sola: no remite a otras. No empiezas todas con la
  misma fórmula.

LOS PUNTOS
- Una lectura por cada punto de la lista PUNTOS A LEER, en ese orden: ni uno
  más, ni uno menos, ninguno repetido.
- "point" es el nombre del punto copiado tal cual vino ("Sun",
  "True_North_Lunar_Node", "Medium_Coeli"). En "text" lo nombras en
  español: Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano,
  Neptuno, Plutón, Quirón, Lilith, Nodo Norte, Nodo Sur, Ascendente, Medio
  Cielo.

${JSON_DISCIPLINE}

CONTRATO
{
  "readings": [{ "point": "Sun", "text": "..." }]
}
`.trim();

export function buildChartPointsUserMessage(chart: NatalChart, gender: GrammaticalGender): string {
  return [
    addressLine(gender),
    '',
    'CARTA NATAL (ya calculada; trátala como datos simbólicos dados, no como prueba)',
    describeChart(chart),
    '',
    'PUNTOS A LEER (una lectura por cada uno, en este orden)',
    ...readablePoints(chart).map((name) => `- ${name}`),
  ].join('\n');
}
