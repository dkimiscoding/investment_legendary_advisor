/**
 * 일일 자동 스크리닝 API
 * GET /api/screening/daily
 *
 * 전체 유니버스(~55종목)를 배치 분석하여 카테고리별 추천 종목을 반환합니다.
 * 캐시 TTL: 4시간
 *
 * Query params:
 * - refresh=true : 캐시 무시하고 강제 새로고침
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyScreening, getScreeningProgress } from '@/lib/screeners/auto-screener';

export const maxDuration = 300; // 5분 타임아웃 (Vercel Edge 등)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const report = await runDailyScreening(forceRefresh);

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '스크리닝에 실패했습니다';
    return NextResponse.json(
      { error: message, progress: getScreeningProgress() },
      { status: 500 }
    );
  }
}
