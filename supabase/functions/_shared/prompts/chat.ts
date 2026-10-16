import { JSON_DISCIPLINE, PHYSICAL_RISK_RULES, TONE_RULES, addressLine, personText } from './shared.ts';
import type { ComparisonResult, Numerology, SoulMapSynthesis } from '@/lib/schemas/index.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';
import type { NatalChart } from '@/lib/natal-chart.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES, describeChart } from './chart-reading.ts';
import { SPIRITUAL_RULES, describeCorrespondences, describeNumberCorrespondences } from './spiritual.ts';

/**
 * The conversation of PDR section 10. Reconstructed — see `shared.ts` for
 * provenance.
 *
 * Two things separate this prompt from the Soul Map one. It answers in turns
 * rather than producing a document, so the length rule is much tighter; and it
 * is the surface where someone is most likely to ask for therapy, so the
 * referral rule is stated as a hard rule rather than a matter of register.
 *
 * PDR 10.2: the raw `clinical_basics` never enters this payload. A derived
 * risk level goes in instead — fewer tokens, and nothing for the model to
 * repeat back to the person about answers they gave a form weeks ago.
 */

export { CHAT_PROMPT_VERSION } from './versions.ts';

export const CHAT_CRISIS_EXAMPLES = [
  {
    type: 'crisis',
    message_text:
      'Lo que escribes es muy serio y no es algo para atravesar sin compañía. La conversación sobre tu mapa queda en pausa. Hay personas disponibles ahora mismo para hablar, y las formas de contactarlas aparecen debajo.',
    linked_modality_slugs: [],
  },
  {
    type: 'crisis',
    message_text:
      'Gracias por contarlo. Esto merece la atención de una persona hoy, no una respuesta escrita. Las líneas de ayuda que aparecen a continuación atienden ahora, sin costo.',
    linked_modality_slugs: [],
  },
] as const;

export const CHAT_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Conversas con una persona que ya tiene su mapa hecho. La persona pregunta;
tú devuelves algo corto que le ayude a mirar mejor lo que ya trajo. No estás
haciendo terapia y no la estás reemplazando. No hace falta que te presentes
en cada turno, pero nunca dejas de ser una IA ni finges ser una persona.

LARGO
Entre 2 y 6 oraciones. Es una conversación, no un informe. Si algo necesita
más que eso, es señal de que hace falta una persona, no un mensaje más largo.

LOS CUATRO TIPOS DE RESPUESTA
- "reflection": devuelves lo que trajo, ordenado, conectado con su mapa.
- "clarifying_question": lo que dijo no alcanza para decir algo con sentido.
  Preguntas una sola cosa concreta. Prefiere esto antes que interpretar de
  más: una interpretación forzada suena a que la estás leyendo, y no la
  leíste.
- "recommendation": señalas una modalidad del listado que ya tiene sugerido,
  diciendo qué pasa en una sesión. Solo slugs de ese listado.
- "crisis": contención y nada más. No interpretas, no simbolizas, no sugieres
  modalidades, no ofreces nada pago.
  En message_text no escribas números de teléfono, cifras ni nombres de
  líneas de ayuda: el sistema agrega las líneas verificadas del país.
  Dos ejemplos completos de una respuesta de crisis:
${CHAT_CRISIS_EXAMPLES.map((example) => JSON.stringify(example)).join('\n')}

DERIVACIÓN A TRABAJO HUMANO
Cuando lo que trae pide sostén sostenido — algo que se repite hace años, un
duelo abierto, un vínculo que le está haciendo daño — dilo con claridad: esto
se trabaja con alguien, no en un chat. No lo digas como disculpa ni como
cierre de la conversación.

NIVEL DE RIESGO
Te llega un nivel derivado, no las respuestas clínicas de la persona. No lo
menciones nunca de forma explícita ("veo que marcaste..."). Solo úsalo para
calibrar cuánto empujas: en "elevated" o "high", nada removedor, nada de
prácticas intensas, y baja el umbral para nombrar el trabajo con un
profesional.

ENCARGOS DE TRABAJO
No haces trabajos por la persona: no escribes tesis, informes, tareas,
correos para terceros ni código. Si te pide uno, no lo hagas ni a medias, y
tampoco la despidas: devuélvele la conversación hacia cómo lo está viviendo
(qué le pasa con ese trabajo, qué le pesa, qué le importa de hacerlo bien), con
una reflexión o una pregunta. Dilo sin regaño, en una frase, y sigue con ella.

UNA COMPARACIÓN CON UN AMIGO
A veces llega el resultado de una comparación de su carta con la de un amigo,
porque quiere conversar sobre eso. Es un espejo para conversar, no un
veredicto: no digas si son compatibles ni califiques la relación de buena o
mala. Lo que fluye se dice como lo que fluye naturalmente; lo que pide más
trabajo, junto con cómo se puede trabajar. No hables por el amigo ni supongas
lo que siente, y no agregues nada de su carta que no esté en la comparación.

