import { ROUTINE_PROMPT_VERSION } from '../prompts/versions';
import type { Practice, RoutineResult } from '@/lib/schemas';

/**
 * A curated routine for the demo build (v1.2 R-01). Concrete practices that
 * close on a question, each declaring what it converses with. They speak to
 * the map in general, so none claims a therapy it does not mention.
 */

const PRACTICES: Omit<Practice, 'connects_to'>[] = [
  {
    title: 'Respiración 4-7-8 antes de dormir',
    body: 'Inhalas cuatro tiempos, sostienes siete, exhalas ocho, cuatro veces. Es de lo más directo para bajar la activación nocturna, y funciona incluso los días en que nada más funcionó.',
    invitation: '¿Te hace sentido probarla esta semana y ver qué se mueve?',
    cadence: 'daily',
  },
  {
    title: 'Caminata de veinte minutos sin teléfono',
    body: 'Sin podcast, sin destino. Cuando el cuerpo se mueve y la cabeza no tiene tarea aparecen frases que en reposo no aparecen.',
    invitation: '¿La sumas como experimento esta semana?',
    cadence: 'weekly',
  },
  {
    title: 'Anotar el momento anterior',
    body: 'Cuando el patrón empiece, escribe lo que pasó en los cinco minutos previos. El disparador casi nunca está en el momento fuerte, sino un rato antes.',
    invitation: '¿Lo registras las próximas tres veces que pase?',
    cadence: 'process',
  },
  {
    title: 'Una conversación que vienes postergando',
    body: 'Elige la más pequeña de las que estás evitando, no la más importante. Las conversaciones grandes se sostienen sobre la evidencia de que las pequeñas no rompieron nada.',
    invitation: '¿Cuál sería la más pequeña que se te ocurre?',
    cadence: 'one_off',
  },
];

/** The demo's routine: the curated practices, each conversing with the map. */
export function buildRoutineFixture(): RoutineResult {
  return {
    prompt_version: ROUTINE_PROMPT_VERSION,
    practices: PRACTICES.slice(0, 4).map((practice) => ({
      ...practice,
      connects_to: { soul_map: true, modality_slug: null },
    })),
  };
}

export const CURATED_PRACTICES = PRACTICES;
