import test from 'node:test';
import { assert } from '../helpers/assert';
import {
  markSnapshotAsFallback,
  persistSnapshot,
  readSnapshot,
} from '../../src/lib/snapshots';

type Entry = { data: unknown; ttl: number };

function createAdapter() {
  const store = new Map<string, Entry>();
  return {
    store,
    get<T>(key: string): T | null {
      return (store.get(key)?.data as T) ?? null;
    },
    set(key: string, data: unknown, ttl: number) {
      store.set(key, { data, ttl });
    },
  };
}

test('persistSnapshot writes fresh and stale entries and readSnapshot prefers fresh', () => {
  const adapter = createAdapter();

  persistSnapshot(adapter, 'snapshot:test', { hello: 'world' }, {
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
    freshTtlMs: 1000,
    staleTtlMs: 5000,
  });

  assert.equal(adapter.store.has('snapshot:test:fresh'), true);
  assert.equal(adapter.store.has('snapshot:test:stale'), true);

  const snapshot = readSnapshot<{ hello: string }>(adapter, 'snapshot:test');
  assert.ok(snapshot);
  assert.equal(snapshot?.data.hello, 'world');
  assert.equal(snapshot?.snapshotMeta.freshness, 'fresh');
});

test('readSnapshot returns stale when fresh entry is missing', () => {
  const adapter = createAdapter();

  adapter.set('snapshot:test:stale', {
    payload: { stale: true },
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
    partialFailure: false,
    errorSummary: null,
  }, 5000);

  const snapshot = readSnapshot<{ stale: boolean }>(adapter, 'snapshot:test');
  assert.ok(snapshot);
  assert.equal(snapshot?.snapshotMeta.freshness, 'stale');
  assert.equal(snapshot?.data.stale, true);
});

test('markSnapshotAsFallback preserves payload and adds error summary', () => {
  const adapter = createAdapter();

  persistSnapshot(adapter, 'snapshot:test', { ok: true }, {
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
  });

  const snapshot = readSnapshot<{ ok: boolean }>(adapter, 'snapshot:test');
  assert.ok(snapshot);

  const fallback = markSnapshotAsFallback(snapshot!, 'upstream failed');
  assert.equal(fallback.snapshotMeta.freshness, 'fallback');
  assert.equal(fallback.snapshotMeta.errorSummary, 'upstream failed');
  assert.equal(fallback.data.ok, true);
});
