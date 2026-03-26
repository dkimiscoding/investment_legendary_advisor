import { NextRequest, NextResponse } from 'next/server';
import { scheduleSnapshotRefresh } from '@/lib/background-refresh';
import { runETFScreening, getETFScreeningProgress, ETFScreeningReport } from '@/lib/screeners/etf-auto-screener';
import { buildETFResponse } from '@/lib/response-metadata';
import { persistSnapshotToSupabase, readSnapshotFromSupabase } from '@/lib/persisted-snapshots';
import { markSnapshotAsFallback, persistSnapshot, readSnapshot, type SnapshotMeta } from '@/lib/snapshots';

const ETF_SNAPSHOT_KEY = 'snapshot:etf';

function buildHeaders(meta: SnapshotMeta, responseTimeMs?: number): HeadersInit {
  return {
    'Cache-Control': meta.freshness === 'fresh'
      ? 'public, max-age=900, stale-while-revalidate=3600'
      : 'public, max-age=60, stale-while-revalidate=300',
    'X-ETF-Source': meta.freshness,
    'X-Snapshot-Freshness': meta.freshness,
    'X-Generated-At': meta.generatedAt,
    'X-Source-Updated-At': meta.sourceUpdatedAt,
    ...(responseTimeMs != null ? { 'X-Response-Time': `${responseTimeMs}ms` } : {}),
  };
}

async function refreshEtfSnapshot(): Promise<void> {
  const report = await runETFScreening();
  const snapshot = persistSnapshot(undefined, ETF_SNAPSHOT_KEY, report, {
    sourceUpdatedAt: report.timestamp,
  });
  await persistSnapshotToSupabase(ETF_SNAPSHOT_KEY, snapshot, undefined, process.env);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const force = searchParams.get('force') === 'true';

  if (action === 'progress') {
    return NextResponse.json(getETFScreeningProgress());
  }

  if (!force) {
    const cached = readSnapshot<ETFScreeningReport>(undefined, ETF_SNAPSHOT_KEY);
    if (cached) {
      const refreshStarted = scheduleSnapshotRefresh({
        key: ETF_SNAPSHOT_KEY,
        freshness: cached.snapshotMeta.freshness,
        run: refreshEtfSnapshot,
        onError: (refreshError) => console.error('ETF background refresh failed:', refreshError),
      });
      return NextResponse.json(
        buildETFResponse(cached.data, cached.snapshotMeta),
        { headers: { ...buildHeaders(cached.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
      );
    }

    const persisted = await readSnapshotFromSupabase<ETFScreeningReport>(ETF_SNAPSHOT_KEY);
    if (persisted) {
      const refreshStarted = scheduleSnapshotRefresh({
        key: ETF_SNAPSHOT_KEY,
        freshness: persisted.snapshotMeta.freshness,
        run: refreshEtfSnapshot,
        onError: (refreshError) => console.error('ETF background refresh failed:', refreshError),
      });
      return NextResponse.json(
        buildETFResponse(persisted.data, persisted.snapshotMeta),
        { headers: { ...buildHeaders(persisted.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
      );
    }
  }

  try {
    const startTime = Date.now();
    const report = await runETFScreening();
    const duration = Date.now() - startTime;
    const snapshot = persistSnapshot(undefined, ETF_SNAPSHOT_KEY, report, {
      sourceUpdatedAt: report.timestamp,
    });
    await persistSnapshotToSupabase(ETF_SNAPSHOT_KEY, snapshot, undefined, process.env);

    return NextResponse.json(
      buildETFResponse(snapshot.data, snapshot.snapshotMeta),
      { headers: buildHeaders(snapshot.snapshotMeta, duration) },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ETF 스크리닝에 실패했습니다';
    const fallback = readSnapshot<ETFScreeningReport>(undefined, ETF_SNAPSHOT_KEY);

    if (fallback) {
      const snapshot = markSnapshotAsFallback(fallback, message);
      return NextResponse.json(
        buildETFResponse(snapshot.data, snapshot.snapshotMeta),
        { headers: { ...buildHeaders(snapshot.snapshotMeta), 'X-Error': message } },
      );
    }

    const persistedFallback = await readSnapshotFromSupabase<ETFScreeningReport>(ETF_SNAPSHOT_KEY);
    if (persistedFallback) {
      const snapshot = markSnapshotAsFallback(persistedFallback, message);
      return NextResponse.json(
        buildETFResponse(snapshot.data, snapshot.snapshotMeta),
        { headers: { ...buildHeaders(snapshot.snapshotMeta), 'X-Error': message } },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
