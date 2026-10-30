import { BED_TRACKS } from '@/lib/catalog';
import { normalize } from '@/lib/safety';
import { RATE_DEFAULT, estimateDurationMs, parseSsml, transcriptOf } from '@/lib/ssml';
import type { MeditationScript } from '@/lib/schemas';

/**
 * Curated meditations, assembled rather than stored whole.
 *
 * Like the chat fixtures, these exist because `runAi` needs a fixture path and
 * a demo that only meditates for someone holding an API key is not a demo.
 *
 * They are built from moves — a passage plus the silence after it — because a
 * meditation's length is mostly a function of how many times you come back to
 * the body, not of how much you say. That also lets the requested duration
 * shape the script honestly: the deepening pool is walked once, twice or three
 * times, and the screen reports the length the script actually came out at
 * rather than the length that was asked for.
 */

type Move = { say: string; pauseSeconds: number };

const ARRIVAL: Move[] = [
  {
    say: 'Quédate como estés. No hace falta que cambies de postura ni que cierres los ojos si no estás en un lugar donde te sirva hacerlo.',
    pauseSeconds: 3,
  },
  {
    say: 'Nota el peso de tu cuerpo sobre lo que te esté sosteniendo. La silla, el piso, la cama. Algo te está sosteniendo ahora mismo y no estás haciendo nada para que eso pase.',
    pauseSeconds: 4,
  },
  {
    say: 'Escucha lo que suena alrededor sin ir a buscar nada en particular. Los sonidos llegan solos.',
    pauseSeconds: 4,
  },
];

/** The body scan. Walked once, twice or three times depending on the length. */
const DEEPENING: Move[] = [
  {
    say: 'Lleva la atención a la planta de los pies. Si hay contacto con el suelo, nota la temperatura antes que la forma.',
    pauseSeconds: 4,
  },
  {
    say: 'Sube a las piernas. No hace falta relajarlas: alcanza con registrar cómo están en este momento.',
    pauseSeconds: 4,
  },
  {
    say: 'La cadera y la parte baja de la espalda. Es una zona que suele sostener sin que nadie le avise.',
    pauseSeconds: 4,
  },
  {
    say: 'Los hombros. Fíjate si están más arriba de donde creías que estaban.',
    pauseSeconds: 4,
  },
  {
    say: 'Las manos. Si están cerradas, puedes dejar que se abran un poco. Si ya estaban abiertas, déjalas donde están.',
    pauseSeconds: 4,
  },
  {
    say: 'La mandíbula. Separa apenas los dientes de arriba de los de abajo y nota qué cambia en la cara.',
    pauseSeconds: 5,
  },
  {
    say: 'Ahora la respiración, sin corregirla. Solamente observa por dónde entra y por dónde sale.',
    pauseSeconds: 5,
  },
  {
    say: 'Si te sirve, alarga la exhalación un poco más que la inhalación. Tres o cuatro veces, y después déjala volver a su ritmo.',
    pauseSeconds: 5,
  },
];

/**
 * Narrated silences. This is what actually makes a meditation long.
 *
 * A twenty-minute guided practice does not carry three times the words of a
 * five-minute one — professional recordings of that length often run under
 * eight hundred. The rest is silence, and the silence is the practice. Padding
 * with more instructions to hit a duration would produce a talkative twenty
 * minutes that is worse than a quiet eight.
 *
 * The silence is emitted as consecutive `<break time="5s"/>`, because 5s is
 * the longest single break PDR 9.4 allows and a minute of stillness is a
 * minute whether it is written as one tag or twelve.
 */
const RESTS: string[] = [
  'Quédate aquí un rato. No hay nada que hacer con esto.',
  'Sigue un momento más. Si la cabeza se va, vuelve al aire y ya está.',
  'Otro rato en silencio. No hace falta que pase nada.',
  'Un último rato así, sin buscar nada.',
  'Quédate el tiempo que te sirva.',
];

const REST_UNIT_SECONDS = 5;
/** No single stretch of silence longer than two minutes, however long the
 *  practice was asked to be. */
const REST_MAX_SECONDS = 120;

