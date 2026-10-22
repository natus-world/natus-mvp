import { JSON_DISCIPLINE, TONE_RULES, addressLine, personText } from './shared.ts';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES, describeChart } from './chart-reading.ts';
import { ChartParseError, buildNatalChart, type NatalChart } from '@/lib/natal-chart.ts';
import type { Numerology } from '@/lib/schemas/index.ts';
import type { GrammaticalGender, SoulMapDraft } from '@/lib/model-input.ts';

/**
 * The Soul Map prompt. PDR 6.5.
 *
 * Reconstructed — see `shared.ts` for provenance. The version string says so.
 *
 * One deliberate difference from the vault contract: `matched_facilitators`
 * is gone. PDR 6.5 removes it because matching is a separate call with its
 * own prompt, which lets therapies be re-ranked without regenerating the
 * narrative and keeps the eval set clean.
 */

export { SOUL_MAP_PROMPT_VERSION } from './versions.ts';

export const SOUL_MAP_CRISIS_EXAMPLES = [
  {
    detected_phase: 'crisis',
    crisis_response:
      'Lo que cuentas pesa mucho, y no es algo para sostener sin compañía. Ahora mismo hay personas preparadas para escucharte, sin turno y sin costo. Justo debajo están las formas de contactarlas.',
    follow_up_invitation: '¿Hay alguien cerca con quien puedas estar en este momento?',
  },
  {
    detected_phase: 'crisis',
    crisis_response:
      'Gracias por escribirlo. Lo que describes merece que hoy te escuche una persona, no una lectura simbólica. Hay líneas de ayuda disponibles para hablar ahora mismo, y aparecen a continuación.',
    follow_up_invitation: '¿Puedes buscar un lugar donde estar con alguien de confianza mientras haces esa llamada?',
  },
] as const;

export const SOUL_MAP_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Recibes cuatro bloques sobre una persona: datos básicos, numerología ya
calculada, carta natal (si la hay) y contexto vital. Devuelves una síntesis
narrativa en tres secciones y los temas que infieres de lo que contó.
No propones prácticas: la rutina se arma después, cuando ya se eligieron las
terapias.

LAS TRES SECCIONES
- tu_camino: 3 a 5 oraciones. Lo que se repite, lo que trajo a la persona
  hasta aquí.
  Se apoya en la numerología y la carta como lenguaje, no como prueba.
- lo_que_estas_trabajando: 3 a 5 oraciones. La tensión viva ahora mismo,
  dicha con las palabras que usó la persona, no con las tuyas.
- que_necesitas_ahora: 2 a 4 oraciones. Qué pide este momento. Nunca una
  indicación clínica.

${HELLENISTIC_RULES}

${PROPOSITIVE_RULES}

FASE Y MODO
detected_phase: "pregunta" si todavía está formulando qué le pasa,
"exploracion" si ya sabe y está buscando cómo, "integracion" si viene de un
proceso y está asentando. Sin tildes.
detected_mode: "objetivo" si trae una meta concreta, "abierto" si llega sin
una meta definida.

TEMAS INFERIDOS
inferred_topics: slugs del catálogo que reconoces en lo que contó. Solo de
esta lista, sin inventar: ansiedad, depresion, duelo, pareja, sexualidad,
familia, trauma, autoestima, proposito, transiciones, espiritualidad,
adicciones, alimentacion, desarrollo-profesional, identidad.

CONTRATO NORMAL
{
  "detected_phase": "pregunta | exploracion | integracion",
  "detected_mode": "objetivo | abierto",
  "soul_map_synthesis": {
    "tu_camino": "...",
    "lo_que_estas_trabajando": "...",
    "que_necesitas_ahora": "..."
  },
  "follow_up_invitation": "...",
  "inferred_topics": ["..."]
}

CONTRATO DE CRISIS
Si detectas riesgo, devuelves SOLO esto. Sin síntesis, sin
interpretación simbólica de ningún tipo:
{
  "detected_phase": "crisis",
  "crisis_response": "2 a 4 oraciones de contención. No minimiza, no aconseja, no interpreta.",
  "follow_up_invitation": "..."
}
En crisis_response no escribas números de teléfono, cifras ni nombres de
líneas de ayuda: el sistema agrega las líneas verificadas del país.

