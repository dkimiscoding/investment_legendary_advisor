import { getCached, setCache } from './cache';

export type SnapshotFreshness = 'fresh' | 'stale' | 'fallback';

export interface SnapshotMeta {
  key: string;
  freshness: SnapshotFreshness;
  generatedAt: string;
  sourceUpdatedAt: string;
  partialFailure: boolean;
  errorSummary: string | null;
}

interface SnapshotRecord<T> {
  payload: T;
  generatedAt: string;
  sourceUpdatedAt: string;
  partialFailure: boolean;
  errorSummary: string | null;
}

export interface SnapshotEnvelope<T> {
  data: T;
  snapshotMeta: SnapshotMeta;
}

interface SnapshotAdapter {
  get<T>(key: string): T | null;
  set(key: string, data: unknown, ttlMs: number): void;
}

const defaultAdapter: SnapshotAdapter = {
  get: getCached,
  set: setCache,
};

const DEFAULT_FRESH_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 24 * 60 * 60 * 1000;

function freshKey(key: string): string {
  return `${key}:fresh`;
}

function staleKey(key: string): string {
  return `${key}:stale`;
}

export function persistSnapshot<T>(
  adapter: SnapshotAdapter = defaultAdapter,
  key: string,
  payload: T,
  options?: {
    generatedAt?: string;
    sourceUpdatedAt?: string;
    partialFailure?: boolean;
    errorSummary?: string | null;
    freshTtlMs?: number;
    staleTtlMs?: number;
  },
): SnapshotEnvelope<T> {
  const record: SnapshotRecord<T> = {
    payload,
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    sourceUpdatedAt: options?.sourceUpdatedAt ?? new Date().toISOString(),
    partialFailure: options?.partialFailure ?? false,
    errorSummary: options?.errorSummary ?? null,
  };

  adapter.set(freshKey(key), record, options?.freshTtlMs ?? DEFAULT_FRESH_TTL_MS);
  adapter.set(staleKey(key), record, options?.staleTtlMs ?? DEFAULT_STALE_TTL_MS);

  return {
    data: payload,
    snapshotMeta: {
      key,
      freshness: 'fresh',
      generatedAt: record.generatedAt,
      sourceUpdatedAt: record.sourceUpdatedAt,
      partialFailure: record.partialFailure,
      errorSummary: record.errorSummary,
    },
  };
}

export function readSnapshot<T>(
  adapter: SnapshotAdapter = defaultAdapter,
  key: string,
): SnapshotEnvelope<T> | null {
  const fresh = adapter.get<SnapshotRecord<T>>(freshKey(key));
  if (fresh) {
    return {
      data: fresh.payload,
      snapshotMeta: {
        key,
        freshness: 'fresh',
        generatedAt: fresh.generatedAt,
        sourceUpdatedAt: fresh.sourceUpdatedAt,
        partialFailure: fresh.partialFailure,
        errorSummary: fresh.errorSummary,
      },
    };
  }

  const stale = adapter.get<SnapshotRecord<T>>(staleKey(key));
  if (stale) {
    return {
      data: stale.payload,
      snapshotMeta: {
        key,
        freshness: 'stale',
        generatedAt: stale.generatedAt,
        sourceUpdatedAt: stale.sourceUpdatedAt,
        partialFailure: stale.partialFailure,
        errorSummary: stale.errorSummary,
      },
    };
  }

  return null;
}

export function markSnapshotAsFallback<T>(
  snapshot: SnapshotEnvelope<T>,
  errorSummary: string,
): SnapshotEnvelope<T> {
  return {
    data: snapshot.data,
    snapshotMeta: {
      ...snapshot.snapshotMeta,
      freshness: 'fallback',
      partialFailure: true,
      errorSummary,
    },
  };
}