const BRIDGES: Move[] = [
  {
    say: 'Volvemos a recorrer, ahora más despacio. Lo que ya miraste una vez suele mostrar algo distinto la segunda.',
    pauseSeconds: 3,
  },
  {
    say: 'Una vuelta más, la última. Esta vez sin buscar nada.',
    pauseSeconds: 3,
  },
];

const CLOSING: Move[] = [
  {
    say: 'Empieza a traer la atención de vuelta a la habitación donde estás.',
    pauseSeconds: 3,
  },
  {
    say: 'Mueve los dedos de las manos, después los de los pies. Un movimiento pequeño alcanza.',
    pauseSeconds: 3,
  },
  {
    say: 'Cuando quieras, abre los ojos si los tenías cerrados. Lo que apareció aquí se puede escribir después, si te sirve tenerlo.',
    pauseSeconds: 2,
  },
];

type Core = { key: string; title: string; moves: Move[]; bed: string };

const CORES: Core[] = [
  {
    key: 'calma',
    title: 'Bajar el ritmo',
    bed: 'calma-profunda',
    moves: [
      {
        say: 'Trae a la mente eso que vienes sosteniendo. No para resolverlo ahora: solamente para saber dónde está mientras respiras.',
        pauseSeconds: 5,
      },
      {
        say: 'Fíjate en qué parte del cuerpo aparece cuando lo piensas. Casi siempre aparece en algún lado.',
        pauseSeconds: 5,
      },
      {
        say: 'Déjalo ahí. No hace falta empujarlo ni entenderlo. Que esté, mientras el aire sigue entrando y saliendo.',
        pauseSeconds: 5,
      },
    ],
  },
  {
    key: 'dormir',
    title: 'Antes de dormir',
    bed: 'antes-de-dormir',
    moves: [
      {
        say: 'El día ya pasó. Lo que quedó sin hacer va a seguir estando mañana, y mañana vas a tener más con qué mirarlo.',
        pauseSeconds: 5,
      },
      {
        say: 'Si aparece una lista, déjala pasar como pasan las nubes. No hace falta seguirla.',
        pauseSeconds: 5,
      },
      {
        say: 'Nota el peso de la cabeza sobre la almohada. Es un peso que no te toca sostener.',
        pauseSeconds: 5,
      },
    ],
  },
  {
    key: 'enojo',
    title: 'Algo que quedó caliente',
    bed: 'olas-en-silencio',
    moves: [
      {
        say: 'Trae la escena que te dejó así. Sin discutirla otra vez por dentro: solamente mírala a distancia, como quien mira una foto.',
        pauseSeconds: 5,
      },
      {
        say: 'El enojo suele apoyarse en algún lado del cuerpo: el pecho, la garganta, las manos. Fíjate dónde se apoya el tuyo.',
        pauseSeconds: 5,
      },
      {
        say: 'No hace falta que se vaya. Alcanza con que tenga un lugar donde estar mientras respiras alrededor.',
        pauseSeconds: 5,
      },
    ],
  },
  {
    key: 'claridad',
    title: 'Antes de decidir',
    bed: 'tonos-armonicos',
    moves: [
      {
        say: 'Nombra en silencio la decisión que tienes delante. Una frase corta alcanza.',
        pauseSeconds: 4,
      },
      {
        say: 'Imagina que ya elegiste una de las opciones y quédate ahí un momento. Registra qué pasa en el cuerpo, no qué piensas.',
        pauseSeconds: 5,
      },
      {
        say: 'Ahora la otra. Mismo lugar, misma respiración. El cuerpo suele contestar antes que la cabeza, y no siempre lo mismo.',
        pauseSeconds: 5,
      },
    ],
  },
  {
    key: 'presencia',
    title: 'Volver aquí',
    bed: 'ecos-suaves',
    moves: [
      {
        say: 'Trae la intención con la que empezaste esto. La frase con la que la escribiste, tal cual la escribiste.',
        pauseSeconds: 5,
      },
      {
        say: 'No hagas nada con ella. Solamente déjala al lado de la respiración y observa si cambia de forma.',
        pauseSeconds: 5,
      },
      {
        say: 'Lo que aparezca ahora no es una respuesta. Es material, y a veces alcanza con eso.',
        pauseSeconds: 5,
      },
    ],
  },
];

