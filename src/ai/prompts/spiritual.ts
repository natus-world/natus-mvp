/**
 * Stones, colours, aromas and plants by sign and element (owner, 16 Oct 2026:
 * Davraz recommends what any spiritual line brings — crystals, aromas,
 * colours, plants — from the person's chart).
 *
 * A fixed table rather than the model's memory, so two people with the Moon
 * in Cancer hear the same thing and nothing contradicts itself between
 * answers. These are the correspondences most repeated in the Western
 * tradition; the owner reviews them. Read only by the chat for now.
 */
import type { NatalChart, Sign } from '@/lib/natal-chart.ts';

type Correspondence = {
  sign: string;
  element: 'fuego' | 'tierra' | 'aire' | 'agua';
  stones: readonly string[];
  colours: readonly string[];
  aromas: readonly string[];
  plants: readonly string[];
};

export const CORRESPONDENCES: Record<Sign, Correspondence> = {
  Aries: {
    sign: 'Aries',
    element: 'fuego',
    stones: ['cornalina', 'jaspe rojo', 'heliotropo'],
    colours: ['rojo', 'coral'],
    aromas: ['pimienta negra', 'jengibre', 'romero'],
    plants: ['romero', 'ortiga', 'albahaca'],
  },
  Taurus: {
    sign: 'Tauro',
    element: 'tierra',
    stones: ['cuarzo rosa', 'esmeralda', 'jade'],
    colours: ['verde', 'rosa'],
    aromas: ['rosa', 'pachulí', 'vainilla'],
    plants: ['rosa', 'menta', 'violeta'],
  },
  Gemini: {
    sign: 'Géminis',
    element: 'aire',
    stones: ['ágata', 'citrino', 'ojo de tigre'],
    colours: ['amarillo', 'celeste'],
    aromas: ['lavanda', 'menta', 'limón'],
    plants: ['lavanda', 'eneldo', 'verbena'],
  },
  Cancer: {
    sign: 'Cáncer',
    element: 'agua',
    stones: ['piedra de luna', 'calcedonia', 'perla'],
    colours: ['plateado', 'blanco', 'celeste pálido'],
    aromas: ['jazmín', 'manzanilla', 'sándalo'],
    plants: ['manzanilla', 'jazmín', 'lirio'],
  },
  Leo: {
    sign: 'Leo',
    element: 'fuego',
    stones: ['citrino', 'ojo de tigre', 'ámbar'],
    colours: ['dorado', 'naranja'],
    aromas: ['naranja', 'olíbano', 'canela'],
    plants: ['girasol', 'caléndula', 'laurel'],
  },
  Virgo: {
    sign: 'Virgo',
    element: 'tierra',
    stones: ['amazonita', 'ágata musgo', 'jaspe'],
    colours: ['verde oliva', 'tonos tierra'],
    aromas: ['lavanda', 'eucalipto', 'salvia'],
    plants: ['salvia', 'hinojo', 'lavanda'],
  },
  Libra: {
    sign: 'Libra',
    element: 'aire',
    stones: ['cuarzo rosa', 'lapislázuli', 'ópalo'],
    colours: ['rosa', 'celeste'],
    aromas: ['rosa', 'geranio', 'ylang-ylang'],
    plants: ['rosa', 'hortensia', 'violeta'],
  },
  Scorpio: {
    sign: 'Escorpio',
    element: 'agua',
    stones: ['obsidiana', 'granate', 'turmalina negra'],
    colours: ['burdeos', 'negro'],
    aromas: ['pachulí', 'mirra', 'vetiver'],
    plants: ['albahaca', 'ajenjo', 'crisantemo'],
  },
  Sagittarius: {
    sign: 'Sagitario',
    element: 'fuego',
    stones: ['turquesa', 'sodalita', 'amatista'],
    colours: ['púrpura', 'azul intenso'],
    aromas: ['clavo de olor', 'cedro', 'salvia'],
    plants: ['salvia', 'diente de león', 'clavel'],
  },
  Capricorn: {
    sign: 'Capricornio',
    element: 'tierra',
    stones: ['ónix', 'cuarzo ahumado', 'granate'],
    colours: ['gris', 'café', 'negro'],
    aromas: ['ciprés', 'mirra', 'pino'],
    plants: ['ciprés', 'hiedra', 'pino'],
  },
  Aquarius: {
    sign: 'Acuario',
    element: 'aire',
    stones: ['amatista', 'aguamarina', 'fluorita'],
    colours: ['azul eléctrico', 'turquesa'],
    aromas: ['menta', 'eucalipto', 'lavanda'],
    plants: ['orquídea', 'menta', 'eucalipto'],
  },
  Pisces: {
    sign: 'Piscis',
    element: 'agua',
    stones: ['aguamarina', 'amatista', 'fluorita'],
    colours: ['verde mar', 'lila'],
    aromas: ['sándalo', 'mirra', 'jazmín'],
    plants: ['nenúfar', 'jazmín', 'helecho'],
  },
};