LO QUE SABES DE ELLA
Te llega su carta natal calculada, sus números, lo que contó al empezar, sus
caminos y su rutina. Léelos y úsalos: cuando pregunta por su carta, sus
números o algo que se lee desde ahí, responde desde lo concreto ("tu Luna en
Cáncer, en casa 4", "tu camino de vida 7"), no en general. Si no hay carta
calculada o falta la hora, dilo con naturalidad y no inventes posiciones,
Ascendente ni casas.

${HELLENISTIC_RULES}

${PROPOSITIVE_RULES}

${SPIRITUAL_RULES}

MEMORIA
Si la persona tiene Premium, te llega lo que Natus recuerda de ella: cosas
que contó antes en su bitácora, en otras conversaciones o al decir cómo le
resultaron sus prácticas. Úsalo para entenderla y para no hacerle repetir lo
que ya contó. No lo recites ni lo enumeres: tráelo solo cuando sirva a lo que
pregunta ahora, y nunca de una forma que suene a que la estás vigilando. Si
algo de la memoria choca con lo que dice ahora, manda lo de ahora.

${PHYSICAL_RISK_RULES}

CONTRATO
{
  "type": "reflection|recommendation|clarifying_question|crisis",
  "message_text": "...",
  "linked_modality_slugs": ["..."]
}

linked_modality_slugs va vacío salvo en "recommendation".

${JSON_DISCIPLINE}
`.trim();

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

export function buildChatUserMessage(input: {
  question: string;
  synthesis: SoulMapSynthesis;
  numerology: Numerology | null;
  risk: 'none' | 'elevated' | 'high';
  recommendedSlugs: readonly string[];
  history: readonly ChatTurn[];
  gender: GrammaticalGender;
  /**
   * v1.2 M-01: what Natus remembers of the person, when the memory is alive
   * (premium and consent). Absent otherwise, and then the block is too.
   */
  memory?: readonly { category: string; content: string }[] | null;
  /** A comparison with a friend, read by the function while they are friends. */
  comparison?: ComparisonResult | null;
  /**
   * What the function reads of the person itself (owner, 16 Oct 2026): the
   * chart as calculated, where and when they were born, what they told at
   * the start and the routine they have. Never the clinical answers.
   */
  person?: {
    chart: NatalChart | null;
    birth: string;
    told: string;
    routine: readonly string[];
  } | null;
}): string {
  const person = input.person ?? null;
  const numbers = input.numerology
    ? `Camino de vida ${input.numerology.life_path} · expresión ${input.numerology.expression} · alma ${input.numerology.soul_urge} · personalidad ${input.numerology.personality} · cumpleaños ${input.numerology.birthday}`
    : 'sin números calculados';

  return [
    addressLine(input.gender),
    '',
    'SÍNTESIS VIGENTE DE SU MAPA',
    input.synthesis.soul_map_synthesis.tu_camino,
    input.synthesis.soul_map_synthesis.lo_que_estas_trabajando,
    input.synthesis.soul_map_synthesis.que_necesitas_ahora,
    '',
    `FASE: ${input.synthesis.detected_phase} · MODO: ${input.synthesis.detected_mode}`,
    `NÚMEROS: ${numbers}`,
    `TEMAS INFERIDOS: ${input.synthesis.inferred_topics.join(', ') || 'ninguno'}`,
    // PDR 10.2. The derived level, never the answers it came from.
    `NIVEL DE RIESGO DERIVADO: ${input.risk}`,
    ...(person
      ? [
          '',
          `NACIMIENTO: ${person.birth}`,
          '',
          'SU CARTA NATAL',
          person.chart ? describeChart(person.chart) : 'Sin carta calculada.',
          ...correspondences(person.chart, input.numerology?.life_path ?? null),
          '',
          'LO QUE CONTÓ AL EMPEZAR',
          person.told ? personText(person.told) : '(nada)',
          '',
          `SU RUTINA: ${person.routine.length ? person.routine.join(' · ') : 'todavía no tiene'}`,
        ]
      : []),
    `MODALIDADES YA SUGERIDAS (únicos slugs permitidos): ${input.recommendedSlugs.join(', ') || 'ninguna'}`,
    ...(input.memory
      ? [
          '',
          'LO QUE NATUS RECUERDA DE LA PERSONA',
          input.memory.length === 0
            ? '(nada todavía)'
            : input.memory.map((item) => `${item.category}: ${personText(item.content)}`).join('\n'),
        ]
      : []),
    ...(input.comparison ? ['', 'LA COMPARACIÓN QUE QUIERE CONVERSAR', describeComparison(input.comparison)] : []),
    '',
    'CONVERSACIÓN HASTA AQUÍ',
    input.history.length === 0
      ? '(es la primera pregunta)'
      : input.history
          .map((turn) => `${turn.role === 'user' ? 'Persona' : 'Davraz'}: ${personText(turn.text)}`)
          .join('\n'),
    '',
    'SU PREGUNTA AHORA',
    personText(input.question),
  ].join('\n');
}

function correspondences(chart: NatalChart | null, lifePath: number | null): string[] {
  const lines = [
    ...(chart ? [describeCorrespondences(chart)] : []),
    ...(describeNumberCorrespondences(lifePath) ? [describeNumberCorrespondences(lifePath)!] : []),
  ];
  return lines.length ? ['', 'CORRESPONDENCIAS (tabla de Natus)', ...lines] : [];
}

function describeComparison(c: ComparisonResult): string {
  const part = (title: string, items: readonly string[]) => [title, ...items.map((i) => `- ${i}`)].join('\n');
  const aspects = c.astro_dialogue.aspects
    .map((a) => `- ${a.a_body} ${a.type} ${a.b_body}${a.flow ? ` (${a.flow === 'fluye' ? 'fluye naturalmente' : 'pide más trabajo'})` : ''}: ${a.reading}`)
    .join('\n');
  return [
    c.headline,
    part('Lo bueno', c.lo_bueno),
    part('Qué tener en cuenta', c.tener_en_cuenta),
    part('Qué trabajar', c.que_trabajar),
    part('Qué disfrutar juntos', c.disfrutar_juntos),
    `Números: ${c.numerology_dialogue.summary}`,
    ...(c.astro_dialogue.available ? [`Cartas: ${c.astro_dialogue.summary}`, aspects] : []),
  ]
    .filter(Boolean)
    .join('\n');
}
