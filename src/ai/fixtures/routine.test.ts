import { describe, expect, it } from 'vitest';
import { buildRoutineFixture, CURATED_PRACTICES } from './routine';
import { routineResultSchema } from '@/lib/schemas';
import { isInvitation, lintDeep } from '@/lib/copy-lint';
import { lintPhysicalRisk } from '@/lib/physical-risk';

describe('the demo routine (v1.2 R-01)', () => {
  const routine = buildRoutineFixture();

  it('satisfies the contract', () => {
    expect(() => routineResultSchema.parse(routine)).not.toThrow();
  });

  it('passes the copy lint and the physical-risk lint', () => {
    expect(lintDeep(routine)).toEqual([]);
    expect(lintPhysicalRisk(routine, { fastingBarred: true })).toEqual([]);
  });

  it('closes every practice on a question', () => {
    for (const practice of CURATED_PRACTICES) {
      expect(isInvitation(practice.invitation), practice.title).toBe(true);
    }
  });

  it('says what every practice converses with', () => {
    for (const practice of routine.practices) {
      expect(practice.connects_to.soul_map || practice.connects_to.modality_slug !== null).toBe(true);
    }
  });
});
