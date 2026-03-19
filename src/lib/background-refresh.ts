import type { SnapshotFreshness } from './snapshots';

const inFlightRefreshes = new Set<string>();

export function scheduleSnapshotRefresh(options: {
  key: string;
  freshness: SnapshotFreshness;
  run: () => Promise<void>;
  onError?: (error: unknown) => void;
}): boolean {
  const { key, freshness, run, onError } = options;

  if (freshness !== 'stale') {
    return false;
  }

  if (inFlightRefreshes.has(key)) {
    return false;
  }

  inFlightRefreshes.add(key);

  void Promise.resolve()
    .then(run)
    .catch((error) => {
      onError?.(error);
    })
    .finally(() => {
      inFlightRefreshes.delete(key);
    });

  return true;
}
