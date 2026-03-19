import type { SnapshotEnvelope, SnapshotFreshness } from './snapshots';

export type SnapshotPersistenceEnv = Record<string, string | undefined> & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export interface PersistedSnapshotRow {
  snapshot_key: string;
  payload_json: unknown;
  generated_at: string;
  source_updated_at: string;
  fresh_until: string;
  stale_until: string;
  partial_failure: boolean;
  error_summary: string | null;
}

interface SnapshotPersistenceConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

const DEFAULT_FRESH_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 24 * 60 * 60 * 1000;

export function getSnapshotPersistenceConfig(env: SnapshotPersistenceEnv = process.env): SnapshotPersistenceConfig | null {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

export function toPersistedSnapshotRow<T>(
  key: string,
  snapshot: SnapshotEnvelope<T>,
  options?: { freshTtlMs?: number; staleTtlMs?: number },
): PersistedSnapshotRow {
  const generatedAtMs = Date.parse(snapshot.snapshotMeta.generatedAt);
  const freshTtlMs = options?.freshTtlMs ?? DEFAULT_FRESH_TTL_MS;
  const staleTtlMs = options?.staleTtlMs ?? DEFAULT_STALE_TTL_MS;

  return {
    snapshot_key: key,
    payload_json: snapshot.data,
    generated_at: snapshot.snapshotMeta.generatedAt,
    source_updated_at: snapshot.snapshotMeta.sourceUpdatedAt,
    fresh_until: new Date(generatedAtMs + freshTtlMs).toISOString(),
    stale_until: new Date(generatedAtMs + staleTtlMs).toISOString(),
    partial_failure: snapshot.snapshotMeta.partialFailure,
    error_summary: snapshot.snapshotMeta.errorSummary,
  };
}

function getFreshness(row: PersistedSnapshotRow, nowMs: number): SnapshotFreshness | null {
  if (nowMs <= Date.parse(row.fresh_until)) return 'fresh';
  if (nowMs <= Date.parse(row.stale_until)) return 'stale';
  return null;
}

export function fromPersistedSnapshotRow<T>(
  row: PersistedSnapshotRow,
  nowMs: number = Date.now(),
): SnapshotEnvelope<T> | null {
  const freshness = getFreshness(row, nowMs);
  if (!freshness) return null;

  return {
    data: row.payload_json as T,
    snapshotMeta: {
      key: row.snapshot_key,
      freshness,
      generatedAt: row.generated_at,
      sourceUpdatedAt: row.source_updated_at,
      partialFailure: row.partial_failure,
      errorSummary: row.error_summary,
    },
  };
}

function buildRestUrl(config: SnapshotPersistenceConfig, key?: string): string {
  const base = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/screening_snapshots`;
  if (!key) return `${base}?on_conflict=snapshot_key`;
  return `${base}?snapshot_key=eq.${encodeURIComponent(key)}&select=*`;
}

export async function persistSnapshotToSupabase<T>(
  key: string,
  snapshot: SnapshotEnvelope<T>,
  fetchImpl: FetchLike = (globalThis.fetch as FetchLike),
  env: SnapshotPersistenceEnv = process.env,
  options?: { freshTtlMs?: number; staleTtlMs?: number },
): Promise<boolean> {
  const config = getSnapshotPersistenceConfig(env);
  if (!config) return false;

  const row = toPersistedSnapshotRow(key, snapshot, options);
  const response = await fetchImpl(buildRestUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([row]),
  });

  return response.ok;
}

export async function readSnapshotFromSupabase<T>(
  key: string,
  fetchImpl: FetchLike = (globalThis.fetch as FetchLike),
  env: SnapshotPersistenceEnv = process.env,
  nowMs: number = Date.now(),
): Promise<SnapshotEnvelope<T> | null> {
  const config = getSnapshotPersistenceConfig(env);
  if (!config) return null;

  const response = await fetchImpl(buildRestUrl(config, key), {
    method: 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  });

  if (!response.ok) return null;

  const rows = await response.json() as PersistedSnapshotRow[];
  const row = rows[0];
  if (!row) return null;

  return fromPersistedSnapshotRow<T>(row, nowMs);
}
