import test from 'node:test';
import { assert } from '../helpers/assert';
import { clearCache } from '../../src/lib/cache';
import { fetchChartData } from '../../src/lib/data/yahoo-finance';

function makeRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)),
    close: 100 + index,
    volume: 1000 + index,
  }));
}

test('fetchChartData falls back to chart data when historical throws', async () => {
  clearCache();

  const rows = makeRows(220);
  let chartCalled = 0;

  const result = await fetchChartData('AAPL', {
    historical: async () => {
      throw new Error('Historical returned a result with SOME (but not all) null values.');
    },
    chart: async () => {
      chartCalled += 1;
      return { quotes: rows };
    },
    now: () => new Date(Date.UTC(2026, 0, 31)),
  });

  assert.equal(chartCalled, 1);
  assert.equal(result.close, rows[rows.length - 1].close);
  assert.equal(result.volume, rows[rows.length - 1].volume);
  assert.equal(result.prices.length, 60);
});

test('fetchChartData falls back to chart data when historical rows contain null closes', async () => {
  clearCache();

  const rows = makeRows(220);
  let chartCalled = 0;

  const result = await fetchChartData('MSFT', {
    historical: async () => [{ date: new Date(Date.UTC(2026, 0, 1)), close: Number.NaN, volume: 1000 }],
    chart: async () => {
      chartCalled += 1;
      return { quotes: rows };
    },
    now: () => new Date(Date.UTC(2026, 0, 31)),
  });

  assert.equal(chartCalled, 1);
  assert.equal(result.close, rows[rows.length - 1].close);
});
