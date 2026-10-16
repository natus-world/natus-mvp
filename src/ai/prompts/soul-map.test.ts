import { describe, expect, it } from 'vitest';
import { emptyDraft } from '@/store/session';
import { soulMapDraftSchema } from '@/lib/model-input';
import { SOUL_MAP_SYSTEM_PROMPT, buildSoulMapUserMessage } from './soul-map';

const CONTEXT = `<chart_analysis><planets>
<point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" house="Tenth House" motion="direct" />
<point name="Moon" position="2.00" sign="Taurus" abs_pos="32.00" house="Ninth House" motion="direct" />
<point name="Mercury" position="28.00" sign="Gemini" abs_pos="88.00" house="Tenth House" motion="retrograde" />
<point name="Mars" position="20.00" sign="Cancer" abs_pos="110.00" house="Eleventh House" motion="direct" />
<point name="Ascendant" position="5.00" sign="Virgo" abs_pos="155.00" house="First House" motion="direct" />
</planets></chart_analysis>`;

const chart = {
  provider: 'astrologer' as const,
  api_version: 'v6',
  context: CONTEXT,
  calculated_at: 1,
  parse_status: 'parsed' as const,
};

describe('Soul Map astrological context (v1.2 A-02)', () => {
  it('sends the chart read the Hellenistic way, not the provider text', () => {
    // Narrowed through the schema exactly as `generateSoulMap` narrows it, so
    // this also asserts the narrowing keeps the chart.
    const message = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse({ ...emptyDraft(), birth_time: '08:05', natal_chart: chart }),
      numerology: null,
      gender: 'neutro',
    });

    expect(message).not.toContain('<point');
    expect(message).toContain('Ascendente: Virgo 5°');
    expect(message).toContain('Regente del Ascendente: Mercury, en Gemini, casa 10');
    expect(message).toContain('- Mercury: Gemini 28°, casa 10, domicilio, retrógrado');
    expect(message).toContain('- Mars: Cancer 20°, casa 11, caida');
    expect(message).toContain('- Sun cuadratura Ascendant');
    expect(message).toMatch(/Secta: carta (diurna|nocturna)/);
    expect(message).not.toContain('No hay carta disponible');
  });

  it('tells the model there is no Ascendant, house or sect when the hour is unknown', () => {
    const without = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse({ ...emptyDraft(), birth_time: '', natal_chart: chart }),
      numerology: null,
      gender: 'neutro',
    });
    expect(without).toContain('Sin hora de nacimiento: no hay Ascendente, casas ni secta.');
    expect(without).not.toContain('Ascendente: Virgo');
    expect(without).not.toContain('casa ');
  });

  it('carries the Hellenistic and the propositive rules in its system prompt', () => {
    expect(SOUL_MAP_SYSTEM_PROMPT).toContain('BASE HELENÍSTICA');
    expect(SOUL_MAP_SYSTEM_PROMPT).toContain('HABLAR PROPOSITIVAMENTE');
  });

  it('forbids invented placements when there is no chart', () => {
    const message = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse(emptyDraft()),
      numerology: null,
      gender: 'neutro',
    });
    expect(message).toContain('No hay carta disponible');
    expect(message).toContain('No inventes ninguna');
  });
});

describe('what the Soul Map narrowing lets through', () => {
  it('drops clinical_basics rather than trusting the caller not to send it', () => {
    // The non-negotiable in CLAUDE.md, as a shape. `OnboardingDraft` carries
    // the clinical answers and this schema has nowhere to put them, so the
    // body the Edge Function receives cannot contain them even if a future
    // caller passes the whole draft by mistake.
    const draft = emptyDraft();
    draft.clinical_basics = { ideation_6m: 'no', additional_notes: 'nota clínica privada' };
    const narrowed = soulMapDraftSchema.parse(draft);
    expect(narrowed).not.toHaveProperty('clinical_basics');
    expect(JSON.stringify(narrowed)).not.toContain('clinical');
    expect(JSON.stringify(narrowed)).not.toContain('nota clínica privada');
  });
});
