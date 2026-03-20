import test from 'node:test';
import { assert } from '../helpers/assert';
import { getPartialFailureSummary } from '../../src/lib/partial-failure';

test('returns null when every sentiment source is live', () => {
  const summary = getPartialFailureSummary({
    vix: 'live',
    putCallRatio: 'live',
    aaii: 'live',
    marginDebt: 'live',
    hySpread: 'live',
  });

  assert.equal(summary, null);
});

test('returns fallback metric labels when some sentiment sources are fallback', () => {
  const summary = getPartialFailureSummary({
    vix: 'fallback',
    putCallRatio: 'live',
    aaii: 'fallback',
    marginDebt: 'live',
    hySpread: 'fallback',
  });

  assert.ok(summary);
  assert.deepEqual(summary?.fallbackMetrics, ['VIX', 'AAII', '하이일드 스프레드']);
  assert.ok(summary?.message.includes('추정치'));
});
