import { runAi, type AiResult } from './client';
import { buildChartPointsFixture } from './fixtures/chart-points';
import { chartPointReadingsSchema, type ChartPointReadings } from '@/lib/schemas';
import { checkChartPointReadings, readablePoints } from '@/lib/chart-points';
import type { NatalChart } from '@/lib/natal-chart';

/**
 * Package 05: Davraz's reading of every point of the chart. The function
 * reads the stored chart itself and the browser sends nothing; `chart` is
 * only what the fixture is built from and what the answer is checked
 * against here — the function checks the same against its own copy.
 */
export async function generateChartReadings(chart: NatalChart): Promise<AiResult<ChartPointReadings>> {
  const result = await runAi({
    schema: chartPointReadingsSchema,
    edge: { fn: 'chart-points', body: {} },
    fixture: () => buildChartPointsFixture(chart),
  });
  const rejection = checkChartPointReadings(result.value, readablePoints(chart));
  if (rejection) throw new Error(rejection);
  return result;
}
