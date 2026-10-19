import { DAILY_TIP_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, addressLine } from './shared.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES } from './chart-reading.ts';
import type { DailySky } from '@/lib/daily-sky.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';

/**
 * v1.2 D-01 and guide §9.4: Davraz's tip of the day, premium only — one or
 * two small practical tips from the day's transits over the person's chart
 * and their personal day («Hoy la energía viene más intensa para ti; date
 * tiempo para respirar»). A lens for knowing oneself, never a prediction nor
 * a concluding advice.
 *
 * The model reads the day calculated by `src/lib/daily-sky.ts` and nothing
 * else of the person. The lord of the year chose the order of the transits
 * and is never handed to the model: it is not to be named (owner, 18 Oct
 * 2026).
 */

export { DAILY_TIP_PROMPT_VERSION };

export const DAILY_TIP_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Te llegan los astros de hoy de una persona, ya calculados: los tránsitos del
día sobre su carta natal, ordenados del que más pesa al que menos, dónde está
la Luna y su día personal en numerología. Escribes su tip del día: uno o dos
consejos pequeños y prácticos para vivir el día con esa energía. Es lo que
la persona lee en su pantalla Hoy, marcado como escrito por Davraz con IA.

${HELLENISTIC_RULES}

${PROPOSITIVE_RULES}

CADA TIP
- Una o dos oraciones cortas. Nunca más de 220 caracteres.
- Siempre en tres partes (el dueño de Natus, 18 oct 2026): cómo vienen las
  energías hoy, un gesto pequeño, y para qué sirve ese gesto. Ejemplo del
  tono: "Hoy las energías pueden estar más densas. Respirar antes de
  responder ayuda: a veces tomarse un tiempo nos permite comunicarnos
  mejor."
- Hablas de las energías del día, nunca de cómo está o cómo es la persona:
  nada de "andas con menos paciencia", "estás irritable" ni "te va a costar".
  Siempre en positivo: lo que el gesto abre, no lo que evita.
- El gesto es algo concreto que se puede hacer hoy, con calma: respirar,
  caminar, escribir, conversar, pausar, ordenar, descansar. Nada que se
  compre ni se ingiera.
- Se apoya en lo que el día trae: el primer tránsito sobre todo, y si suma,
  el día personal o la Luna. Puedes nombrarlo ("con la Luna sobre tu Sol").
- Lenguaje de posibilidad e invitación: "puede", "quizás", "te invita a",
  "date un momento para". Nunca una orden, nunca "tienes que" ni "debes".
- Sin predicción: no anuncias lo que va a pasar hoy. Describes una energía
  para observar, nunca un hecho.
- No calificas el día ni un tránsito como bueno, malo, favorable ni
  difícil: lo que fluye, fluye; lo que pide más trabajo, se dice con cómo
  trabajarlo.
- Hablas a la persona, en segunda persona singular, con su TRATO.
- No sabes nada de su vida: no supones trabajo, pareja ni historia.
- Si son dos, el segundo dice algo distinto del primero.

${JSON_DISCIPLINE}

CONTRATO
{
  "tips": ["..."]
}
`.trim();

const PLANET_ES: Record<string, string> = {
  Sun: 'Sol',
  Moon: 'Luna',
  Mercury: 'Mercurio',
  Venus: 'Venus',
  Mars: 'Marte',
  Jupiter: 'Júpiter',
  Saturn: 'Saturno',
  Ascendant: 'Ascendente',
};

const SIGN_ES: Record<string, string> = {
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

const ASPECT_ES: Record<string, string> = {
  conjunction: 'en conjunción con',
  sextile: 'en sextil con',
  square: 'en cuadratura con',
  trine: 'en trígono con',
  opposition: 'en oposición con',
};

/**
 * The day as the model reads it: the transits in their order, the Moon and
 * the personal day. Also read by the chat (chat-v2.0), so Davraz can answer
 * about today's sky. Never the lord of the year.
 */
export function describeDay(day: DailySky): string[] {
  const moon = `La Luna está en ${SIGN_ES[day.moon.sign]}${day.moon.house ? `, en su casa ${day.moon.house}` : ''}.`;
  return [
    ...day.transits.map(
      (t, i) => `${i + 1}. ${PLANET_ES[t.planet]} de hoy ${ASPECT_ES[t.type]} su ${PLANET_ES[t.natal]} natal`,
    ),
    moon,
    `Día personal: ${day.personal_day}.`,
    ...(day.has_birth_time ? [] : ['Sin hora de nacimiento: no hay Ascendente ni casas. No los menciones ni los deduzcas.']),
  ];
}

export function buildDailyTipUserMessage(day: DailySky, gender: GrammaticalGender): string {
  return [
    addressLine(gender),
    '',
    `ASTROS DE HOY (${day.date}; ya calculados, trátalos como datos simbólicos dados)`,
    ...describeDay(day),
  ].join('\n');
}
