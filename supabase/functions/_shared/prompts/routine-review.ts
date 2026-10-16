import { ROUTINE_REVIEW_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, PHYSICAL_RISK_RULES, TONE_RULES, addressLine, personText } from './shared.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';
import type { Modality, SoulMapSynthesis } from '@/lib/schemas/index.ts';
import type { ReviewTrigger } from '@/lib/routine-review.ts';

/**
 * v1.2 R-04: a review of the routine the person already has. It reads what
 * they recorded — how often each practice was done, how useful it was, what
 * they commented — and, for premium with consent, what Natus remembers of
 * them; and it proposes a change only when that record asks for one. The
 * person accepts or keeps their routine: nothing here changes anything.
 *
 * A therapy dismissed more than seven days ago may be proposed again (R-05).
 * The rules for practices with physical risk are the routine's, unchanged.
 */

export { ROUTINE_REVIEW_PROMPT_VERSION };

export const ROUTINE_REVIEW_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Revisas la rutina que una persona ya tiene, con lo que ella registró: cuántas
veces hizo cada práctica, qué tan útil le resultó (de 1 a 5) y lo que
comentó. Propones un ajuste solo si ese registro lo pide. Si la rutina está
funcionando, no cambies por cambiar: responde "no_change": true. La persona
decide si acepta el cambio o mantiene su rutina.

QUÉ PUEDES PROPONER
- "remove": prácticas que salen, por su ref.
- "add": prácticas que entran, con los mismos campos que una práctica de la
  rutina. Una práctica que no le sirve se reemplaza por otra que trabaje lo
  mismo de otra forma, no por algo sin relación.
- "restore": como máximo una terapia de la lista "PUEDEN VOLVER", si lo que
  registró hace pensar que hoy le haría sentido. Si no, null.
La rutina después del cambio tiene entre 3 y 5 prácticas.

CÓMO LEER EL REGISTRO
- Valoraciones bajas: la práctica no le está sirviendo así. Propón otra forma.
- Una práctica que no se hace: más simple, más corta o en otro momento. Nunca
  culpa ni reproche ("no la hiciste", "te faltó constancia").
- Valoraciones altas: lo que funciona se queda.
- Los comentarios son de la persona: úsalos para entender, sin citarlos
  textual.

CADA "why"
Lo lee la persona. Una o dos oraciones, dirigidas con tú, que dicen por qué a
partir de lo que registró. "summary": una oración que resume el ajuste.

CADA PRÁCTICA QUE ENTRA
- title, body, invitation (cierra en pregunta) y cadence (daily, weekly,
  process u one_off), como en la rutina.
- connects_to: { "soul_map": true si se apoya en su mapa, "modality_slug": el
  slug de una terapia que mantiene o de la que vuelve, o null }. Al menos uno.

${PHYSICAL_RISK_RULES}

CONTRATO
{
  "prompt_version": "${ROUTINE_REVIEW_PROMPT_VERSION}",
  "no_change": false,
  "summary": "...",
  "remove": [{ "ref": "p1", "why": "..." }],
  "add": [
    {
      "title": "...",
      "body": "...",
      "invitation": "¿...?",
      "cadence": "daily|weekly|process|one_off",
      "connects_to": { "soul_map": true, "modality_slug": "slug-o-null" },
      "why": "..."
    }
  ],
  "restore": { "slug": "...", "why": "..." }
}
Sin cambio: "no_change": true, "summary": "", listas vacías y "restore": null.

${JSON_DISCIPLINE}
`.trim();

const TRIGGER_LINE: Record<ReviewTrigger, string> = {
  weekly: 'La revisión semanal.',
  bimonthly_free: 'La renovación de cada dos meses.',
  low_rating: 'Una práctica recibió dos valoraciones de 2 o menos.',
  abandoned: 'Una práctica diaria o semanal lleva dos semanas sin hacerse.',
};

export type ReviewPractice = {
  ref: string;
  title: string;
  body: string;
  cadence: string;
  connectsTo: { soul_map: boolean; modality_slug: string | null };
  timesDone: number;
  lastDone: string | null;
  recentRatings: readonly number[];
  /** Comments already scanned for crisis; one that raised a signal is not here. */
  recentComments: readonly string[];
};

export function buildRoutineReviewUserMessage(input: {
  trigger: ReviewTrigger;
  synthesis: SoulMapSynthesis;
  practices: readonly ReviewPractice[];
  kept: readonly { modality: Modality; reason: string | null }[];
  canReturn: readonly Modality[];
  /** What Natus remembers, only for premium with consent. */
  memory: readonly { category: string; content: string }[] | null;
  gender: GrammaticalGender;
}): string {
  const practices = input.practices
    .map((p) =>
      [
        `[${p.ref}] ${p.title} · ${p.cadence} · conversa con ${
          p.connectsTo.modality_slug ? `la terapia ${p.connectsTo.modality_slug}` : 'su mapa'
        }`,
        p.body,
        `Registro: ${p.timesDone} ${p.timesDone === 1 ? 'vez' : 'veces'} en total · última: ${p.lastDone ?? 'nunca'}`,
        `Valoraciones recientes: ${p.recentRatings.length > 0 ? p.recentRatings.join(', ') : 'ninguna'}`,
        ...p.recentComments.map((c) => `Comentario: ${personText(c)}`),
      ].join('\n'),
    )
    .join('\n---\n');

  const kept = input.kept
    .map(({ modality, reason }) =>
      [`slug: ${modality.slug} · ${modality.name_es}`, reason ? `por qué se le recomendó: ${reason}` : '']
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n---\n');

  const canReturn = input.canReturn
    .map((m) => `slug: ${m.slug} · ${m.name_es} · qué pasa en una sesión: ${m.what_happens}`)
    .join('\n');

  return [
    addressLine(input.gender),
    '',
    `POR QUÉ SE REVISA AHORA: ${TRIGGER_LINE[input.trigger]}`,
    '',
    'SU MAPA',
    input.synthesis.soul_map_synthesis.lo_que_estas_trabajando,
    input.synthesis.soul_map_synthesis.que_necesitas_ahora,
    `TEMAS: ${input.synthesis.inferred_topics.join(', ') || 'ninguno'}`,
    '',
    'SU RUTINA HOY',
    practices,
    '',
    'TERAPIAS QUE MANTIENE (puedes conectar con estas)',
    kept || 'Ninguna.',
    '',
    'PUEDEN VOLVER (las quitó hace más de una semana)',
    canReturn || 'Ninguna.',
    ...(input.memory
      ? [
          '',
          'LO QUE NATUS RECUERDA DE LA PERSONA',
          input.memory.length === 0
            ? '(nada todavía)'
            : input.memory.map((item) => `${item.category}: ${personText(item.content)}`).join('\n'),
        ]
      : []),
  ].join('\n');
}
