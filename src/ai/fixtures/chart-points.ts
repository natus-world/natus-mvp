import type { ChartPointReadings } from '@/lib/schemas';
import { readablePoints } from '@/lib/chart-points';
import type { ChartPoint, NatalChart, Sign } from '@/lib/natal-chart';

/**
 * Curated readings of the full chart for the demo build (package 05). The
 * demo person's placements have their own text; any other point gets a
 * sentence built from its sign and dignity, so a chart typed into the demo
 * is read too. Either way it passes the same schema, the same check and the
 * same copy lint as the model's answer (`chart-points.test.ts`). No house is
 * named, so the same text holds with and without the hour of birth.
 */

const SIGN_ES: Record<Sign, string> = {
  Aries: 'Aries',
  Taurus: 'Tauro',
  Gemini: 'Géminis',
  Cancer: 'Cáncer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Escorpio',
  Sagittarius: 'Sagitario',
  Capricorn: 'Capricornio',
  Aquarius: 'Acuario',
  Pisces: 'Piscis',
};

const NAME_ES: Record<string, string> = {
  Sun: 'Sol',
  Moon: 'Luna',
  Mercury: 'Mercurio',
  Venus: 'Venus',
  Mars: 'Marte',
  Jupiter: 'Júpiter',
  Saturn: 'Saturno',
  Uranus: 'Urano',
  Neptune: 'Neptuno',
  Pluto: 'Plutón',
  Chiron: 'Quirón',
  Mean_Lilith: 'Lilith',
  True_North_Lunar_Node: 'Nodo Norte',
  True_South_Lunar_Node: 'Nodo Sur',
  Mean_North_Lunar_Node: 'Nodo Norte',
  Mean_South_Lunar_Node: 'Nodo Sur',
  Ascendant: 'Ascendente',
  Medium_Coeli: 'Medio Cielo',
};

/** The demo person's placements (the Carta seeds), by point and sign. */
const CURATED: Record<string, string> = {
  'Sun:Gemini':
    'Tu Sol en Géminis sugiere una identidad que se enciende al preguntar, conversar y unir ideas que parecían sueltas.',
  'Moon:Pisces':
    'Tu Luna en Piscis sugiere una sensibilidad que absorbe el ambiente; los ritmos de cada día pueden ser tu forma de cuidarla.',
  'Mercury:Gemini':
    'Mercurio está en Géminis, su domicilio: pensar, preguntar y poner las cosas en palabras son recursos más disponibles para ti.',
  'Venus:Taurus':
    'Venus en Tauro, su domicilio, sugiere que el disfrute sencillo y los vínculos que se construyen con calma suelen fluir con menos esfuerzo.',
  'Mars:Leo':
    'Marte en Leo sugiere una fuerza que se mueve mejor cuando lo que haces lleva tu sello y puedes mostrarlo.',
  'Jupiter:Sagittarius':
    'Júpiter en Sagitario, su domicilio, sugiere que la curiosidad y las preguntas grandes tienden a abrirte camino.',
  'Saturn:Capricorn':
    'Saturno en Capricornio, su domicilio, y retrógrado: tu carta sugiere construir una estructura propia con tiempo, revisando las reglas que heredaste.',
  'Uranus:Capricorn':
    'Urano en Capricornio se lee como complemento y sugiere ganas de renovar las formas establecidas desde dentro.',
  'Neptune:Capricorn':
    'Neptuno en Capricornio, como complemento, invita a darles un sentido propio a las metas que te propones.',
  'Pluto:Scorpio':
    'Plutón en Escorpio, como complemento, sugiere una intensidad que puede volverse transformación cuando la miras de frente.',
  'Ascendant:Libra': 'Tu Ascendente en Libra sugiere que llegas a los lugares buscando equilibrio y escucha.',
  'Medium_Coeli:Cancer':
    'Tu Medio Cielo en Cáncer sugiere una vocación que se acerca al cuidado y a crear lugares donde otras personas se sientan acogidas.',
};

const VISIBLE = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

function generic(point: ChartPoint): string {
  const name = NAME_ES[point.name] ?? point.name.replace(/_/g, ' ');
  const sign = SIGN_ES[point.sign];
  if (point.name === 'Ascendant') return `Tu Ascendente en ${sign} sugiere la manera en que llegas a los lugares y empiezas lo nuevo.`;
  if (point.name === 'Medium_Coeli') {
    return `Tu Medio Cielo en ${sign} sugiere hacia dónde tiende a orientarse lo que muestras hacia afuera.`;
  }
  if (!VISIBLE.has(point.name)) {
    return `${name} en ${sign} no rige signos: en la base helenística se lee como complemento de los siete planetas visibles.`;
  }
  switch (point.dignity) {
    case 'domicilio':
    case 'exaltacion':
      return `${name} en ${sign}, ${point.dignity === 'domicilio' ? 'su domicilio' : 'su exaltación'}: tu carta sugiere un recurso más disponible, que suele fluir con menos esfuerzo.`;
    case 'exilio':
    case 'caida':
      return `${name} en ${sign}, ${point.dignity === 'exilio' ? 'en exilio' : 'en caída'}, sugiere un área que pide más trabajo consciente; darle tiempo y atención puede volverla una fuerza propia.`;
    default:
      return `${name} en ${sign}: tu carta sugiere que se expresa con el tono de ese signo, a tu manera.`;
  }
}

/** One reading for every point the function would read in this chart. */
export function buildChartPointsFixture(chart: NatalChart): ChartPointReadings {
  const byName = new Map(chart.points.map((p) => [p.name, p]));
  return {
    readings: readablePoints(chart).map((name) => {
      const point = byName.get(name)!;
      return { point: name, text: CURATED[`${name}:${point.sign}`] ?? generic(point) };
    }),
  };
}
