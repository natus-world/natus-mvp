import { describe, expect, it } from 'vitest';
import {
  ACTIVE_MODALITIES,
  BED_TRACKS,
  MODALITIES,
  PRESENTING_NEEDS,
  TOPICS,
  crisisResourcesFile,
  expandOpenness,
  hasUnverifiedResources,
  modalityBySlug,
  opennessFile,
  opennessOptionsFor,
} from './catalog.ts';

/**
 * The seed files parse on import — `catalog.ts` calls `.parse`, so a schema
 * violation throws before any of these run. What is tested here is the part a
 * schema cannot express: referential integrity between files, and the
 * invariants the PDR states in prose.
 */

const MVP_COUNTRIES = ['CL', 'MX', 'CO', 'AR', 'PE'] as const;

describe('modalities', () => {
  it('holds the 21 modalities of PDR 5.3 plus the holotropic split of O-04', () => {
    expect(MODALITIES).toHaveLength(22);
  });

  it('has unique slugs', () => {
    expect(new Set(MODALITIES.map((m) => m.slug)).size).toBe(MODALITIES.length);
  });

  it.each(MODALITIES.map((m) => [m.slug, m] as const))(
    '%s only claims topics that exist',
    (_slug, modality) => {
      const known = new Set(TOPICS.map((t) => t.slug));
      for (const topic of modality.works_well_for) {
        expect(known, `unknown topic "${topic}"`).toContain(topic);
      }
    },
  );

  it('marks every removing modality as requiring clinical support', () => {
    // PDR 5.3 names these explicitly. Note that plain breathwork is NOT on the
    // list — the PDR says "breathwork holotrópico", and the seed describes the
    // general practice, whose intense variants are called out in
    // contraindications instead.
    const removing = [
      'constelaciones-familiares',
      'medicina-ancestral',
      'hipnosis',
      'emdr',
      'breathwork-holotropico',
    ];
    for (const slug of removing) {
      expect(modalityBySlug(slug)?.requires_clinical_support, slug).toBe(true);
    }
  });

  it('splits breathwork into conscious and holotropic, as O-04 decides', () => {
    expect(modalityBySlug('breathwork')?.requires_clinical_support).toBe(false);
    const holotropic = modalityBySlug('breathwork-holotropico');
    expect(holotropic?.requires_clinical_support).toBe(true);
    expect(holotropic?.intensity).toBeGreaterThanOrEqual(4);
    expect(holotropic?.is_active).toBe(true);
  });

  it('gives every modality flagged for clinical support a contraindication to show', () => {
    for (const m of MODALITIES.filter((x) => x.requires_clinical_support)) {
      expect(m.contraindications.length, `${m.slug} has no contraindication text`).toBeGreaterThan(
        0,
      );
    }
  });

  it('covers every topic with at least one modality', () => {
    // A topic nothing works for is a hole in the pool: a user describing it
    // would fall through to the empty-pool path on every run.
    for (const topic of TOPICS) {
      const covering = ACTIVE_MODALITIES.filter((m) => m.works_well_for.includes(topic.slug));
      expect(covering.length, `no modality covers "${topic.slug}"`).toBeGreaterThan(0);
    }
  });

  it('offers low-intensity autonomous practices for the empty-pool fallback', () => {
    // PDR 7.2 falls back to contemplative practices when the pool is empty,
    // described to the user as "a starting point". A starting point must be
    // safe: nothing requiring clinical support, nothing confronting.
    const fallback = ACTIVE_MODALITIES.filter((m) => m.family === 'contemplativa');
    expect(fallback.length).toBeGreaterThanOrEqual(4);
    for (const m of fallback) {
      expect(m.requires_clinical_support, `${m.slug} is not a safe starting point`).toBe(false);
      expect(m.intensity, `${m.slug} is too confronting for a fallback`).toBeLessThanOrEqual(3);
    }
  });
});

describe('topics', () => {
  it('holds the 15 topics of PDR 5.3', () => {
    expect(TOPICS).toHaveLength(15);
  });

  it('has unique slugs', () => {
    expect(new Set(TOPICS.map((t) => t.slug)).size).toBe(TOPICS.length);
  });
});

