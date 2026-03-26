import test from 'node:test';
import { assert } from '../helpers/assert';
import { getSnapshotDisplay } from '../../src/lib/snapshot-display';

test('returns fresh display metadata', () => {
  const display = getSnapshotDisplay({
    key: 'snapshot:daily',
    freshness: 'fresh',
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
    partialFailure: false,
    errorSummary: null,
  });

  assert.equal(display.label, '최신 계산 결과');
  assert.equal(display.tone, 'fresh');
});

test('returns fallback display metadata with warning text', () => {
  const display = getSnapshotDisplay({
    key: 'snapshot:daily',
    freshness: 'fallback',
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
    partialFailure: true,
    errorSummary: 'upstream failed',
  });

  assert.equal(display.label, '대체 결과 표시 중');
  assert.equal(display.tone, 'fallback');
  assert.ok(display.description.includes('이전 성공 결과'));
});
