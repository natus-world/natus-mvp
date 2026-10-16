import { describe, expect, it } from 'vitest';
import {
  ALLOWED_SUBJECT_FIELDS,
  buildComparisonPayload,
  inventedAspect,
  isScopeUsable,
  withCrossAspects,
  type ComparisonScope,
  type ComparisonSource,
} from './comparison-payload.ts';
import type { Numerology } from './schemas/index.ts';
import { buildNatalChart } from './natal-chart.ts';

const CHART = buildNatalChart(
  `<point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" motion="direct" />
<point name="Moon" position="2.00" sign="Scorpio" abs_pos="212.00" motion="direct" />
<point name="Venus" position="20.00" sign="Leo" abs_pos="140.00" motion="direct" />
<point name="Ascendant" position="5.00" sign="Virgo" abs_pos="155.00" motion="direct" />`,
  true,
);

const NUMEROLOGY: Numerology = {
  life_path: 7,
  expression: 3,
  soul_urge: 11,
  personality: 1,
  birthday: 4,
  master_numbers_present: [11],
  algorithm_version: 'pythagorean-v1',
};

/**
 * Loaded with exactly the material that must not travel. These strings are
 * chosen to be unmistakable in a serialised payload: if any of them appears,
 * the test can say which field leaked.
 */
function source(name: string): ComparisonSource {
  return {
    display_name: name,
    numerology: NUMEROLOGY,
    soul_map_themes: ['vinculos', 'autoestima'],
    chart: CHART,
    // Everything below is in the local record and none of it may cross.
    presenting_need_text: `SECRETO_NEED_${name}`,
    clinical_basics: {
      ideation_6m: `SECRETO_IDEACION_${name}`,
      in_treatment: true,
      psychiatric_medication: true,
      notes: `SECRETO_NOTAS_${name}`,
    },
    email: `SECRETO_MAIL_${name}@ejemplo.cl`,
    crisis_events: [{ severity: 'high', matched: `SECRETO_CRISIS_${name}` }],
  };
}

const SCOPES: ComparisonScope[] = [false, true].flatMap((numerology) =>
  [false, true].flatMap((astro) =>
    [false, true].map((soul_map_themes) => ({ numerology, astro, soul_map_themes })),
  ),
);

const label = (scope: ComparisonScope) =>
  `num=${scope.numerology} astro=${scope.astro} temas=${scope.soul_map_themes}`;

describe('the payload cannot carry clinical material, under any scope', () => {
  it.each(SCOPES.map((scope) => [label(scope), scope] as const))('%s', (_label, scope) => {
    const serialised = JSON.stringify(
      buildComparisonPayload({ a: source('A'), b: source('B'), scope }),
    );

    // One assertion per field, so a failure names what leaked rather than just
    // saying the payload was wrong.
    expect(serialised).not.toContain('SECRETO_NEED');
    expect(serialised).not.toContain('SECRETO_IDEACION');
    expect(serialised).not.toContain('SECRETO_NOTAS');
    expect(serialised).not.toContain('SECRETO_MAIL');
    expect(serialised).not.toContain('SECRETO_CRISIS');
    expect(serialised).not.toContain('clinical_basics');
    expect(serialised).not.toContain('presenting_need_text');
  });

  it('holds for both subjects, not only the requester', () => {
    // The other person consented to a comparison, not to being described.
    const serialised = JSON.stringify(
      buildComparisonPayload({
        a: source('A'),
        b: source('B'),
        scope: { numerology: true, astro: true, soul_map_themes: true },
      }),
    );
    expect(serialised).not.toContain('_B');
    expect(serialised).toContain('"display_name":"B"');
  });

  it('carries no field the allow-list does not name', () => {
    const payload = buildComparisonPayload({
      a: source('A'),
      b: source('B'),
      scope: { numerology: true, astro: true, soul_map_themes: true },
    });
    expect(Object.keys(payload.a).sort()).toEqual([...ALLOWED_SUBJECT_FIELDS].sort());
    expect(Object.keys(payload.b).sort()).toEqual([...ALLOWED_SUBJECT_FIELDS].sort());
  });
});

describe('the scope decides what is included', () => {
  it('drops the numbers when numerology is not consented to', () => {
    const payload = buildComparisonPayload({
      a: source('A'),
      b: source('B'),
      scope: { numerology: false, astro: true, soul_map_themes: true },
    });
    expect(payload.a.numerology).toBeNull();
    expect(payload.b.numerology).toBeNull();
  });

  it('drops the chart when astro is not consented to', () => {
    const payload = buildComparisonPayload({
      a: source('A'),
      b: source('B'),
      scope: { numerology: true, astro: false, soul_map_themes: true },
    });
    expect(payload.a.chart).toBeNull();
  });

  it('never sends the Soul Map themes, even under a scope that asks for them (v1.2 C-01)', () => {
    const payload = buildComparisonPayload({
      a: source('A'),
      b: source('B'),
      scope: { numerology: true, astro: true, soul_map_themes: true },
    });
    expect(payload.scope.soul_map_themes).toBe(false);
    expect(payload.a.soul_map_themes).toEqual([]);
    expect(payload.b.soul_map_themes).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain('vinculos');
  });

  it('a scope of themes alone is not a comparison any more', () => {
    expect(isScopeUsable({ numerology: false, astro: false, soul_map_themes: true })).toBe(false);
  });

  it('reports a missing chart as missing rather than as empty positions', () => {
    // The prompt forbids inventing chart positions. A null chart is what
    // makes that rule followable rather than aspirational.
    const withoutChart: ComparisonSource = { ...source('A'), chart: null };
    const payload = buildComparisonPayload({
      a: withoutChart,
      b: source('B'),
      scope: { numerology: true, astro: true, soul_map_themes: true },
    });
    expect(payload.a.chart).toBeNull();
  });

  it('refuses a scope that permits nothing', () => {
    expect(isScopeUsable({ numerology: false, astro: false, soul_map_themes: false })).toBe(false);
    expect(isScopeUsable({ numerology: true, astro: false, soul_map_themes: false })).toBe(true);
  });
});

