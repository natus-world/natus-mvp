import { describe, expect, it } from 'vitest';
import {
  MAX_POOL,
  MIN_POOL,
  fallbackRanking,
  filterModalities,
  modalityDistance,
  optionDistances,
  poolFraming,
} from './matching.ts';
import { ACTIVE_MODALITIES, expandOpenness, modalityBySlug } from './catalog.ts';

/** Every slug, as the "me da lo mismo" case produces. */
const ANY = ['me_da_lo_mismo'];

describe('the three predicates of PDR 7.2', () => {
  it('restricts nothing when the person said it makes no difference', () => {
    const { candidates } = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(candidates.length).toBe(Math.min(ACTIVE_MODALITIES.length, MAX_POOL));
  });

  it('keeps only what the person is open to', () => {
    const openness = [
      'terapia-somatica',
      'biodanza',
      'yoga-terapeutico',
      'breathwork',
      'sound-healing',
      'reiki',
    ];
    const { candidates, addedForFloor } = filterModalities({
      openness,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(candidates.map((m) => m.slug).sort()).toEqual([...openness].sort());
    expect(addedForFloor).toEqual([]);
  });

  it('keeps only what shares a topic with what was inferred', () => {
    const { candidates } = filterModalities({
      openness: ANY,
      inferredTopics: ['duelo'],
      clinicallyVulnerable: false,
    });
    for (const m of candidates) {
      expect(m.works_well_for, m.slug).toContain('duelo');
    }
  });
});

describe('clinical vulnerability outranks preference', () => {
  it('removes every modality requiring clinical support', () => {
    const { candidates, excludedForVulnerability } = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: true,
    });

    expect(candidates.every((m) => !m.requires_clinical_support)).toBe(true);
    expect(excludedForVulnerability.length).toBeGreaterThan(0);
    expect(excludedForVulnerability).toContain('constelaciones-familiares');
    expect(excludedForVulnerability).toContain('medicina-ancestral');
  });

  it('removes them even when the person asked for exactly that', () => {
    // The whole point of the predicate: someone in a vulnerable moment asking
    // for constellations is the case it exists to catch.
    const { candidates, strategy } = filterModalities({
      openness: ['constelaciones-familiares'],
      inferredTopics: [],
      clinicallyVulnerable: true,
    });
    expect(candidates.map((m) => m.slug)).not.toContain('constelaciones-familiares');
    expect(strategy).toBe('contemplative-fallback');
  });
});

describe('edge case 1 — an empty pool', () => {
  it('retries without the topical predicate before giving up', () => {
    // A topic nothing claims. Openness is wide, so relaxing topics recovers.
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: ['un-tema-que-no-existe'],
      clinicallyVulnerable: false,
    });
    expect(outcome.strategy).toBe('relaxed');
    expect(outcome.candidates.length).toBeGreaterThan(0);
  });

  it('falls back to contemplative practices when even that is empty', () => {
    const outcome = filterModalities({
      openness: ['una-modalidad-inexistente'],
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.strategy).toBe('contemplative-fallback');
    const added = new Set(outcome.addedForFloor);
    const fallback = outcome.candidates.filter((m) => !added.has(m.slug));
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.every((m) => m.family === 'contemplativa')).toBe(true);
  });

  it('keeps the fallback safe for the person it just protected', () => {
    // Reaching the fallback often means the filter removed everything for
    // clinical reasons. Offering a removing modality there would undo it.
    const outcome = filterModalities({
      openness: ['constelaciones-familiares'],
      inferredTopics: [],
      clinicallyVulnerable: true,
    });
    expect(outcome.candidates.every((m) => !m.requires_clinical_support)).toBe(true);
    expect(outcome.candidates.every((m) => m.intensity <= 3)).toBe(true);
  });
});

