import test from 'node:test';
import { assert } from '../helpers/assert';
import { buildReliabilitySummary } from '../../src/lib/reliability';

test('buildReliabilitySummary returns high confidence for fresh snapshots', () => {
  const summary = buildReliabilitySummary({
    key: 'snapshot:daily',
    freshness: 'fresh',
    generatedAt: '2026-03-26T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-26T00:00:00.000Z',
    partialFailure: false,
    errorSummary: null,
  });

  assert.equal(summary.level, 'high');
  assert.equal(summary.freshness, 'fresh');
  assert.equal(summary.message, '최신 계산 결과입니다.');
  assert.deepEqual(summary.fallbackMetrics, []);
});

test('buildReliabilitySummary marks fallback snapshots as caution', () => {
  const summary = buildReliabilitySummary(
    {
      key: 'snapshot:daily',
      freshness: 'fallback',
      generatedAt: '2026-03-26T00:00:00.000Z',
      sourceUpdatedAt: '2026-03-26T00:00:00.000Z',
      partialFailure: true,
      errorSummary: 'sentiment timeout',
    },
    ['AAII', 'Put/Call'],
  );

  assert.equal(summary.level, 'caution');
  assert.equal(summary.freshness, 'fallback');
  assert.equal(summary.fallbackMetrics.length, 2);
  assert.ok(summary.message.includes('sentiment timeout'));
  assert.ok(summary.message.includes('AAII, Put/Call'));
});
