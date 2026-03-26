import test from 'node:test';
import { assert } from '../helpers/assert';
import { toNormalizedScore } from '../../src/lib/score-display';

test('toNormalizedScore converts raw scores to a 100-point basis', () => {
  const display = toNormalizedScore(55, 70);

  assert.deepEqual(display, {
    normalizedScore: 79,
    rawScore: 55,
    rawMaxScore: 70,
    displayText: '79/100',
    rawDisplayText: '55/70',
  });
});