describe('O-03 — the minimum candidate floor', () => {
  const corporal = expandOpenness(['corporal']);

  it('tops a pool of fewer than five up to five', () => {
    const outcome = filterModalities({
      openness: ['numerologia'],
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.candidates).toHaveLength(MIN_POOL);
    expect(outcome.candidates.map((m) => m.slug)).toContain('numerologia');
    expect(outcome.addedForFloor).toHaveLength(MIN_POOL - 1);
    expect(outcome.strategy).toBe('topical');
  });

  it('leaves a pool of five or more alone', () => {
    const outcome = filterModalities({
      openness: corporal,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.addedForFloor).toEqual([]);
    expect(outcome.candidates.map((m) => m.slug).sort()).toEqual([...corporal].sort());
  });

  it('never re-admits a clinically excluded modality', () => {
    const removing = ACTIVE_MODALITIES.filter((m) => m.requires_clinical_support).map((m) => m.slug);
    for (const openness of [['constelaciones-familiares'], corporal, ['numerologia'], ['emdr', 'tcc']]) {
      const outcome = filterModalities({ openness, inferredTopics: [], clinicallyVulnerable: true });
      expect(outcome.candidates.length, openness.join()).toBeGreaterThanOrEqual(MIN_POOL);
      for (const slug of outcome.addedForFloor ?? []) {
        expect(removing, slug).not.toContain(slug);
      }
      expect(outcome.candidates.every((m) => !m.requires_clinical_support), openness.join()).toBe(
        true,
      );
    }
  });

  it('never re-admits a dismissed modality', () => {
    const outcome = filterModalities({
      openness: ['numerologia'],
      inferredTopics: [],
      clinicallyVulnerable: false,
      dismissedSlugs: ['astrologia-psicologica', 'tarot-terapeutico'],
    });
    const slugs = outcome.candidates.map((m) => m.slug);
    expect(slugs).not.toContain('astrologia-psicologica');
    expect(slugs).not.toContain('tarot-terapeutico');
    expect(slugs).toHaveLength(MIN_POOL);
  });

  it('takes the rest of the chosen group first', () => {
    const outcome = filterModalities({
      openness: ['numerologia'],
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.addedForFloor!.slice(0, 2).sort()).toEqual(
      ['astrologia-psicologica', 'tarot-terapeutico'].sort(),
    );
  });

  it('reaches into the neighbouring group before unrelated ones', () => {
    const outcome = filterModalities({
      openness: corporal,
      inferredTopics: [],
      clinicallyVulnerable: true,
    });
    expect(outcome.excludedForVulnerability).toContain('breathwork-holotropico');
    expect(outcome.addedForFloor).toEqual(['sound-healing']);
  });

  it('measures closeness as steps between options that share a modality', () => {
    const distances = optionDistances(expandOpenness(['corporal']));
    expect(distances.get('corporal')).toBe(0);
    expect(distances.get('contemplativa')).toBe(1);
    expect(distances.get('energetica')).toBe(2);
    expect(distances.has('simbolica')).toBe(false);
    expect(modalityDistance('mindfulness-meditacion', distances)).toBe(1);
    expect(modalityDistance('reiki', distances)).toBe(2);
    expect(modalityDistance('numerologia', distances)).toBe(Number.POSITIVE_INFINITY);
  });

  it('prefers what shares a topic with what was inferred, among equally close ones', () => {
    const outcome = filterModalities({
      openness: ['numerologia'],
      inferredTopics: ['pareja'],
      clinicallyVulnerable: false,
    });
    expect(outcome.strategy).toBe('relaxed');
    expect(outcome.addedForFloor![0]).toBe('tarot-terapeutico');
    expect(modalityBySlug('tarot-terapeutico')!.works_well_for).toContain('pareja');
    expect(modalityBySlug('astrologia-psicologica')!.works_well_for).not.toContain('pareja');
  });

  it('is deterministic', () => {
    const input = { openness: ['numerologia'], inferredTopics: ['duelo'], clinicallyVulnerable: false };
    expect(filterModalities(input).addedForFloor).toEqual(filterModalities(input).addedForFloor);
  });
});

describe('O-03 — "solo cuerpo" is no longer a pool of two', () => {
  it('yields at least five candidates from that option alone', () => {
    for (const clinicallyVulnerable of [false, true]) {
      const outcome = filterModalities({
        openness: expandOpenness(['corporal']),
        inferredTopics: [],
        clinicallyVulnerable,
      });
      expect(outcome.candidates.length, String(clinicallyVulnerable)).toBeGreaterThanOrEqual(5);
      expect(outcome.candidates.map((m) => m.slug)).toContain('biodanza');
    }
  });
});

describe('O-04 — holotropic breathwork', () => {
  it('is excluded under clinical vulnerability while conscious breathing stays', () => {
    const outcome = filterModalities({
      openness: expandOpenness(['corporal']),
      inferredTopics: [],
      clinicallyVulnerable: true,
    });
    const slugs = outcome.candidates.map((m) => m.slug);
    expect(slugs).not.toContain('breathwork-holotropico');
    expect(slugs).toContain('breathwork');
    expect(outcome.excludedForVulnerability).toContain('breathwork-holotropico');
  });

  it('is offered when the person is not vulnerable', () => {
    const outcome = filterModalities({
      openness: expandOpenness(['corporal']),
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.candidates.map((m) => m.slug)).toContain('breathwork-holotropico');
  });
});

describe('edge case 3 — a pool over twelve', () => {
  it('truncates to twelve', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.candidates).toHaveLength(MAX_POOL);
  });

  it('reports how many it dropped rather than truncating silently', () => {
    // PDR 7.2 states this in exactly those words.
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(outcome.droppedForSize).toBe(ACTIVE_MODALITIES.length - MAX_POOL);
    expect(outcome.poolBeforeTruncation).toBe(ACTIVE_MODALITIES.length);
  });

  it('cuts from the most confronting end, keeping the gentlest', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    const keptMax = Math.max(...outcome.candidates.map((m) => m.intensity));
    const droppedSlugs = ACTIVE_MODALITIES.filter(
      (m) => !outcome.candidates.some((c) => c.slug === m.slug),
    );
    const droppedMin = Math.min(...droppedSlugs.map((m) => m.intensity));
    expect(keptMax).toBeLessThanOrEqual(droppedMin);
  });

  it('is deterministic across runs', () => {
    const input = { openness: ANY, inferredTopics: [], clinicallyVulnerable: false } as const;
    expect(filterModalities(input).candidates.map((m) => m.slug)).toEqual(
      filterModalities(input).candidates.map((m) => m.slug),
    );
  });
});

describe('edge case 4 — the model fails', () => {
  it('ranks by topic overlap and builds reasoning from the catalogue', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: ['trauma', 'ansiedad'],
      clinicallyVulnerable: false,
    });
    const ranked = fallbackRanking(outcome, ['trauma', 'ansiedad']);

    expect(ranked).toHaveLength(3);
    expect(ranked[0]!.overlap).toBeGreaterThanOrEqual(ranked[1]!.overlap);
    // Reasoning is assembled from the seed, never invented.
    const first = ranked[0]!;
    expect(first.reasoning).toContain(first.modality.short_description);
  });

  it('is deterministic when overlap ties', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: ['ansiedad'],
      clinicallyVulnerable: false,
    });
    expect(fallbackRanking(outcome, ['ansiedad']).map((r) => r.modality.slug)).toEqual(
      fallbackRanking(outcome, ['ansiedad']).map((r) => r.modality.slug),
    );
  });
});

