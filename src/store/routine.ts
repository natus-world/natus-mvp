import { read, write } from './db';
import type { Practice, RoutineResult } from '@/lib/schemas';
import type { StoredMatch } from './matches';

/**
 * The routine (v1.2 R-01): one list, kept practice by practice in
 * `routine_practices`, each with what it converses with and where it came
 * from. Written after the therapies are chosen, so it hangs from the match.
 *
 * Origin is 'ia' for everything this browser writes; a therapist's practice
 * (later) is written by the server into the same list.
 */

export type StoredPractice = Practice & {
  id: string;
  match_id: string | null;
  origin: 'ia' | 'terapeuta' | 'persona';
  prompt_version: string | null;
  is_active: boolean;
  created_at: number;
};

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `practice-${Math.trunc(performance.now())}`;
}

export function listPractices(): StoredPractice[] {
  return read<StoredPractice[]>('routine_practices', []);
}

/**
 * The routine to show for a match. A match made before R-01 carried its own
 * routine inside the result; that one is shown as it was — conversing with
 * the map — so nobody loses the practices they have been marking.
 */
export function routineFor(match: StoredMatch | undefined): Practice[] {
  if (!match) return [];
  const stored = listPractices().filter((p) => p.is_active && p.match_id === match.id);
  if (stored.length > 0) return stored;
  const legacy = (match.result as { routine?: Omit<Practice, 'connects_to'>[] }).routine;
  return (legacy ?? []).map((p) => ({ ...p, connects_to: { soul_map: true, modality_slug: null } }));
}

export function hasRoutine(match: StoredMatch | undefined): boolean {
  return routineFor(match).length > 0;
}

export function saveRoutine(matchId: string, result: RoutineResult, now = Date.now()): StoredPractice[] {
  const fresh: StoredPractice[] = result.practices.map((p) => ({
    ...p,
    id: newId(),
    match_id: matchId,
    origin: 'ia',
    prompt_version: result.prompt_version,
    is_active: true,
    created_at: now,
  }));
  write('routine_practices', [
    // Only the model's practices step aside: one from a therapist stays.
    ...listPractices().map((p) => (p.origin === 'ia' ? { ...p, is_active: false } : p)),
    ...fresh,
  ]);
  return fresh;
}