describe('the payload does not alias the caller data', () => {
  it('copies the arrays, so a later mutation cannot reach a sent payload', () => {
    const a = source('A');
    const payload = buildComparisonPayload({
      a,
      b: source('B'),
      scope: { numerology: true, astro: true, soul_map_themes: true },
    });
    expect(payload.a.soul_map_themes).not.toBe(a.soul_map_themes);
    expect(payload.a.chart?.points[0]).not.toBe(a.chart?.points[0]);
    expect(payload.a.chart?.points[0]).toEqual(a.chart?.points[0]);
  });
});

describe('the aspects between the two charts (v1.2 A-02)', () => {
  it('never arrive with the payload: they are computed from the two charts', () => {
    const payload = buildComparisonPayload({
      a: source('A'),
      b: source('B'),
      scope: { numerology: true, astro: true, soul_map_themes: true },
    });
    expect(payload.aspects).toEqual([]);
  });

  it('are by sign, between the visible planets and the Ascendant, with no orb', () => {
    const payload = withCrossAspects(
      buildComparisonPayload({ a: source('A'), b: source('B'), scope: { numerology: true, astro: true, soul_map_themes: false } }),
    );
    // Sun in Gemini of A and Venus in Leo of B are two signs apart: a sextile.
    expect(payload.aspects).toContainEqual({ a_body: 'Sun', b_body: 'Venus', type: 'sextile' });
    // Gemini and Virgo are three apart: a square, whatever the degrees.
    expect(payload.aspects).toContainEqual({ a_body: 'Sun', b_body: 'Ascendant', type: 'square' });
    // Gemini and Scorpio are five apart: aversion, no aspect.
    expect(payload.aspects.find((a) => a.a_body === 'Sun' && a.b_body === 'Moon')).toBeUndefined();
    expect(JSON.stringify(payload.aspects)).not.toContain('orb');
  });

  it('are none when either chart is missing', () => {
    const payload = withCrossAspects(
      buildComparisonPayload({
        a: { ...source('A'), chart: null },
        b: source('B'),
        scope: { numerology: true, astro: true, soul_map_themes: false },
      }),
    );
    expect(payload.aspects).toEqual([]);
  });
});

describe('rule 5: an aspect that was not computed', () => {
  const computed = [
    { a_body: 'Sun', b_body: 'Moon', type: 'conjunction' },
    { a_body: 'Venus', b_body: 'Mars', type: 'trine' },
  ] as const;

  it('accepts an answer that stays inside the list', () => {
    expect(
      inventedAspect(
        [{ a_body: 'Sun', b_body: 'Moon', type: 'conjunction', reading: '...' }],
        computed,
      ),
    ).toBeNull();
  });

  it('accepts an empty answer', () => {
    expect(inventedAspect([], computed)).toBeNull();
  });

  it('tolerates casing and spacing the model chose', () => {
    expect(
      inventedAspect([{ a_body: 'sun', b_body: 'MOON', type: 'Conjunction ', reading: '.' }], computed),
    ).toBeNull();
  });

  it('catches a wholly invented pair', () => {
    const found = inventedAspect(
      [{ a_body: 'Saturn', b_body: 'Pluto', type: 'square', reading: '...' }],
      computed,
    );
    expect(found?.a_body).toBe('Saturn');
  });

  it('catches a real pair given the wrong aspect', () => {
    // The subtler failure, and the one a summary would carry: the planets are
    // right, so it reads as grounded, and the geometry is invented.
    const found = inventedAspect(
      [{ a_body: 'Venus', b_body: 'Mars', type: 'opposition', reading: '...' }],
      computed,
    );
    expect(found?.type).toBe('opposition');
  });

  it('catches the pair stated backwards', () => {
    // Directional: Sun-of-A to Moon-of-B is not the same reading as
    // Moon-of-A to Sun-of-B.
    const found = inventedAspect(
      [{ a_body: 'Moon', b_body: 'Sun', type: 'conjunction', reading: '...' }],
      computed,
    );
    expect(found?.a_body).toBe('Moon');
  });

  it('rejects everything when nothing was computed', () => {
    const found = inventedAspect(
      [{ a_body: 'Sun', b_body: 'Moon', type: 'conjunction', reading: '...' }],
      [],
    );
    expect(found).not.toBeNull();
  });
});
