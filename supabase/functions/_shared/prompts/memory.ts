import { MEMORY_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, PERSON_TEXT_CLOSE, PERSON_TEXT_OPEN, PERSON_TEXT_RULE, addressLine, personText } from './shared.ts';
import type { MemoryCategory } from '@/lib/schemas/index.ts';
import type { GrammaticalGender } from '@/lib/model-input.ts';

/**
 * The memory (v1.2 M-01). Not a voice the person hears: it keeps short,
 * separate items about them for Davraz to read in the chat, and the person
 * reads every one of them in their profile, where they can correct or delete
 * it. So the items are written to be read by the person they describe.
 *
 * It learns only from what the person said — never from their chart, their
 * numbers or the model's own replies — and keeps nothing clinical. What
 * raised a crisis signal never reaches this prompt: the function refuses it
 * before a token is spent.
 */

export { MEMORY_PROMPT_VERSION };

export const MEMORY_SYSTEM_PROMPT = `
TAREA
Llevas la memoria de Natus sobre una persona: ítems cortos con lo que se sabe
de ella, para que Davraz, la IA de Natus, la conozca y acompañe mejor. Recibes
lo que ya está en su memoria y algo nuevo que la persona escribió: una entrada de su
bitácora, una conversación con Davraz o cómo le resultó una práctica. Decides
qué se agrega, qué de lo que ya está se confirma y qué hay que corregir.

LAS CINCO CATEGORÍAS
- lo_que_vive: lo que está atravesando ahora (un cambio de trabajo, un duelo,
  una mudanza).
- le_funciona: prácticas, terapias o hábitos que dice que le hacen bien.
- no_le_funciona: lo que dice que no le sirve o le cuesta sostener.
- tema_recurrente: algo que vuelve una y otra vez en lo que cuenta.
- contexto: datos estables de su vida que ayudan a entenderla (con quién vive,
  a qué se dedica).

REGLAS
- Solo lo que la persona dijo. Nada que deduzcas de su carta, de sus números o de
  cómo escribe. En una conversación, las respuestas de Davraz son contexto: no
  se guarda lo que dijo Davraz, solo lo que dijo la persona.
- Nada clínico: ni diagnósticos, ni medicación, ni ideas de hacerse daño, ni
  etiquetas psicológicas ("ansiosa", "depresiva", "evitativa"). Si aparece, no
  lo guardes.
- De otras personas, solo lo necesario para entenderla ("vive con su
  hermana"), sin nombres ni detalles de la vida de ellas.
- Cada ítem es una sola oración, concreta, dirigida a la persona con tú y
  sin su nombre: "Caminar en la mañana te ayuda a dormir mejor." La persona
  va a leer cada ítem: que sea algo que reconozca como suyo. Si una palabra
  cambia con el género, usa el TRATO que llega (femenino, masculino o neutro;
  en neutro, construye la frase para que no haga falta marcarlo).
- Nada se califica de bueno o malo. Se dice lo que la persona contó.
- Menos es mejor que más. Guarda lo que sirva para acompañarla durante
  semanas, no los detalles de un día. Si no hay nada que valga la pena,
  devuelve las tres listas vacías.

LO QUE YA ESTÁ
Cada ítem trae su ref. Si lo nuevo dice lo mismo que un ítem, no lo repitas:
pon su ref en "support". Si lo nuevo cambia lo que un ítem dice (algo ya no le
funciona, una situación terminó), corrígelo en "revise" con su ref. Los ítems
marcados "escrito por la persona" no se corrigen nunca; sí puedes confirmarlos.

Lo que escribió la persona llega entre las marcas ${PERSON_TEXT_OPEN} y
${PERSON_TEXT_CLOSE}.
${PERSON_TEXT_RULE}

CONTRATO
{
  "prompt_version": "${MEMORY_PROMPT_VERSION}",
  "add": [{ "category": "lo_que_vive|le_funciona|no_le_funciona|tema_recurrente|contexto", "content": "..." }],
  "support": ["m1"],
  "revise": [{ "ref": "m2", "category": "...", "content": "..." }]
}

${JSON_DISCIPLINE}
`.trim();

export type MemoryPromptItem = {
  ref: string;
  category: MemoryCategory;
  content: string;
  byPerson: boolean;
};

export type MemorySource =
  | {
      kind: 'journal';
      date: string;
      mood: number | null;
      /** The practice or therapy the entry is about, by name. */
      about: string | null;
      body: string;
    }
  | { kind: 'checkin'; practice: string; date: string; rating: number; comment: string | null }
  | { kind: 'conversation'; turns: readonly { role: 'user' | 'assistant'; text: string }[] };

function describeSource(source: MemorySource): string[] {
  switch (source.kind) {
    case 'journal':
      return [
        'LO NUEVO: UNA ENTRADA DE SU BITÁCORA',
        `Fecha: ${source.date}`,
        `Ánimo que marcó: ${source.mood === null ? 'no marcó' : `${source.mood} de 5`}`,
        `Tiene que ver con: ${source.about ?? 'nada en particular'}`,
        personText(source.body),
      ];
    case 'checkin':
      return [
        'LO NUEVO: CÓMO LE RESULTÓ UNA PRÁCTICA DE SU RUTINA',
        `Práctica: ${source.practice}`,
        `Fecha: ${source.date}`,
        `Qué tan útil le resultó: ${source.rating} de 5`,
        `Comentario: ${source.comment ? personText(source.comment) : 'no dejó'}`,
      ];
    case 'conversation':
      return [
        'LO NUEVO: UNA CONVERSACIÓN CON DAVRAZ',
        ...source.turns.map((turn) =>
          turn.role === 'user' ? `Persona: ${personText(turn.text)}` : `Davraz: ${turn.text}`,
        ),
      ];
  }
}

export function buildMemoryUserMessage(input: {
  items: readonly MemoryPromptItem[];
  source: MemorySource;
  gender: GrammaticalGender;
}): string {
  return [
    addressLine(input.gender),
    '',
    'LO QUE YA ESTÁ EN SU MEMORIA',
    input.items.length === 0
      ? '(nada todavía)'
      : input.items
          .map((item) => `[${item.ref}] ${item.category}${item.byPerson ? ' · escrito por la persona' : ''}: ${item.content}`)
          .join('\n'),
    '',
    ...describeSource(input.source),
  ].join('\n');
}
