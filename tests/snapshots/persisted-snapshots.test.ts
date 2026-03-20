import test from 'node:test';
import { assert } from '../helpers/assert';
import {
  fromPersistedSnapshotRow,
  getSnapshotPersistenceConfig,
  persistSnapshotToSupabase,
  toPersistedSnapshotRow,
  type PersistedSnapshotRow,
} from '../../src/lib/persisted-snapshots';
import type { SnapshotEnvelope } from '../../src/lib/snapshots';

const envelope: SnapshotEnvelope<{ hello: string }> = {
  data: { hello: 'world' },
  snapshotMeta: {
    key: 'snapshot:test',
    freshness: 'fresh',
    generatedAt: '2026-03-19T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-19T00:00:00.000Z',
    partialFailure: false,
    errorSummary: null,
  },
};

test('getSnapshotPersistenceConfig returns null when env is incomplete', () => {
  assert.equal(getSnapshotPersistenceConfig({}), null);
});

test('toPersistedSnapshotRow writes fresh_until and stale_until', () => {
  const row = toPersistedSnapshotRow('snapshot:test', envelope, {
    freshTtlMs: 1000,
    staleTtlMs: 5000,
  });

  assert.equal(row.snapshot_key, 'snapshot:test');
  assert.equal(typeof row.fresh_until, 'string');
  assert.equal(typeof row.stale_until, 'string');
  assert.deepEqual(row.payload_json, { hello: 'world' });
});

test('fromPersistedSnapshotRow returns stale when fresh window has passed', () => {
  const row: PersistedSnapshotRow = {
    snapshot_key: 'snapshot:test',
    payload_json: { hello: 'world' },
    generated_at: '2026-03-19T00:00:00.000Z',
    source_updated_at: '2026-03-19T00:00:00.000Z',
    fresh_until: '2026-03-19T00:00:01.000Z',
    stale_until: '2026-03-19T00:01:00.000Z',
    partial_failure: false,
    error_summary: null,
  };

  const snapshot = fromPersistedSnapshotRow<{ hello: string }>(row, Date.parse('2026-03-19T00:00:10.000Z'));
  assert.ok(snapshot);
  assert.equal(snapshot?.snapshotMeta.freshness, 'stale');
});

test('persistSnapshotToSupabase posts expected payload', async () => {
  const calls: Array<{ url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];

  const ok = await persistSnapshotToSupabase(
    'snapshot:test',
    envelope,
    async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 201,
        async json() { return {}; },
        async text() { return ''; },
      };
    },
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
  );

  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('/rest/v1/screening_snapshots'));
  assert.equal(calls[0].init?.method, 'POST');
  assert.ok(calls[0].init?.body?.includes('snapshot:test'));
});