describe('US-6.2 CA3 — a dismissed modality does not come back', () => {
  it('excludes it from a re-match', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: [],
      clinicallyVulnerable: false,
      dismissedSlugs: ['terapia-somatica'],
    });
    expect(outcome.candidates.map((m) => m.slug)).not.toContain('terapia-somatica');
    expect(outcome.excludedForDismissal).toContain('terapia-somatica');
  });

  it('does not let dismissals empty the pool without the fallback catching it', () => {
    const outcome = filterModalities({
      openness: ['numerologia'],
      inferredTopics: [],
      clinicallyVulnerable: false,
      dismissedSlugs: ['numerologia'],
    });
    expect(outcome.strategy).toBe('contemplative-fallback');
    expect(outcome.candidates.length).toBeGreaterThan(0);
  });
});

describe('what the person is told about their pool', () => {
  it('admits when it could not narrow things down', () => {
    const outcome = filterModalities({
      openness: ['inexistente'],
      inferredTopics: [],
      clinicallyVulnerable: false,
    });
    expect(poolFraming(outcome)).toBe('contemplative-fallback');
  });

  it('never claims certainty about the ranking', () => {
    const outcome = filterModalities({
      openness: ANY,
      inferredTopics: ['ansiedad'],
      clinicallyVulnerable: false,
    });
    expect(poolFraming(outcome)).toBe('ordered');
  });
});

describe('the catalogue itself', () => {
  it('has a modality for the fallback to offer', () => {
    expect(modalityBySlug('mindfulness-meditacion')?.family).toBe('contemplativa');
  });
});