/**
 * Stems, not whole words, and anchored only at the start: "ansiosa" and
 * "decidir" both have to match, and a trailing word boundary would have let
 * every inflected form fall through to the default.
 */
const CORE_HINTS: [RegExp, string][] = [
  [/\b(dormir|sueno|insomnio|de noche|acostar)/, 'dormir'],
  [/\b(ansiedad|ansios|calma|nervios|acelerad|no puedo parar|estres)/, 'calma'],
  [/\b(enoj|bronca|rabia|furia|discusion|pelea|injust)/, 'enojo'],
  [/\b(decid|decision|elegir|no se que hacer|duda|claridad)/, 'claridad'],
];

export function selectCore(intent: string): Core {
  const normalized = normalize(intent);
  const key = CORE_HINTS.find(([pattern]) => pattern.test(normalized))?.[1];
  return CORES.find((core) => core.key === key) ?? CORES[CORES.length - 1]!;
}

/** How many times the deepening pool is walked, per requested length. */
function passesFor(minutes: number): number {
  if (minutes >= 20) return 4;
  if (minutes >= 10) return 2;
  return 1;
}

function moveToSsml(move: Move): string {
  return `  ${escapeXml(move.say)}\n  <break time="${move.pauseSeconds}s"/>`;
}

function restToSsml(narration: string, seconds: number): string {
  const units = Math.round(seconds / REST_UNIT_SECONDS);
  return [
    `  ${escapeXml(narration)}`,
    ...Array.from({ length: units }, () => `  <break time="${REST_UNIT_SECONDS}s"/>`),
  ].join('\n');
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(body: string[]): string {
  return [
    '<speak>',
    `<prosody rate="${Math.round(RATE_DEFAULT * 100)}%">`,
    ...body,
    '</prosody>',
    '</speak>',
  ].join('\n');
}

export function buildMeditationFixture(input: {
  intent: string;
  minutes: number;
}): MeditationScript {
  const core = selectCore(input.intent);
  const passes = passesFor(input.minutes);

  // Where a silence can go: after each walk of the body, and after the work on
  // the intention. Never during the arrival, where the person is still
  // settling, and never during the close, which has to keep moving outward.
  const body: string[] = [...ARRIVAL.map(moveToSsml)];
  const restSlots: number[] = [];

  for (let pass = 0; pass < passes; pass++) {
    if (pass > 0) {
      const bridge = BRIDGES[Math.min(pass - 1, BRIDGES.length - 1)];
      if (bridge) body.push(moveToSsml(bridge));
    }
    body.push(...DEEPENING.map(moveToSsml));
    restSlots.push(body.length);
    body.push('');
  }

  body.push(...core.moves.map(moveToSsml));
  restSlots.push(body.length);
  body.push('');
  body.push(...CLOSING.map(moveToSsml));

  // How much silence each slot has to carry to land near what was asked for.
  const spokenMs = estimateDurationMs(parseSsml(wrap(body.filter((line) => line !== ''))));
  const shortfallSeconds = (input.minutes * 60_000 - spokenMs) / 1000;
  const perSlot = Math.min(
    REST_MAX_SECONDS,
    Math.max(0, Math.round(shortfallSeconds / restSlots.length)),
  );

  for (const [index, slot] of restSlots.entries()) {
    body[slot] =
      perSlot < REST_UNIT_SECONDS
        ? ''
        : restToSsml(RESTS[index % RESTS.length] ?? RESTS[0]!, perSlot);
  }

  const ssml = wrap(body.filter((line) => line !== ''));

  // Derived, never written twice: a transcript that disagrees with what is
  // spoken is worse than no transcript at all.
  return {
    title: core.title,
    script_text: transcriptOf(parseSsml(ssml)),
    script_ssml: ssml,
    bed_track_id: BED_TRACKS.some((b) => b.id === core.bed) ? core.bed : 'silencio',
  };
}

/** What the assembled script actually runs to, which is not always what was
 *  asked for. The screen shows this rather than the request. */
export function estimatedMinutes(script: MeditationScript): number {
  return Math.round(estimateDurationMs(parseSsml(script.script_ssml)) / 60_000);
}
