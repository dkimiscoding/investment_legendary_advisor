import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchMarketBreadth } from '@/lib/data/yahoo-finance';
import { calculateChartScore } from '@/lib/screeners/chart-screener';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const [chartData, breadth] = await Promise.all([
      fetchChartData(ticker.toUpperCase()),
      fetchMarketBreadth(),
    ]);
    chartData.marketBreadth = breadth;
    const result = calculateChartScore(chartData);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
