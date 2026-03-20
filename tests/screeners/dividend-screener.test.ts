import test from 'node:test';
import { assert } from '../helpers/assert';
import { calculateDividendScore } from '../../src/lib/screeners/dividend-screener';

test('dividend score identifies king-quality dividend profile', () => {
  const result = calculateDividendScore({
    dividendYield: 5.1,
    payoutRatio: 28,
    annualDividend: 4.5,
    fiveYearAvgYield: 3.5,
    consecutiveYears: 51,
    growthRate: 12,
  });

  assert.equal(result.status, 'king');
  assert.equal(result.totalScore, 19);
});

test('dividend score penalizes risky low-quality dividend profile', () => {
  const result = calculateDividendScore({
    dividendYield: 0.2,
    payoutRatio: 95,
    annualDividend: 0.1,
    fiveYearAvgYield: 0.4,
    consecutiveYears: 0,
    growthRate: 0,
  });

  assert.equal(result.status, 'payer');
  assert.equal(result.totalScore, 0);
});