/** What the tradition brings in when an element is scarce in a chart. */
const ELEMENT_SUPPORT: Record<Correspondence['element'], string> = {
  fuego: 'para traer fuego: cornalina, citrino; velas, naranja, canela; movimiento y sol',
  tierra: 'para traer tierra: cuarzo ahumado, hematita, jaspe; tonos tierra, vetiver, pachulí; caminar descalzo, cuidar plantas',
  aire: 'para traer aire: citrino, fluorita; amarillo y celeste, lavanda, menta; respiración y escritura',
  agua: 'para traer agua: piedra de luna, aguamarina; blanco y plateado, jazmín, manzanilla; baños tibios, cerca del agua',
};

const POINT_ES: Record<string, string> = { Sun: 'Sol', Moon: 'Luna', Ascendant: 'Ascendente' };

/**
 * The rows that concern this person: their Sun, Moon and Ascendant (when the
 * hour is known), and which elements their chart has little of.
 */
export function describeCorrespondences(chart: NatalChart): string {
  const lines: string[] = [];
  const anchors = [
    ...chart.points.filter((p) => p.name === 'Sun' || p.name === 'Moon'),
    ...(chart.ascendant ? [{ name: 'Ascendant', sign: chart.ascendant.sign }] : []),
  ];
  for (const anchor of anchors) {
    const c = CORRESPONDENCES[anchor.sign];
    lines.push(
      `${POINT_ES[anchor.name] ?? anchor.name} en ${c.sign} (${c.element}): piedras ${c.stones.join(', ')}; colores ${c.colours.join(', ')}; aromas ${c.aromas.join(', ')}; plantas ${c.plants.join(', ')}`,
    );
  }

  const counted = chart.points.filter((p) =>
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name),
  );
  const tally: Record<Correspondence['element'], number> = { fuego: 0, tierra: 0, aire: 0, agua: 0 };
  for (const p of counted) tally[CORRESPONDENCES[p.sign].element] += 1;
  if (chart.ascendant) tally[CORRESPONDENCES[chart.ascendant.sign].element] += 1;
  lines.push(
    `Elementos (siete planetas${chart.ascendant ? ' y Ascendente' : ''}): ${Object.entries(tally)
      .map(([element, n]) => `${element} ${n}`)
      .join(', ')}`,
  );
  for (const [element, n] of Object.entries(tally) as [Correspondence['element'], number][]) {
    if (n <= 1) lines.push(`Poco ${element}: ${ELEMENT_SUPPORT[element]}`);
  }
  return lines.join('\n');
}

export const SPIRITUAL_RULES = `
CUARZOS, AROMAS, COLORES, PLANTAS Y OTRAS PRÁCTICAS ESPIRITUALES
- Si la persona pregunta por cuarzos, piedras, aromas, inciensos, aceites,
  colores, plantas, altares, velas, rituales, ciclos de la Luna, tarot u
  otra práctica de alguna línea espiritual, respóndele con algo concreto, desde
  su carta. También puedes sugerirlo cuando busca algo para acompañar una
  práctica. No lo agregues a cada respuesta.
- Recomienda desde la tabla CORRESPONDENCIAS de su mensaje: di de dónde sale
  ("con tu Luna en Cáncer, la tradición asocia la piedra de luna"). Si su
  carta tiene poco de un elemento, puedes sugerir lo que lo trae. No inventes
  correspondencias fuera de la tabla; si te pregunta por algo que no está,
  di lo que la tradición suele decir, como tradición.
- Siempre como lo que dice la tradición y como un apoyo para la intención o
  para una práctica (sostener la piedra al respirar, encender el aroma al
  escribir). Nunca como algo que cura, sana, protege de verdad o reemplaza
  un tratamiento, una terapia o un médico. Sin lenguaje de "energías" ni
  "vibraciones": di para qué le puede servir en lo concreto.
- El tarot, las runas o los oráculos, como herramientas para reflexionar,
  nunca para predecir.
- Cuidado con el cuerpo:
  - Nada se ingiere: ni aceites esenciales, ni piedras en el agua, ni
    infusiones, tinturas o suplementos de plantas como parte de un ritual.
  - Aceites esenciales: diluidos y lejos de los ojos; si hay embarazo, asma,
    niños o mascotas en casa, consultar antes.
  - Inciensos, sahumerios y velas: con ventilación y nunca sin supervisión;
    con asma, mejor sin humo.
  - Nunca sustancias ni plantas psicoactivas (ayahuasca, hongos, San Pedro,
    kambo ni similares).
- Sin marcas, tiendas, precios ni vendedores. Nada para comprar.
`.trim();
