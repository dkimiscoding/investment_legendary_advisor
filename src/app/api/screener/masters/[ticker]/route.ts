import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchFinancialData, fetchMarketBreadth, fetchDividendData, fetchMastersData } from '@/lib/data/yahoo-finance';
import { fetchSentimentData } from '@/lib/data/sentiment-data';
import { calculateChartScore } from '@/lib/screeners/chart-screener';
import { calculateSentimentScore } from '@/lib/screeners/sentiment-screener';
import { analyzeMasters, generateMastersSummary } from '@/lib/screeners/masters-screener';
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

    // 병렬 데이터 수집
    const [chartData, financialData, mastersData, sentimentData, breadth, dividendData] = await Promise.all([
      fetchChartData(ticker),
      fetchFinancialData(ticker),
      fetchMastersData(ticker),
      fetchSentimentData(),
      fetchMarketBreadth(),
      fetchDividendData(ticker),
    ]);

    chartData.marketBreadth = breadth;

    // 센티먼트 결과 (대가 분석에 필요)
    const sentimentResult = calculateSentimentScore(sentimentData);

    // 차트 결과 (리버모어, 사이먼스 등에 필요)
    calculateChartScore(chartData);

    // 8대 투자 대가 분석 실행
    const mastersResult = analyzeMasters({
      ticker,
      mastersData,
      chartData,
      financialData,
      sentiment: sentimentResult,
      dividendData,
    });

    // 요약 텍스트 생성
    const summary = generateMastersSummary(mastersResult);

    return NextResponse.json({
      ...mastersResult,
      mastersData, // 원시 데이터도 포함
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze masters strategy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
