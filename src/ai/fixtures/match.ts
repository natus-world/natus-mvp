import { MATCH_PROMPT_VERSION } from '../prompts/versions';
import { fallbackRanking, type FilterOutcome } from '@/lib/matching';
import type { MatchResult, SoulMapSynthesis } from '@/lib/schemas';

/**
 * Curated reasonings for fixture mode.
 *
 * Written per modality rather than per user, then assembled against whatever
 * the hard filter actually returned. That keeps the deterministic half real:
 * the pool is genuinely computed from the person's answers, and only the
 * prose is canned.
 *
 * Every string here passes the copy lint through `runAi`, and a test asserts
 * the sentence budget of PDR 7.5.
 */

const REASONINGS: Record<string, string> = {
  'terapia-somatica':
    'Cuentas algo que se repite y que ya reconoces mientras pasa, y aun así no puedes frenarlo. La terapia somática trabaja exactamente en esa distancia: pone la atención en la sensación física antes que en el relato, porque lo que se repite suele estar sostenido en el cuerpo. Se avanza en dosis pequeñas, alternando entre acercarse a lo difícil y volver a un lugar estable.',
  biodanza:
    'Cuando el registro mental ya dio lo que tenía para dar, mover el cuerpo con otros abre otra puerta. En biodanza no hay pasos que aprender ni nada que interpretar: se camina, se encuentra, se para, con música y consignas simples. Suele acompañar bien a quien viene pensando mucho y sintiendo poco.',
  'yoga-terapeutico':
    'Lo que describes aparece en el cuerpo antes que en la cabeza. El yoga terapéutico arma una secuencia corta para algo puntual —dormir mejor, bajar la activación— con posturas sostenidas y atención a la respiración. La idea es que después la practiques por tu cuenta en diez minutos, sin depender de una clase.',
  'mindfulness-meditacion':
    'Hay un patrón que reconoces en el momento en que sucede, y ese reconocimiento todavía no alcanza para interrumpirlo. La práctica de atención entrena justamente ese instante: notar que la cabeza se fue y volver, sin castigo. Es de lo más estudiado de esta lista y se sostiene en diez minutos diarios.',
  breathwork:
    'Mencionas una activación que aparece rápido y se va lenta. La respiración pautada cambia el estado del cuerpo en cuestión de minutos, alargando la exhalación o contando tiempos. Es de lo más fácil de llevarse a casa y de usar justo cuando hace falta.',
  'breathwork-holotropico':
    'Aparece en lo que cuentas algo que pide más que entenderlo con la cabeza. El breathwork holotrópico es un taller largo y guiado donde una respiración rápida y sostenida abre un estado poco habitual, y desde ahí suelen aparecer emociones o recuerdos con mucha fuerza. Es de lo más intenso de esta lista, y lo que se mueve ahí suele necesitar acompañamiento en los días siguientes.',
  'sound-healing':
    'Cuando cuesta parar, una práctica que no pide hacer nada puede entrar mejor que una que pide esfuerzo. En sound healing te recuestas y escuchas cuencos o gongs durante unos cuarenta minutos. La mayoría se duerme, y ese descanso profundo suele ser el valor real.',
  'psicologia-clinica':
    'Lo que cuentas tiene la forma de algo sostenido en el tiempo, no de un episodio suelto. La psicología clínica ofrece un espacio semanal con alguien formado para acompañar procesos así, y el vínculo que se arma ahí es lo que sostiene el trabajo. Los primeros encuentros sirven también para ver si esa persona te hace sentido.',
  'terapia-gestalt':
    'Dices que entiendes el patrón y que aun así se repite. La gestalt no busca explicarlo mejor: mira cómo aparece en la sesión misma, en el gesto que haces al contarlo o en la frase que se te corta. Trabaja con lo que pasa ahora, no con la reconstrucción de por qué empezó.',
  'terapia-sistemica':
    'Nombras una relación que no sabes cómo sostener. La terapia sistémica mira el problema como algo del vínculo y no de una persona, rastreando qué hace el sistema para que la situación siga en su lugar. Se puede ir a título individual, en pareja o en familia.',
  tcc: 'Traes algo bastante delimitado, y eso permite trabajar con estructura. La terapia cognitivo-conductual acuerda objetivos concretos desde el principio, con registros entre sesiones y experimentos en tu vida real para comprobar si lo que supones se cumple. Suele durar entre tres y seis meses.',
  'coaching-ontologico':
    'Lo que describes suena a una decisión atascada más que a algo para procesar. El coaching ontológico trabaja sobre una situación puntual que quieres mover, con compromisos concretos para la semana siguiente. No es terapia, y un buen coach te lo dice si aparece algo que la necesita.',
  'astrologia-psicologica':
    'Buscas vocabulario para nombrar algo que todavía no tiene nombre. La astrología psicológica usa la carta como lengua para eso: alguien la lee contigo y traduce sus figuras a preguntas sobre tu vida. No predice nada, y funciona como espejo más que como respuesta.',
  numerologia:
    'Tus números ya están sobre la mesa y hay maestros entre ellos. Trabajar la numerología con alguien convierte esa lectura en conversación, más parecida a un test proyectivo que a un diagnóstico. Es un punto de entrada ligero cuando otras puertas se sienten pesadas.',
  'tarot-terapeutico':
    'Cuando la pregunta todavía no está formulada, una imagen a veces la ordena mejor que una explicación. El tarot terapéutico saca cartas y conversa sobre lo que sus imágenes te evocan a ti, no sobre lo que significan en un manual. La versión terapéutica no habla del futuro.',
  reiki:
    'Describes un cansancio que no se resuelve durmiendo. El reiki es una sesión pasiva: te recuestas con ropa y alguien apoya las manos durante unos cuarenta minutos, casi sin hablar. Lo que está documentado es el efecto de una hora de descanso, contacto y atención sostenida.',
  'flores-de-bach':
    'Es una entrada de baja exigencia si otras se sienten grandes. Se conversa una hora sobre cómo estás y se prepara una mezcla que se toma en gotas algunas semanas, revisándola después. Los ensayos no encuentran efecto más allá del placebo, y la conversación pautada cada tantas semanas sí existe.',
  'psicologia-transpersonal':
    'Aparece en lo que cuentas una pregunta de sentido que no entra cómoda en un marco clínico. La psicología transpersonal toma ese material como legítimo en vez de sortearlo, trabajando con biografía, símbolo e imaginación. No pide creer en nada en particular.',
  hipnosis:
    'Hay algo que se dispara antes de que puedas pensarlo. La hipnoterapia trabaja desde un estado de atención focalizada, parecido a perderse en una película, donde se revisan escenas concretas o se acuerdan sugestiones de antemano. No se pierde el control y se puede interrumpir en cualquier momento.',
  emdr: 'Lo que cuentas apunta a un recuerdo concreto con carga que no bajó con el tiempo. EMDR trabaja ese recuerdo con estímulos alternados de lado a lado, en tandas cortas con pausas, sin que tengas que contarlo en detalle. Es un protocolo con pasos, no una conversación.',
  'constelaciones-familiares':
    'Lo que se repite en tu relato tiene forma de herencia familiar. En constelaciones eliges personas de un grupo para ocupar el lugar de miembros de tu familia y se observa qué pasa en el espacio. Es breve, muy cargado, y sin respaldo clínico: es una práctica de tradición.',
  'medicina-ancestral':
    'Aparece en lo que cuentas una búsqueda que excede lo psicológico. Las ceremonias de tradición indígena se hacen en grupo, con guía, y pueden durar una noche entera. Lo que se mueve ahí suele necesitar semanas de integración después.',
};

