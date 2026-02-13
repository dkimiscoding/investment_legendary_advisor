import { NextRequest, NextResponse } from 'next/server';
import { runETFScreening, getETFScreeningProgress } from '@/lib/screeners/etf-auto-screener';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // 진행 상황 조회
  if (action === 'progress') {
    return NextResponse.json(getETFScreeningProgress());
  }

  try {
    const report = await runETFScreening();
    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ETF 스크리닝에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
