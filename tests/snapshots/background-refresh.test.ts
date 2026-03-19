import test from 'node:test';
import { assert } from '../helpers/assert';
import { scheduleSnapshotRefresh } from '../../src/lib/background-refresh';

test('does not schedule refresh for fresh snapshots', async () => {
  let ran = false;

  const scheduled = scheduleSnapshotRefresh({
    key: 'snapshot:test',
    freshness: 'fresh',
    run: async () => {
      ran = true;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(scheduled, false);
  assert.equal(ran, false);
});

test('schedules refresh once for stale snapshots and dedupes concurrent requests', async () => {
  let runs = 0;
  let release!: () => void;
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });

  const first = scheduleSnapshotRefresh({
    key: 'snapshot:test',
    freshness: 'stale',
    run: async () => {
      runs += 1;
      await done;
    },
  });

  const second = scheduleSnapshotRefresh({
    key: 'snapshot:test',
    freshness: 'stale',
    run: async () => {
      runs += 1;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(runs, 1);

  release();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const third = scheduleSnapshotRefresh({
    key: 'snapshot:test',
    freshness: 'stale',
    run: async () => {
      runs += 1;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(third, true);
  assert.equal(runs, 2);
});
