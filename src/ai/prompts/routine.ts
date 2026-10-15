import { ROUTINE_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, PHYSICAL_RISK_RULES, TONE_RULES, addressLine } from './shared.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';
import type { Modality, SoulMapSynthesis } from '@/lib/schemas/index.ts';

/**
 * The routine. v1.2 R-01: one routine, written after the therapies were
 * chosen, seeing the map and those therapies — never before them, because
 * writing practices first biased the choice of therapies (prompt audit,
 * finding 9). Every practice says what it converses with.
 *
 * It replaces two lists that could repeat or contradict each other: the Soul
 * Map's tips and the matching's routine. The rules for practices that carry a
 * physical risk travel with it, unchanged.
 */

export { ROUTINE_PROMPT_VERSION };

export const ROUTINE_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Recibes el mapa de una persona y las terapias que se le recomendaron.
Propones UNA rutina de entre 3 y 5 prácticas concretas que pueda hacer por su
cuenta. Todo conversa: cada práctica se conecta con su mapa, con una de esas
terapias, o con ambos, y lo declara.

CADA PRÁCTICA
- title: corto y concreto.
- body: qué hacer y por qué esta práctica y no otra para ESTA persona. Nombra
  con qué conversa: algo de su mapa ("lo que estás trabajando…") o la terapia
  ("como en la terapia somática, …").
- invitation: una micro-invitación que cierra en pregunta.
- cadence: daily, weekly, process u one_off.
- connects_to: { "soul_map": true si se apoya en su mapa, "modality_slug": el
  slug de la terapia con la que conversa, o null }. Al menos uno de los dos.
  Solo slugs de la lista de terapias que te llega.

POR QUÉ SE LE RECOMENDÓ CADA TERAPIA
Cada terapia puede traer el porqué con que se le recomendó a esta persona.
Úsalo: una práctica que conversa con una terapia trabaja lo mismo que llevó a
recomendarla, no la terapia en general. Ese porqué es contexto para ti; no lo
copies ni lo repitas en el body.
Nada abstracto. "Diez minutos de respiración 4-7-8 antes de dormir", no
"explora el silencio". Una práctica no reemplaza a la terapia: la prepara o la
acompaña.

${PHYSICAL_RISK_RULES}

CONTRATO
{
  "prompt_version": "${ROUTINE_PROMPT_VERSION}",
  "practices": [
    {
      "title": "...",
      "body": "...",
      "invitation": "¿...?",
      "cadence": "daily|weekly|process|one_off",
      "connects_to": { "soul_map": true, "modality_slug": "slug-o-null" }
    }
  ]
}

${JSON_DISCIPLINE}
`.trim();

export function buildRoutineUserMessage(input: {
  synthesis: SoulMapSynthesis;
  modalities: readonly Modality[];
  /** Why the match recommended each therapy to this person, by slug. */
  reasons: Readonly<Record<string, string>>;
  gender: GrammaticalGender;
}): string {
  const therapies = input.modalities
    .map((m) =>
      [
        `slug: ${m.slug}`,
        `nombre: ${m.name_es}`,
        `qué pasa en una sesión: ${m.what_happens}`,
        `formato: ${m.typical_format} · intensidad: ${m.intensity}/5`,
        input.reasons[m.slug] ? `por qué se le recomendó a esta persona: ${input.reasons[m.slug]}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n---\n');

  return [
    addressLine(input.gender),
    '',
    'SU MAPA',
    `Fase: ${input.synthesis.detected_phase} · modo: ${input.synthesis.detected_mode}`,
    input.synthesis.soul_map_synthesis.tu_camino,
    input.synthesis.soul_map_synthesis.lo_que_estas_trabajando,
    input.synthesis.soul_map_synthesis.que_necesitas_ahora,
    '',
    `TEMAS: ${input.synthesis.inferred_topics.join(', ') || 'ninguno'}`,
    '',
    'LAS TERAPIAS QUE SE LE RECOMENDARON (solo puedes conectar con estas)',
    therapies || 'Ninguna. Conecta cada práctica con su mapa.',
  ].join('\n');
}
