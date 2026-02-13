/**
 * 섹터 로테이션 분석 API
 * GET /api/screening/sector
 *
 * 섹터별 평균 점수와 추천 방향을 반환합니다.
 */

import { NextResponse } from 'next/server';
import { getSectorRotation } from '@/lib/screeners/auto-screener';

export async function GET() {
  try {
    const sectors = await getSectorRotation();

    return NextResponse.json({
      count: sectors.length,
      sectors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '섹터 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
