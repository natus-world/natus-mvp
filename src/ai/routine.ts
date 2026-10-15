import { runAi, type AiResult } from './client';
import { buildRoutineFixture } from './fixtures/routine';
import { routineResultSchema, type RoutineResult, type SoulMapSynthesis } from '@/lib/schemas';

/**
 * v1.2 R-01: one routine, asked for after the therapies are chosen — when the
 * person goes from Caminos to their routine — so it sees the map, the
 * therapies recommended, and which of them the person already set aside.
 */
export async function generateRoutine(input: {
  synthesis: SoulMapSynthesis;
  modalitySlugs: string[];
}): Promise<AiResult<RoutineResult>> {
  const result = await runAi({
    schema: routineResultSchema,
    edge: { fn: 'routine', body: { synthesis: input.synthesis, modalitySlugs: input.modalitySlugs } },
    fixture: () => buildRoutineFixture(),
  });

  // Every connection names a therapy that was sent. The function checks the
  // same; this is the half the caller can check on a fixture too.
  const sent = new Set(input.modalitySlugs);
  for (const practice of result.value.practices) {
    const slug = practice.connects_to.modality_slug;
    if (slug !== null && !sent.has(slug)) throw new Error(`practice connects to ${slug}, which was not recommended`);
  }
  return result;
}
