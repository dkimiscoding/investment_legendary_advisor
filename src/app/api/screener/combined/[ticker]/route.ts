import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchFinancialData, fetchMarketBreadth } from '@/lib/data/yahoo-finance';
import { fetchSentimentData } from '@/lib/data/sentiment-data';
import { calculateChartScore } from '@/lib/screeners/chart-screener';
import { calculateValuationScore } from '@/lib/screeners/valuation-screener';
import { calculateSentimentScore } from '@/lib/screeners/sentiment-screener';
import { calculateCombinedScore } from '@/lib/screeners/combined-screener';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();

    const [chartData, financialData, sentimentData, breadth] = await Promise.all([
      fetchChartData(ticker),
      fetchFinancialData(ticker),
      fetchSentimentData(),
      fetchMarketBreadth(),
    ]);

    chartData.marketBreadth = breadth;

    const chartResult = calculateChartScore(chartData);
    const valuationResult = calculateValuationScore(financialData);
    const sentimentResult = calculateSentimentScore(sentimentData);

    const combined = calculateCombinedScore(chartResult, valuationResult, sentimentResult);
    return NextResponse.json(combined);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
