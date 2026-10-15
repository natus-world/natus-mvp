import { describe, expect, it } from 'vitest';
import { emptyDraft } from '@/store/session';
import { soulMapDraftSchema } from '@/lib/model-input';
import { buildSoulMapUserMessage } from './soul-map';

describe('Soul Map astrological context', () => {
  it('injects a calculated chart into the chart block', () => {
    // Narrowed through the schema exactly as `generateSoulMap` narrows it, so
    // this also asserts the narrowing keeps the chart.
    const message = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse({
        ...emptyDraft(),
        natal_chart: {
          provider: 'astrologer',
          api_version: 'v5',
          context: '<chart_analysis><planet name="Sun" sign="Gemini" /></chart_analysis>',
          calculated_at: 1,
          parse_status: 'parsed',
        },
      }),
      numerology: null,
      gender: 'neutro',
    });

    expect(message).toContain('<planet name="Sun" sign="Gemini" />');
    expect(message).not.toContain('No hay carta disponible');
  });

  it('tells the model there is no Ascendant or house when the hour is unknown', () => {
    const chart = {
      provider: 'astrologer' as const,
      api_version: 'v6',
      context: '<chart_analysis><point name="Sun" sign="Gemini" /></chart_analysis>',
      calculated_at: 1,
      parse_status: 'parsed' as const,
    };
    const without = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse({ ...emptyDraft(), birth_time: '', natal_chart: chart }),
      numerology: null,
      gender: 'neutro',
    });
    const withHour = buildSoulMapUserMessage({
      draft: soulMapDraftSchema.parse({ ...emptyDraft(), birth_time: '08:05', natal_chart: chart }),
      numerology: null,
      gender: 'neutro',
    });
    expect(without).toContain('Sin hora de nacimiento: no hay Ascendente ni casas.');
    expect(withHour).not.toContain('Sin hora de nacimiento');
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
