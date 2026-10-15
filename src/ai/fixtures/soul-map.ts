import type { SoulMapCrisis, SoulMapSynthesis } from '@/lib/schemas';
import type { OnboardingDraft } from '@/store/session';

/**
 * Curated Soul Maps for fixture mode.
 *
 * Written by hand, and held to exactly the standard the prompt asks of the
 * model: the copy lint runs over these in `runAi` and in a test, so a fixture
 * that slips into an order, a promise or a percentage fails the build.
 *
 * Three narratives rather than one. A demo where every answer is identical
 * teaches the viewer that nothing is really being read.
 */

const PREGUNTA: SoulMapSynthesis = {
  detected_phase: 'pregunta',
  detected_mode: 'abierto',
  soul_map_synthesis: {
    tu_camino:
      'Hay algo en tu mapa que insiste en empezar de nuevo. Los números hablan de alguien que abre caminos antes de saber a dónde llevan, y que después se queda con la pregunta de si eligió bien. No es indecisión: es que necesitas sentir el terreno antes de comprometerte con él. Lo que cuentas suena a un momento en el que ese modo de avanzar dejó de alcanzar.',
    lo_que_estas_trabajando:
      'Dices que algo tiene que cambiar y que no sabes qué. Esa frase suele aparecer cuando la vida todavía funciona por fuera y ya no por dentro, y no hay un hecho puntual al que señalar. Estás sosteniendo una incomodidad sin nombre, y eso agota mucho más que sostener un problema concreto. Nombrarla es el trabajo, no el prólogo del trabajo.',
    que_necesitas_ahora:
      'Este momento pide menos respuesta y más precisión en la pregunta. Antes de decidir qué cambiar, hace falta saber qué se está gastando. Un espacio donde pensar en voz alta, sin tener que llegar a una conclusión.',
  },
  follow_up_invitation: '¿Qué fue lo último que te sacó de esa sensación, aunque haya durado poco?',
  inferred_topics: ['proposito', 'transiciones'],
};

const EXPLORACION: SoulMapSynthesis = {
  detected_phase: 'exploracion',
  detected_mode: 'objetivo',
  soul_map_synthesis: {
    tu_camino:
      'Tu mapa insiste en el vínculo. Los números apuntan a alguien que registra el estado de los demás antes que el propio, y que aprendió temprano que sostener era su lugar. Eso construyó una capacidad real de cuidado, y también una deuda: la práctica de preguntarte qué necesitas quedó sin entrenar.',
    lo_que_estas_trabajando:
      'Lo que cuentas tiene la forma de algo que se repite y todavía no tiene nombre. No es un episodio: es un patrón que ya reconoces mientras está pasando, y que aun así no puedes frenar. Ese reconocimiento sin capacidad de interrumpir agota de un modo particular, porque suma la sensación de estar fallando en algo que ya entiendes.',
    que_necesitas_ahora:
      'Entender el patrón ya no está alcanzando, y eso no es un déficit tuyo. Lo que se repite suele estar sostenido en el cuerpo y en el vínculo, no solo en la comprensión. Este momento pide un espacio donde el patrón pueda aparecer con alguien delante.',
  },
  follow_up_invitation: '¿Cuándo fue la primera vez que recuerdas haber hecho esto mismo?',
  inferred_topics: ['pareja', 'autoestima', 'familia'],
};

const INTEGRACION: SoulMapSynthesis = {
  detected_phase: 'integracion',
  detected_mode: 'objetivo',
  soul_map_synthesis: {
    tu_camino:
      'Tu mapa habla de alguien que atravesó algo y salió con material nuevo. Los números sugieren una estructura que sostiene bien la intensidad y que después necesita tiempo largo para asentarla. Lo que estás haciendo ahora no es empezar: es guardar bien lo que ya pasó.',
    lo_que_estas_trabajando:
      'Lo que cuentas no suena a crisis sino a la parte silenciosa que viene después. Hay una vida que ya cambió y una manera de habitarla que todavía no se terminó de armar. Esa etapa se nota menos y se abandona más fácil, porque desde afuera parece que ya está resuelto.',
    que_necesitas_ahora:
      'Este tramo pide horizonte corto y práctica propia más que proceso largo con otro. Sostener lo que ya sabes, en formatos que puedas mantener por tu cuenta.',
  },
  follow_up_invitation: '¿Qué de todo esto te gustaría que siga estando dentro de un año?',
  inferred_topics: ['transiciones', 'espiritualidad', 'proposito'],
};

/**
 * Layer 2's crisis output. Layer 1 catches the explicit cases before a token
 * is spent, so in practice the flow rarely reaches this — it exists because
 * the contract has a crisis branch and a fixture that could not produce it
 * would leave that branch untested.
 */
export const CRISIS_FIXTURE: SoulMapCrisis = {
  detected_phase: 'crisis',
  crisis_response:
    'Lo que cuentas no es algo para atravesar sin compañía, y no es algo que un mapa simbólico pueda acompañar. Hay gente disponible para hablar ahora mismo, sin turno y sin costo. Lo que sigue son formas de contactarlas.',
  follow_up_invitation: '¿Hay alguien cerca tuyo con quien puedas estar en este rato?',
};

const NARRATIVES = { PREGUNTA, EXPLORACION, INTEGRACION };

/**
 * Pick a narrative from what the person actually chose.
 *
 * Deterministic, so the same input always produces the same map — a live demo
 * where refreshing changes the reading would undermine the thing being shown.
 */
export function selectSoulMapFixture(draft: OnboardingDraft): SoulMapSynthesis {
  const slugs = new Set(draft.presenting_need_slugs);
  const text = draft.presenting_need_text.toLowerCase();

  if (slugs.has('repito-algo') || slugs.has('relacion-trabada') || /repit|siempre lo mismo|pareja/.test(text)) {
    return NARRATIVES.EXPLORACION;
  }
  if (slugs.has('perdida') || /duelo|perd[ií]|muri[oó]/.test(text)) {
    return NARRATIVES.INTEGRACION;
  }
  return NARRATIVES.PREGUNTA;
}

export const ALL_SOUL_MAP_FIXTURES = [PREGUNTA, EXPLORACION, INTEGRACION];