describe('openness options', () => {
  it('expands only to modalities that exist', () => {
    for (const option of opennessFile.options) {
      for (const slug of option.expands_to) {
        expect(modalityBySlug(slug), `${option.slug} expands to unknown "${slug}"`).toBeDefined();
      }
    }
  });

  it('reaches every active modality across all options', () => {
    // A modality no option expands to is unreachable: it would be filtered out
    // of every user's pool without anyone noticing.
    const reachable = new Set(opennessFile.options.flatMap((o) => o.expands_to));
    for (const m of ACTIVE_MODALITIES) {
      expect(reachable, `"${m.slug}" is unreachable from the openness screen`).toContain(m.slug);
    }
  });

  it('applies the O-03 distribution, where a modality may sit in more than one option', () => {
    const groups = Object.fromEntries(
      opennessFile.options.map((o) => [o.slug, [...o.expands_to].sort()]),
    );
    expect(groups.corporal).toEqual(
      [
        'terapia-somatica',
        'biodanza',
        'yoga-terapeutico',
        'breathwork',
        'breathwork-holotropico',
      ].sort(),
    );
    expect(groups.contemplativa).toEqual(
      ['yoga-terapeutico', 'mindfulness-meditacion', 'sound-healing', 'breathwork'].sort(),
    );
    expect(groups.energetica).toEqual(
      ['reiki', 'flores-de-bach', 'medicina-ancestral', 'sound-healing'].sort(),
    );
    expect(groups.simbolica).toEqual(
      [
        'constelaciones-familiares',
        'astrologia-psicologica',
        'numerologia',
        'tarot-terapeutico',
      ].sort(),
    );
    expect(groups.psicologica).toHaveLength(8);
  });

  it('never lists a modality twice within one option', () => {
    for (const option of opennessFile.options) {
      expect(new Set(option.expands_to).size, option.slug).toBe(option.expands_to.length);
    }
  });

  it('describes the professional option as company rather than a credential', () => {
    const option = opennessFile.options.find((o) => o.slug === 'psicologica');
    expect(option?.hint_es).toBe('Hablar con alguien que te acompañe');
  });

  it('restores exactly the options that were chosen, despite the overlap', () => {
    expect(opennessOptionsFor(expandOpenness(['corporal']))).toEqual(['corporal']);
    expect(opennessOptionsFor(expandOpenness(['contemplativa']))).toEqual(['contemplativa']);
    expect(opennessOptionsFor(expandOpenness(['energetica']))).toEqual(['energetica']);
    expect(opennessOptionsFor(expandOpenness(['corporal', 'energetica']))).toEqual([
      'corporal',
      'energetica',
    ]);
    expect(opennessOptionsFor(['me_da_lo_mismo'])).toEqual(['me_da_lo_mismo']);
  });

  it('still recognises a selection stored under the previous distribution', () => {
    expect(opennessOptionsFor(['terapia-somatica', 'biodanza'])).toEqual(['corporal']);
    expect(
      opennessOptionsFor(['yoga-terapeutico', 'mindfulness-meditacion', 'sound-healing', 'breathwork']),
    ).toEqual(['contemplativa']);
  });

  it('lets "me da lo mismo" bypass the restriction entirely', () => {
    expect(expandOpenness(['me_da_lo_mismo', 'corporal'])).toEqual(['me_da_lo_mismo']);
  });

  it('expands a family choice to its member slugs', () => {
    expect(expandOpenness(['corporal'])).toEqual([
      'terapia-somatica',
      'biodanza',
      'yoga-terapeutico',
      'breathwork',
      'breathwork-holotropico',
    ]);
  });

  it('ignores free-text entries without restricting the pool', () => {
    expect(expandOpenness(['otro: algo con caballos'])).toEqual([]);
  });
});

describe('crisis resources', () => {
  it.each(MVP_COUNTRIES)('%s has at least one active resource', (country) => {
    const local = crisisResourcesFile.resources.filter((r) => r.country === country && r.is_active);
    expect(local.length).toBeGreaterThan(0);
  });

  it.each(MVP_COUNTRIES)('%s has an emergency number, not only hotlines', (country) => {
    const local = crisisResourcesFile.resources.filter((r) => r.country === country && r.is_active);
    expect(local.some((r) => r.type === 'emergency')).toBe(true);
  });

  it('always has an international fallback for countries outside the MVP', () => {
    expect(crisisResourcesFile.fallback.url).toContain('findahelpline');
  });

  it('reports every MVP country as verified, and every entry carries a date', () => {
    // The previous version of this said it expected to change the day
    // verification happened, and held `true` until then. The dates were set on
    // 2026-08-19 — see the note at the top of `crisis-resources.json` for what
    // that date records and what it does not.
    //
    // What is worth asserting now is that no entry is left behind: a country
    // with one undated line puts the disclaimer back over the whole list, and
    // that is a state to notice rather than to discover in front of somebody.
    for (const country of MVP_COUNTRIES) {
      expect(hasUnverifiedResources(country), `${country} has an undated line`).toBe(false);
    }
    for (const resource of crisisResourcesFile.resources) {
      expect(resource.verified_at, `${resource.name} has no date`).not.toBeNull();
    }
  });
});

describe('sound beds', () => {
  it('offers a voice-only option so the bed is never mandatory', () => {
    const silent = BED_TRACKS.find((t) => t.synthesis.voices.length === 0 && !t.synthesis.noise);
    expect(silent).toBeDefined();
  });

  it('never presents two different frequencies, which would be binaural', () => {
    // Binaural beats are contraindicated in epilepsy and would require an
    // extra clinical question. Every bed must be identical in both ears; this
    // asserts the data cannot express a per-ear split.
    for (const track of BED_TRACKS) {
      for (const voice of track.synthesis.voices) {
        expect(voice).not.toHaveProperty('pan');
        expect(voice).not.toHaveProperty('ear');
      }
    }
  });
});

describe('presenting needs', () => {
  it('hints only at topics that exist', () => {
    const known = new Set(TOPICS.map((t) => t.slug));
    for (const need of PRESENTING_NEEDS) {
      for (const hint of need.topic_hints) {
        expect(known, `"${need.slug}" hints at unknown topic "${hint}"`).toContain(hint);
      }
    }
  });

  it('never phrases a shortcut as a diagnosis the user applies to themselves', () => {
    // PDR 1.1: the copy must never make the user self-diagnose. The mockups
    // offered "Superar la depresión" and "Reducir ansiedad"; this is the guard
    // against that phrasing coming back.
    const diagnostic = /\b(depresi[oó]n|ansiedad|trastorno|trauma|adicci[oó]n|bipolar|toc)\b/i;
    for (const need of PRESENTING_NEEDS) {
      expect(need.label_es, `"${need.label_es}" names a condition`).not.toMatch(diagnostic);
    }
  });
});
