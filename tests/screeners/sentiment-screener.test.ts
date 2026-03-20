import test from 'node:test';
import { assert } from '../helpers/assert';
import { calculateSentimentScore } from '../../src/lib/screeners/sentiment-screener';

test('sentiment returns extreme_fear for fear-heavy inputs', () => {
  const result = calculateSentimentScore({
    vix: 40,
    putCallRatio: 1.2,
    aaiiBullish: 20,
    aaiiBearish: 55,
    marginDebtYoY: -20,
    hySpread: 6,
  });

  assert.equal(result.verdict, 'extreme_fear');
  assert.ok(result.totalScore >= 20);
});

test('sentiment returns extreme_greed for complacent inputs', () => {
  const result = calculateSentimentScore({
    vix: 12,
    putCallRatio: 0.6,
    aaiiBullish: 60,
    aaiiBearish: 20,
    marginDebtYoY: 25,
    hySpread: 2.5,
  });

  assert.equal(result.verdict, 'extreme_greed');
  assert.equal(result.totalScore, 0);
});
