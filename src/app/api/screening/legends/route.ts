import { NextRequest, NextResponse } from 'next/server';
import { buildLegendRecommendations } from '@/lib/legends/build-recommendations';
import { runDailyScreening } from '@/lib/screeners/auto-screener';
import type { LegendsResponse } from '@/types';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const legendId = searchParams.get('legend');
    const screeningReport = await runDailyScreening(false);
    const recommendations = buildLegendRecommendations({ report: screeningReport });

    if (legendId) {
      const filtered = recommendations.legends.find((legend) => legend.legendId === legendId);
      if (!filtered) {
        return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(filtered);
    }

    return NextResponse.json(recommendations satisfies LegendsResponse);
  } catch (error: unknown) {
    console.error('Legend recommendations error:', error);
    const message = error instanceof Error ? error.message : '추천 생성 중 오류가 발생했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
