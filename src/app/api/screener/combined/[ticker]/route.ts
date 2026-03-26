import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchFinancialData, fetchMarketBreadth, fetchDividendData, fetchMastersData } from '@/lib/data/yahoo-finance';
import { fetchSentimentData } from '@/lib/data/sentiment-data';
import { calculateChartScore } from '@/lib/screeners/chart-screener';
import { calculateValuationScore } from '@/lib/screeners/valuation-screener';
import { calculateSentimentScore } from '@/lib/screeners/sentiment-screener';
import { calculateCombinedScore } from '@/lib/screeners/combined-screener';
import { calculateDividendScore } from '@/lib/screeners/dividend-screener';
import { analyzeMasters } from '@/lib/screeners/masters-screener';
import { buildCombinedScoreDisplay } from '@/lib/response-metadata';
import { sanitizeTicker } from '@/lib/validate-ticker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = sanitizeTicker(rawTicker);
    if (!ticker) {
      return NextResponse.json({ error: '유효하지 않은 티커입니다' }, { status: 400 });
    }

    const [chartData, financialData, sentimentData, breadth, dividendData, mastersData] = await Promise.all([
      fetchChartData(ticker),
      fetchFinancialData(ticker),
      fetchSentimentData(),
      fetchMarketBreadth(),
      fetchDividendData(ticker),
      fetchMastersData(ticker),
    ]);

    chartData.marketBreadth = breadth;

    const chartResult = calculateChartScore(chartData);
    const valuationResult = calculateValuationScore(financialData);
    const sentimentResult = calculateSentimentScore(sentimentData);

    // 배당 분석
    const dividendAnalysis = dividendData ? calculateDividendScore(dividendData) : undefined;

    // 투자 대가 전략 분석
    const mastersResult = analyzeMasters({
      ticker,
      mastersData,
      chartData,
      financialData,
      sentiment: sentimentResult,
      dividendData,
    });

    const combined = calculateCombinedScore(chartResult, valuationResult, sentimentResult, dividendAnalysis, mastersResult);
    const scoreDisplay = buildCombinedScoreDisplay({
      totalScore: combined.totalScore,
      chartScore: chartResult.scores.total,
      valuationScore: valuationResult.scores.total,
      sentimentScore: sentimentResult.totalScore,
      dividendScore: dividendAnalysis?.totalScore,
      mastersScore: mastersResult?.overallScore,
    });

    return NextResponse.json({
      ...combined,
      scoreDisplay,
      dataSources: sentimentData.sources,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
