import test from 'node:test';
import { assert } from '../helpers/assert';
import { calculateValuationScore } from '../../src/lib/screeners/valuation-screener';

test('valuation returns undervalued when upside and PEG are strong', () => {
  const result = calculateValuationScore({
    ticker: 'AAPL',
    currentPrice: 100,
    currentEPS: 5,
    peRatio: 12,
    forwardPE: 11,
    epsGrowthRates: [20, 18, 16],
    marketPE: 22,
  });

  assert.equal(result.verdict, 'undervalued');
  assert.ok(result.fairPrice > result.currentPrice);
  assert.ok(result.scores.total >= 14);
});

test('valuation returns overvalued when price and PEG are stretched', () => {
  const result = calculateValuationScore({
    ticker: 'TSLA',
    currentPrice: 100,
    currentEPS: 2,
    peRatio: 40,
    forwardPE: 38,
    epsGrowthRates: [5, 4, 6],
    marketPE: 18,
  });

  assert.equal(result.verdict, 'overvalued');
  assert.ok(result.fairPrice < result.currentPrice);
  assert.ok(result.scores.total < 7);
});