const CAUTIONS: Record<string, string> = {
  'constelaciones-familiares':
    'Es de lo más removedor de la lista y expone tu historia familiar frente a un grupo. Conviene tener un espacio terapéutico sostenido antes y después, y no entrar en medio de un duelo reciente.',
  'medicina-ancestral':
    'Está contraindicada con antecedentes psicóticos, bipolaridad o medicación psiquiátrica activa, y las plantas tienen interacciones graves con antidepresivos. El marco legal varía según el país.',
  hipnosis:
    'Requiere un profesional formado y está desaconsejada en cuadros psicóticos o disociativos. Pregunta por la formación específica antes de empezar.',
  'breathwork-holotropico':
    'La respiración sostenida está contraindicada en embarazo, epilepsia, glaucoma, hipertensión o problemas cardíacos: ante cualquiera de ellos, consulta antes con un médico. También se desaconseja con antecedentes psicóticos, bipolaridad o medicación psiquiátrica activa, y conviene contar con un espacio terapéutico para integrar lo que aparezca.',
  emdr: 'Pide cierta estabilidad previa: no se empieza en medio de una crisis aguda. Busca a alguien con formación acreditada en el protocolo.',
};

/**
 * Assemble a match from the pool the hard filter actually produced.
 *
 * When a candidate has no curated reasoning — which happens if the catalogue
 * grows and this file does not — it falls back to the catalogue's own
 * description rather than inventing one. A test keeps that from going
 * unnoticed.
 */
export function buildMatchFixture(input: {
  outcome: FilterOutcome;
  synthesis: SoulMapSynthesis;
}): MatchResult {
  const ranked = fallbackRanking(input.outcome, input.synthesis.inferred_topics, 5);
  const chosen = ranked.slice(0, Math.max(3, Math.min(5, ranked.length)));

  return {
    prompt_version: MATCH_PROMPT_VERSION,
    matched_modalities: chosen.map((entry, index) => ({
      modality_slug: entry.modality.slug,
      rank: index + 1,
      reasoning: REASONINGS[entry.modality.slug] ?? entry.reasoning,
      caution_note: entry.modality.requires_clinical_support
        ? (CAUTIONS[entry.modality.slug] ?? entry.modality.contraindications.join(' '))
        : null,
    })),
  };
}

export const CURATED_REASONING_SLUGS = Object.keys(REASONINGS);