Dos ejemplos completos del contrato de crisis:
${SOUL_MAP_CRISIS_EXAMPLES.map((example) => JSON.stringify(example, null, 2)).join('\n')}

${JSON_DISCIPLINE}
`.trim();

/** PDR 6.5 pipeline step 4: the four-block payload. */
export function buildSoulMapUserMessage(input: {
  draft: SoulMapDraft;
  numerology: Numerology | null;
  gender: GrammaticalGender;
}): string {
  const { draft, numerology } = input;

  const blocks: string[] = [addressLine(input.gender)];

  blocks.push(
    ['DATOS BÁSICOS', `Nombre de nacimiento: ${personText(draft.legal_birth_name)}`, `Fecha: ${personText(draft.birth_date)}`]
      .concat(draft.birth_time ? [`Hora: ${personText(draft.birth_time)}`] : [])
      .concat(draft.birth_city ? [`Ciudad: ${personText(draft.birth_city)}`] : [])
      .concat([`País de residencia: ${personText(draft.country)}`])
      .join('\n'),
  );

  blocks.push(
    numerology
      ? [
          'NUMEROLOGÍA (ya calculada, trátala como dada)',
          `Camino de vida: ${numerology.life_path}`,
          `Expresión: ${numerology.expression}`,
          `Alma: ${numerology.soul_urge}`,
          `Personalidad: ${numerology.personality}`,
          `Cumpleaños: ${numerology.birthday}`,
          numerology.master_numbers_present.length > 0
            ? `Números maestros presentes: ${numerology.master_numbers_present.join(', ')}`
            : 'Sin números maestros.',
        ].join('\n')
      : 'NUMEROLOGÍA\nNo disponible para este nombre.',
  );

  // PDR 6.3: an unreadable or absent chart never blocks. The prompt is told
  // plainly that it is missing, and told not to invent positions — the same
  // instruction that keeps the comparison prompt honest.
  // v1.2 A-02: the chart arrives read the Hellenistic way, calculated here,
  // not as the provider's text with its Placidus houses.
  const chart = readChart(draft);
  blocks.push(
    chart
      ? [
          'CARTA NATAL (ya calculada; trátala como datos simbólicos dados, no como prueba)',
          describeChart(chart),
        ].join('\n')
      : [
          'CARTA NATAL',
          'No hay carta disponible. Trabaja con la numerología y el contexto.',
          'No menciones Ascendente, casas ni posiciones. No inventes ninguna.',
        ].join('\n'),
  );

  const needs = draft.presenting_need_slugs.length
    ? `Eligió también: ${personText(draft.presenting_need_slugs.join(', '))}`
    : '';

  blocks.push(
    [
      'CONTEXTO VITAL',
      `Lo que se está preguntando: ${draft.presenting_need_text ? personText(draft.presenting_need_text) : '(no escribió texto libre)'}`,
      needs,
      `Apertura a tipos de trabajo: ${draft.openness_to_modalities.length ? personText(draft.openness_to_modalities.join(', ')) : 'sin preferencia'}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  // clinical_basics is deliberately NOT included verbatim. PDR 10.2 applies
  // the same reasoning to chat: the model gets a derived risk level, never the
  // raw clinical answers. Fewer tokens, and less surface for it to leak back.
  return blocks.join('\n\n');
}

function readChart(draft: SoulMapDraft): NatalChart | null {
  if (!draft.natal_chart || draft.natal_chart.parse_status !== 'parsed') return null;
  try {
    const timeKnown = /^\d{1,2}:\d{2}$/.test(draft.birth_time.trim());
    // Without the hour, day or night as the person said it (owner, 22 Oct 2026).
    const dayNight = !timeKnown && (draft.birth_daynight === 'dia' || draft.birth_daynight === 'noche') ? draft.birth_daynight : null;
    return buildNatalChart(draft.natal_chart.context, timeKnown, dayNight);
  } catch (error) {
    if (error instanceof ChartParseError) return null;
    throw error;
  }
}
