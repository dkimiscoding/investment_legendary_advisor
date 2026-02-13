import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchMarketBreadth } from '@/lib/data/yahoo-finance';
import { calculateChartScore } from '@/lib/screeners/chart-screener';
import { sanitizeTicker } from '@/lib/validate-ticker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: raw } = await params;
    const upperTicker = sanitizeTicker(raw);
    if (!upperTicker) {
      return NextResponse.json({ error: '유효하지 않은 티커입니다' }, { status: 400 });
    }

    const [chartData, breadth] = await Promise.all([
      fetchChartData(upperTicker),
      fetchMarketBreadth(),
    ]);
    chartData.marketBreadth = breadth;

    const result = calculateChartScore(chartData);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '차트 데이터 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
