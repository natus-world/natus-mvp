import { describe, expect, it } from 'vitest';
import { DEMO_SKY, DEMO_TIPS } from './daily-sky';
import { parseSky } from '@/lib/daily-sky';
import { dailyTipsSchema } from '@/lib/schemas';
import { lintChartJudgement, lintCopy } from '@/lib/copy-lint';

describe('the demo sky and tip', () => {
  it('is a sky the server would accept', () => {
    expect(parseSky(DEMO_SKY)).toEqual(DEMO_SKY);
  });

  it('the tip passes the schema and every copy rule', () => {
    expect(dailyTipsSchema.parse(DEMO_TIPS)).toEqual(DEMO_TIPS);
    for (const tip of DEMO_TIPS.tips) {
      expect(lintCopy(tip)).toEqual([]);
      expect(lintChartJudgement(tip)).toEqual([]);
    }
  });
});

describe('the catalog of today\'s sky (approved by the owner, 18 Oct 2026)', () => {
  it('passes every copy rule, as a model answer would', async () => {
    const { copy } = await import('@/i18n');
    const texts: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') texts.push(v.replace(/\*/g, ''));
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(copy.sky);
    expect(texts.length).toBeGreaterThan(50);
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintChartJudgement(text), text).toEqual([]);
    }
  });

  it('marks one word in each phrase of the day', async () => {
    const { copy } = await import('@/i18n');
    for (const kinds of Object.values(copy.sky.energy)) {
      for (const phrase of Object.values(kinds)) expect(phrase.match(/\*[^*]+\*/g)).toHaveLength(1);
    }
  });
});
