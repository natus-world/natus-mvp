import { COMPARISON_PROMPT_VERSION } from '../prompts/versions';
import type { ComparisonPayload } from '@/lib/comparison-payload';
import type { ComparisonResult } from '@/lib/schemas';

/**
 * A curated comparison, assembled from the payload.
 *
 * Everything here is written to the rules of PDR 8.5 as v1.2 C-02 left them,
 * and the two that are easiest to break by accident are the two this file is
 * built around. Only the demo build reads it: comparisons are between friends
 * inside Natus, and a build with no backend has no friends.
 *
 * Symmetry: every reading names both people or neither. The sentences are
 * generated from the pair, not from one number, so there is no place for a
 * sentence about what one of them does to the other.
 *
 * Never inventing positions: the astro section reads only what the payload
 * carries. The chart PDF is never parsed in this demo, so in practice it
 * always reports that there is no chart — and saying so is the honest output,
 * not a degraded one.
 */

const KINDS = ['life_path', 'expression', 'soul_urge', 'personality', 'birthday'] as const;
type Kind = (typeof KINDS)[number];

const KIND_SUBJECT: Record<Kind, string> = {
  life_path: 'el camino que cada persona viene recorriendo',
  expression: 'la forma en que cada persona se muestra',
  soul_urge: 'lo que cada persona busca por debajo',
  personality: 'lo primero que se ve de cada persona',
  birthday: 'el gesto con el que cada persona se maneja',
};

const MASTERS = new Set([11, 22, 33]);

function reading(kind: Kind, a: number, b: number): string {
  const subject = KIND_SUBJECT[kind];

  if (a === b) {
    return `Coinciden en ${subject}: ambos números son ${a}. Lo compartido suele ser cómodo y también difícil de ver, porque nadie hace de espejo de lo que ambas partes dan por sentado.`;
  }

  if (MASTERS.has(a) !== MASTERS.has(b)) {
    const [master, plain] = MASTERS.has(a) ? [a, b] : [b, a];
    return `En ${subject} aparece un ${master} de un lado y un ${plain} del otro. La tradición lee los maestros como una intensidad que pide más; puesto al lado de un ${plain}, suele producir dos ritmos distintos frente a la misma situación.`;
  }

  const distance = Math.abs(a - b);
  if (distance <= 2) {
    return `En ${subject} hay ${a} y ${b}, que están cerca. Se parecen lo suficiente como para entenderse rápido y como para repetir en ambos lados el mismo punto ciego.`;
  }

  return `En ${subject} hay ${a} de un lado y ${b} del otro. Son lenguajes distintos: lo que de un lado resulta obvio, del otro lleva un paso más, y al revés también.`;
}

export function buildComparisonFixture(payload: ComparisonPayload): ComparisonResult {
  const { a, b } = payload;

  const pairs =
    a.numerology && b.numerology
      ? KINDS.map((kind) => ({
          a_number: a.numerology![kind],
          b_number: b.numerology![kind],
          kind,
          reading: reading(kind, a.numerology![kind], b.numerology![kind]),
        }))
      : [];

  const matches = pairs.filter((pair) => pair.a_number === pair.b_number).length;

  const shared = matches > 0;

  const loBueno = [
    pairs.length === 0
      ? 'Sin números para cruzar, lo que ustedes tienen en común queda por descubrirse conversando.'
      : shared
        ? `Comparten ${matches} de los cinco números, y eso suele mostrarse como entenderse sin explicar demasiado.`
        : 'No comparten ninguno de los cinco números: cada persona aporta algo que del otro lado no habría aparecido.',
    'Puestos en paralelo, sus números muestran dos formas de llegar a lo mismo, y eso le da a cada persona algo que aprender del otro lado.',
  ];
  const tenerEnCuenta = [
    matches >= 3
      ? 'Tanto parecido tiene su costo: cuando algo se les escapa, se les escapa a ambas partes al mismo tiempo.'
      : 'Los ritmos distintos se notan más en los días de prisa, cuando cada persona resuelve como sabe y del otro lado se lee como desinterés.',
    'Lo que una de las partes da por sentado puede ser justo lo que la otra necesita escuchar; vale para ambas partes.',
  ];
  const queTrabajar = [
    'Que cada persona nombre en voz alta su propio ritmo antes de que choque con el otro: cuando eso se vuelve costumbre, las diferencias dejan de leerse como distancia.',
    'Darse un momento para preguntarle a cada persona cómo llega a una decisión; con eso, decidir en conjunto se vuelve más liviano.',
  ];
  const disfrutarJuntos = [
    'Actividades donde cada persona pueda llevar su propio ritmo sin apurar a la otra.',
    'Conversaciones sin objetivo, donde lo distinto de cada lado sea material y no problema.',
  ];

  return {
    prompt_version: COMPARISON_PROMPT_VERSION,
    headline: `${a.display_name} y ${b.display_name}, lado a lado`,
    numerology_dialogue: {
      summary:
        pairs.length > 0
          ? 'Los números no dicen qué va a pasar entre ustedes. Puestos en paralelo muestran dónde se parecen y dónde no, que es material para hablar, no un resultado.'
          : 'No hubo números para este cruce, así que esta parte queda vacía a propósito.',
      pairs,
    },
    // Always empty, and it has to be.
    //
    // The aspects are computed by sign inside the Edge Function, from both
    // people's stored charts (v1.2 A-02); a fixture has neither. A hand-written aspect here
    // would be a placement invented by us rather than by the model, presented
    // as a reading of two real charts — the same lie with a different author,
    // and `src/ai/comparison.ts` rejects it for exactly that reason.
    astro_dialogue: {
      available: false,
      summary:
        'El cruce de las dos cartas se calcula con las cartas guardadas y esta lectura no las tiene, así que esta sección queda sin contenido. Nada aquí se completa por aproximación.',
      aspects: [],
    },
    lo_bueno: loBueno,
    tener_en_cuenta: tenerEnCuenta,
    que_trabajar: queTrabajar,
    disfrutar_juntos: disfrutarJuntos,
    disclaimer:
      'Esto es un lenguaje simbólico para conversar entre ustedes, no una medición del vínculo ni una opinión sobre si les conviene. Lo que decidan hablar después es de ustedes.',
  };
}
