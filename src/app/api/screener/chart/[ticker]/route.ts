import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchMarketBreadth } from '@/lib/data/yahoo-finance';
import { calculateChartScore } from '@/lib/screeners/chart-screener';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

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
