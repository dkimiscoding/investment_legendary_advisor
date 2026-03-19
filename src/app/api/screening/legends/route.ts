import { NextRequest, NextResponse } from 'next/server';
import { buildLegendRecommendations } from '@/lib/legends/build-recommendations';
import { scheduleSnapshotRefresh } from '@/lib/background-refresh';
import { persistSnapshotToSupabase, readSnapshotFromSupabase } from '@/lib/persisted-snapshots';
import { markSnapshotAsFallback, persistSnapshot, readSnapshot, type SnapshotMeta } from '@/lib/snapshots';
import { runDailyScreening } from '@/lib/screeners/auto-screener';
import type { LegendsResponse } from '@/types';

export const maxDuration = 300;

const LEGENDS_SNAPSHOT_KEY = 'snapshot:legends';

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

function selectLegendResponse(recommendations: LegendsResponse, legendId: string) {
  return recommendations.legends.find((legend) => legend.legendId === legendId) ?? null;
}

async function refreshLegendsSnapshot(): Promise<void> {
  const screeningReport = await runDailyScreening(true);
  const recommendations = buildLegendRecommendations({ report: screeningReport });
  const snapshot = persistSnapshot(undefined, LEGENDS_SNAPSHOT_KEY, recommendations, {
    sourceUpdatedAt: recommendations.updatedAt,
  });
  await persistSnapshotToSupabase(LEGENDS_SNAPSHOT_KEY, snapshot, undefined, process.env);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const legendId = searchParams.get('legend');
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    if (!forceRefresh) {
      const cached = readSnapshot<LegendsResponse>(undefined, LEGENDS_SNAPSHOT_KEY);
      if (cached) {
        const refreshStarted = scheduleSnapshotRefresh({
          key: LEGENDS_SNAPSHOT_KEY,
          freshness: cached.snapshotMeta.freshness,
          run: refreshLegendsSnapshot,
          onError: (refreshError) => console.error('Legends background refresh failed:', refreshError),
        });
        if (legendId) {
          const filtered = selectLegendResponse(cached.data, legendId);
          if (!filtered) {
            return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
          }
          return NextResponse.json(filtered, { headers: { ...buildHeaders(cached.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } });
        }

        return NextResponse.json(
          { ...cached.data, snapshotMeta: cached.snapshotMeta },
          { headers: { ...buildHeaders(cached.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
        );
      }

      const persisted = await readSnapshotFromSupabase<LegendsResponse>(LEGENDS_SNAPSHOT_KEY);
      if (persisted) {
        const refreshStarted = scheduleSnapshotRefresh({
          key: LEGENDS_SNAPSHOT_KEY,
          freshness: persisted.snapshotMeta.freshness,
          run: refreshLegendsSnapshot,
          onError: (refreshError) => console.error('Legends background refresh failed:', refreshError),
        });
        if (legendId) {
          const filtered = selectLegendResponse(persisted.data, legendId);
          if (!filtered) {
            return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
          }
          return NextResponse.json(filtered, { headers: { ...buildHeaders(persisted.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } });
        }

        return NextResponse.json(
          { ...persisted.data, snapshotMeta: persisted.snapshotMeta },
          { headers: { ...buildHeaders(persisted.snapshotMeta), 'X-Refresh-Started': String(refreshStarted) } },
        );
      }
    }

    const screeningReport = await runDailyScreening(forceRefresh);
    const recommendations = buildLegendRecommendations({ report: screeningReport });
    const snapshot = persistSnapshot(undefined, LEGENDS_SNAPSHOT_KEY, recommendations, {
      sourceUpdatedAt: recommendations.updatedAt,
    });
    await persistSnapshotToSupabase(LEGENDS_SNAPSHOT_KEY, snapshot, undefined, process.env);

    if (legendId) {
      const filtered = selectLegendResponse(snapshot.data, legendId);
      if (!filtered) {
        return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(filtered, { headers: buildHeaders(snapshot.snapshotMeta) });
    }

    return NextResponse.json(
      { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta },
      { headers: buildHeaders(snapshot.snapshotMeta) },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '추천 생성 중 오류가 발생했습니다';
    const fallback = readSnapshot<LegendsResponse>(undefined, LEGENDS_SNAPSHOT_KEY);

    if (fallback) {
      const snapshot = markSnapshotAsFallback(fallback, message);
      if (legendId) {
        const filtered = selectLegendResponse(snapshot.data, legendId);
        if (!filtered) {
          return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
        }
        return NextResponse.json(filtered, { headers: buildHeaders(snapshot.snapshotMeta) });
      }

      return NextResponse.json(
        { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta },
        { headers: buildHeaders(snapshot.snapshotMeta) },
      );
    }

    const persistedFallback = await readSnapshotFromSupabase<LegendsResponse>(LEGENDS_SNAPSHOT_KEY);
    if (persistedFallback) {
      const snapshot = markSnapshotAsFallback(persistedFallback, message);
      if (legendId) {
        const filtered = selectLegendResponse(snapshot.data, legendId);
        if (!filtered) {
          return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
        }
        return NextResponse.json(filtered, { headers: buildHeaders(snapshot.snapshotMeta) });
      }

      return NextResponse.json(
        { ...snapshot.data, snapshotMeta: snapshot.snapshotMeta },
        { headers: buildHeaders(snapshot.snapshotMeta) },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
