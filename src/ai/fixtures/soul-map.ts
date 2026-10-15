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
  tips: [
    {
      title: 'Anotar la hora en que se apaga',
      body: 'Durante una semana, escribe a qué hora del día se te cae la energía y qué estabas haciendo justo antes. No busques explicarlo. Lo que aparece dos o tres veces suele ser más informativo que lo que se te ocurre pensando.',
      invitation: '¿Lo pruebas una semana y después lo miras?',
      cadence: 'daily',
    },
    {
      title: 'Una caminata sin destino',
      body: 'Veinte minutos, sin teléfono, sin podcast, sin llegar a ningún lado. Cuando el cuerpo se mueve y la cabeza no tiene una tarea, aparecen frases que en el escritorio no aparecen.',
      invitation: '¿La sumas como experimento esta semana?',
      cadence: 'weekly',
    },
    {
      title: 'La pregunta escrita a mano',
      body: 'Escribe en un papel, a mano, la pregunta que te estás haciendo. Después reescríbela tres veces, cada vez más corta. La versión de cinco palabras suele ser bastante más honesta que la primera.',
      invitation: '¿Te animas a la versión de cinco palabras?',
      cadence: 'one_off',
    },
  ],
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
  tips: [
    {
      title: 'Registrar el momento anterior',
      body: 'Cuando el patrón empiece, anota lo que pasó en los cinco minutos previos: dónde estabas, con quién, qué se dijo. El disparador casi nunca está en el momento fuerte, sino un rato antes.',
      invitation: '¿Lo registras las próximas tres veces que pase?',
      cadence: 'process',
    },
    {
      title: 'Respiración larga antes de responder',
      body: 'Cuando notes que se activa, alarga la exhalación al doble de la inhalación durante un minuto antes de contestar. No cambia el conflicto; cambia desde qué estado lo estás abordando.',
      invitation: '¿Pruebas un minuto la próxima vez?',
      cadence: 'daily',
    },
    {
      title: 'La frase que no dijiste',
      body: 'Después de cada episodio, escribe la frase que te quedó dentro. No para enviarla. Reunir cinco o seis de esas frases suele mostrar un reclamo que es siempre el mismo con distinta forma.',
      invitation: '¿Reúnes unas cuantas y las lees todas juntas?',
      cadence: 'process',
    },
    {
      title: 'Un límite pequeño y verificable',
      body: 'Elige una situación menor en la que practicar decir que no. Pequeña de verdad: un mensaje que no respondes al instante. Los límites grandes se sostienen sobre la evidencia de que los pequeños no rompieron nada.',
      invitation: '¿Cuál sería el más pequeño que se te ocurre?',
      cadence: 'weekly',
    },
  ],
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
  tips: [
    {
      title: 'Diez minutos fijos, mismo horario',
      body: 'Elige un momento del día y sostén ahí una práctica corta de atención. Lo que la hace funcionar en esta etapa no es la duración sino que el horario no se negocie cada mañana.',
      invitation: '¿Qué horario sería el más difícil de perder?',
      cadence: 'daily',
    },
    {
      title: 'Escribir lo que ya no volvió',
      body: 'Haz una lista de cosas que antes te pasaban y hace meses que no. Los cambios de esta etapa son sustracciones, y las sustracciones son casi invisibles si no se anotan.',
      invitation: '¿Armas la lista y la relees en un mes?',
      cadence: 'one_off',
    },
    {
      title: 'Una conversación por mes',
      body: 'Una conversación mensual con alguien que te conozca de antes y de ahora. En integración no hace falta frecuencia alta; hace falta un espejo que registre el contraste.',
      invitation: '¿Quién sería esa persona?',
      cadence: 'weekly',
    },
  ],
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
