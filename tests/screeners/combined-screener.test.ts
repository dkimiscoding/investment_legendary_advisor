import test from 'node:test';
import { assert } from '../helpers/assert';
import { calculateCombinedScore } from '../../src/lib/screeners/combined-screener';

test('combined score sums components and yields very_bullish verdict', () => {
  const result = calculateCombinedScore(
    {
      ticker: 'AAPL',
      scores: { ma: 0, deviation: 5, rsi: 5, pattern: 4, breadth: 5, total: 19 },
      signals: { maStatus: 'below_both', deviationPct: -20, rsiLevel: 'oversold', pattern: 'accumulation' },
      verdict: 'fear',
    },
    {
      ticker: 'AAPL',
      currentPrice: 100,
      peRatio: 12,
      marketPE: 22,
      estimatedEPS: 6,
      fairPER: 27,
      fairPERRange: { low: 18, mid: 27, high: 36 },
      fairPrice: 162,
      fairPriceRange: { low: 108, mid: 162, high: 216 },
      upsideDownside: 62,
      peg: 0.67,
      scores: { pe: 4, fairPrice: 5, peg: 4, marketPe: 2, total: 15 },
      verdict: 'undervalued',
    },
    {
      vix: { current: 40, score: 5 },
      putCallRatio: { current: 1.2, score: 5 },
      aaii: { bullish: 20, bearish: 55, spread: -35, score: 5 },
      marginDebt: { yoy: -20, score: 4 },
      hySpread: { current: 6, score: 5 },
      totalScore: 24,
      verdict: 'extreme_fear',
    },
  );

  assert.equal(result.totalScore, 58);
  assert.equal(result.finalVerdict, 'very_bullish');
  assert.match(result.actionGuide, /극도의 공포 구간/);
});

test('combined score yields very_bearish verdict for overheated inputs', () => {
  const result = calculateCombinedScore(
    {
      ticker: 'TSLA',
      scores: { ma: 5, deviation: 0, rsi: 0, pattern: 1, breadth: 0, total: 6 },
      signals: { maStatus: 'above_both', deviationPct: 18, rsiLevel: 'overbought', pattern: 'distribution' },
      verdict: 'greed',
    },
    {
      ticker: 'TSLA',
      currentPrice: 100,
      peRatio: 40,
      marketPE: 18,
      estimatedEPS: 2.1,
      fairPER: 7.5,
      fairPERRange: { low: 5, mid: 7.5, high: 10 },
      fairPrice: 15.75,
      fairPriceRange: { low: 10.5, mid: 15.75, high: 21 },
      upsideDownside: -84.25,
      peg: 8,
      scores: { pe: 0, fairPrice: 0, peg: 0, marketPe: 3, total: 3 },
      verdict: 'overvalued',
    },
    {
      vix: { current: 12, score: 0 },
      putCallRatio: { current: 0.6, score: 0 },
      aaii: { bullish: 60, bearish: 20, spread: 40, score: 0 },
      marginDebt: { yoy: 25, score: 0 },
      hySpread: { current: 2.5, score: 0 },
      totalScore: 0,
      verdict: 'extreme_greed',
    },
  );

  assert.equal(result.totalScore, 9);
  assert.equal(result.finalVerdict, 'very_bearish');
  assert.match(result.actionGuide, /극도의 환호 구간/);
});
