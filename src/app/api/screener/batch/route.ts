/**
 * 배치 분석 API
 * POST /api/screener/batch
 * Body: { tickers: ["AAPL", "MSFT", "NVDA"] }
 * 
 * 최대 10개 종목 동시 분석
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchFinancialData, fetchMarketBreadth } from '@/lib/data/yahoo-finance';
import { fetchSentimentData } from '@/lib/data/sentiment-data';
import { calculateChartScore } from '@/lib/screeners/chart-screener';
import { calculateValuationScore } from '@/lib/screeners/valuation-screener';
import { calculateSentimentScore } from '@/lib/screeners/sentiment-screener';
import { calculateCombinedScore } from '@/lib/screeners/combined-screener';
import { CombinedResult } from '@/types';

const MAX_BATCH_SIZE = 10;

interface BatchResult {
  ticker: string;
  success: boolean;
  data?: CombinedResult;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tickers: string[] = body.tickers;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: '티커 목록이 필요합니다. 예: { "tickers": ["AAPL", "MSFT"] }' },
        { status: 400 }
      );
    }

    if (tickers.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `최대 ${MAX_BATCH_SIZE}개 종목까지 동시 분석 가능합니다` },
        { status: 400 }
      );
    }

    // 센티먼트 + breadth는 시장 전체 데이터 → 1회만 수집
    const [sentimentData, breadth] = await Promise.all([
      fetchSentimentData(),
      fetchMarketBreadth(),
    ]);
    const sentimentResult = calculateSentimentScore(sentimentData);

    // 종목별 분석 병렬 실행
    const results: BatchResult[] = await Promise.all(
      tickers.map(async (rawTicker): Promise<BatchResult> => {
        const ticker = rawTicker.toUpperCase().trim();
        try {
          const [chartData, financialData] = await Promise.all([
            fetchChartData(ticker),
            fetchFinancialData(ticker),
          ]);
          chartData.marketBreadth = breadth;

          const chartResult = calculateChartScore(chartData);
          const valuationResult = calculateValuationScore(financialData);
          const combined = calculateCombinedScore(chartResult, valuationResult, sentimentResult);

          return {
            ticker,
            success: true,
            data: {
              ...combined,
              dataSources: sentimentData.sources,
            },
          };
        } catch (err) {
          return {
            ticker,
            success: false,
            error: err instanceof Error ? err.message : `${ticker} 분석 실패`,
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      total: tickers.length,
      success: successCount,
      failed: tickers.length - successCount,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '배치 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
