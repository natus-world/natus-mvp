import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRICE_PER_MTOK, UNKNOWN_MODEL_PRICES } from './lib/budget';

/**
 * The admin panel prices model use in SQL, from `model_prices`. The functions
 * price it in TypeScript, from `PRICE_PER_MTOK`. Two tables for one fact, so
 * this fails the moment they disagree: a price change is a new migration that
 * updates the rows, made in the same commit as the change to budget.ts.
 */
function sqlPrices(): Record<string, number[]> {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const files = ['20261018120000_admin.sql', '20261029200000_meditation_voice.sql'];
  const rows: Record<string, number[]> = {};
  for (const f of files) {
    const sql = readFileSync(new URL(f, dir), 'utf8');
    for (const m of sql.matchAll(/\('([^']+)',\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/g)) {
      rows[m[1]!] = [m[2], m[3], m[4], m[5]].map(Number);
    }
  }
  return rows;
}

describe('model_prices matches budget.ts', () => {
  const rows = sqlPrices();
  const table = { ...PRICE_PER_MTOK, '*': UNKNOWN_MODEL_PRICES };

  it('has the same models', () => {
    expect(Object.keys(rows).sort()).toEqual(Object.keys(table).sort());
  });

  for (const [model, p] of Object.entries(table)) {
    it(`prices ${model} the same`, () => {
      expect(rows[model]).toEqual([p.input, p.output, p.cacheWrite, p.cacheRead]);
    });
  }
});
