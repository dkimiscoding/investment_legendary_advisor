import test from 'node:test';
import { assert } from '../helpers/assert';
import { calculateChartScore } from '../../src/lib/screeners/chart-screener';

test('chart score identifies fear/accumulation setup', () => {
  const result = calculateChartScore({
    ticker: 'AAPL',
    date: '2026-03-19',
    close: 80,
    ma50: 90,
    ma200: 100,
    rsi14: 25,
    volume: 1000000,
    prices: [100, 98, 96, 95, 93, 92, 91, 90, 88, 87, 86, 84, 83, 82, 81, 80, 79, 78, 79, 80],
    marketBreadth: { pctAbove200: 15, pctAbove50: 10 },
  });

  assert.equal(result.verdict, 'fear');
  assert.equal(result.signals.maStatus, 'below_both');
  assert.ok(result.scores.total >= 17);
});

test('chart score identifies greed/overheated setup', () => {
  const result = calculateChartScore({
    ticker: 'NVDA',
    date: '2026-03-19',
    close: 120,
    ma50: 110,
    ma200: 100,
    rsi14: 75,
    volume: 1000000,
    prices: [80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 103, 106, 109, 112, 115, 117, 118, 119, 120],
    marketBreadth: { pctAbove200: 85, pctAbove50: 85 },
  });

  assert.equal(result.verdict, 'greed');
  assert.equal(result.signals.maStatus, 'above_both');
  assert.ok(result.scores.total <= 9);
});
