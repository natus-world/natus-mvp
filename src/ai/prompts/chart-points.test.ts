import { describe, expect, it } from 'vitest';
import { CHART_POINTS_SYSTEM_PROMPT, buildChartPointsUserMessage } from './chart-points';
import { HELLENISTIC_RULES, PROPOSITIVE_RULES } from './chart-reading';
import { BROAD_CONTEXT, SEED_CONTEXT } from '../fixtures/chart-seed.testing';
import { buildNatalChart } from '@/lib/natal-chart';

describe('the prompt of the full chart (chart-points-v1.0)', () => {
  it('reads the chart with the rules the Soul Map and the comparison read it with', () => {
    expect(CHART_POINTS_SYSTEM_PROMPT).toContain(HELLENISTIC_RULES);
    expect(CHART_POINTS_SYSTEM_PROMPT).toContain(PROPOSITIVE_RULES);
  });

  it('asks for every point but the mirrored axes, by the names the answer must copy', () => {
    const message = buildChartPointsUserMessage(buildNatalChart(BROAD_CONTEXT, true), 'femenino');
    const asked = message.split('PUNTOS A LEER')[1]!;
    expect(message).toContain('TRATO: femenino');
    expect(asked).toContain('- True_North_Lunar_Node');
    expect(asked).toContain('- Medium_Coeli');
    expect(asked).not.toContain('Descendant');
    expect(asked).not.toContain('Imum_Coeli');
  });

  it('says there is no Ascendant without the hour, and asks for none', () => {
    const message = buildChartPointsUserMessage(buildNatalChart(SEED_CONTEXT, false), 'neutro');
    expect(message).toContain('Sin hora de nacimiento');
    expect(message.split('PUNTOS A LEER')[1]).not.toContain('Ascendant');
  });

  it('carries nothing of the person but the chart and the address', () => {
    const message = buildChartPointsUserMessage(buildNatalChart(SEED_CONTEXT, true), 'neutro');
    expect(message).not.toContain('texto_de_la_persona');
    expect(message).not.toMatch(/Francisca|1992/);
  });
});
