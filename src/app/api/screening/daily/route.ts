/**
 * 일일 자동 스크리닝 API
 * GET /api/screening/daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduleSnapshotRefresh } from '@/lib/background-refresh';
import { persistSnapshotToSupabase, readSnapshotFromSupabase } from '@/lib/persisted-snapshots';
import { markSnapshotAsFallback, persistSnapshot, readSnapshot, type SnapshotMeta } from '@/lib/snapshots';
import { runDailyScreening, getScreeningProgress } from '@/lib/screeners/auto-screener';
import type { DailyScreeningReport } from '@/types';

export const maxDuration = 300;

const DAILY_SNAPSHOT_KEY = 'snapshot:daily';

function buildHeaders(meta: SnapshotMeta): HeadersInit {
  return {
    'Cache-Control': meta.freshness === 'fresh'
      ? 'public, max-age=900, stale-while-revalidate=3600'
      : 'public, max-age=60, stale-while-revalidate=300',
    'X-Snapshot-Freshness': meta.freshness,
    'X-Generated-At': meta.generatedAt,
    'X-Source-Updated-At': meta.sourceUpdatedAt,
  };
}

async function refreshDailySnapshot(): Promise<void> {
  const report = await runDailyScreening(true);
  const snapshot = persistSnapshot(undefined, DAILY_SNAPSHOT_KEY, report, {
    sourceUpdatedAt: report.updatedAt,
  });
  await persistSnapshotToSupabase(DAILY_SNAPSHOT_KEY, snapshot, undefined, process.env);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    if (!forceRefresh) {
      const cached = readSnapshot<DailyScreeningReport>(undefined, DAILY_SNAPSHOT_KEY);
      if (cached) {
        const refreshStarted = scheduleSnapshotRefresh({
          key: DAILY_SNAPSHOT_KEY,
          freshness: cached.snapshotMeta.freshness,
          run: refreshDailySnapshot,
          onError: (refreshError) => console.error('Daily background refresh failed:', refreshError),
        });
        return NextResponse.json(
          { ...cached.data, snapshotMeta: cached.snapshotMeta },
          { headers: { ...buildHeaders(cached.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
        );
      }

      const persisted = await readSnapshotFromSupabase<DailyScreeningReport>(DAILY_SNAPSHOT_KEY);
      if (persisted) {
        const refreshStarted = scheduleSnapshotRefresh({
          key: DAILY_SNAPSHOT_KEY,
          freshness: persisted.snapshotMeta.freshness,
          run: refreshDailySnapshot,
          onError: (refreshError) => console.error('Daily background refresh failed:', refreshError),
        });
        return NextResponse.json(
          { ...persisted.data, snapshotMeta: persisted.snapshotMeta },
          { headers: { ...buildHeaders(persisted.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
        );
      }
    }

    const report = await runDailyScreening(forceRefresh);
    const snapshot = persistSnapshot(undefined, DAILY_SNAPSHOT_KEY, report, {
      sourceUpdatedAt: report.updatedAt,
    });
    await persistSnapshotToSupabase(DAILY_SNAPSHOT_KEY, snapshot, undefined, process.env);

    return NextResponse.json(
      { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta },
      { headers: buildHeaders(snapshot.snapshotMeta) },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '스크리닝에 실패했습니다';
    const fallback = readSnapshot<DailyScreeningReport>(undefined, DAILY_SNAPSHOT_KEY);

    if (fallback) {
      const snapshot = markSnapshotAsFallback(fallback, message);
      return NextResponse.json(
        { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta, progress: getScreeningProgress() },
        { headers: buildHeaders(snapshot.snapshotMeta) },
      );
    }

    const persistedFallback = await readSnapshotFromSupabase<DailyScreeningReport>(DAILY_SNAPSHOT_KEY);
    if (persistedFallback) {
      const snapshot = markSnapshotAsFallback(persistedFallback, message);
      return NextResponse.json(
        { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta, progress: getScreeningProgress() },
        { headers: buildHeaders(snapshot.snapshotMeta) },
      );
    }

    return NextResponse.json(
      { error: message, progress: getScreeningProgress() },
      { status: 500 },
    );
  }
}
