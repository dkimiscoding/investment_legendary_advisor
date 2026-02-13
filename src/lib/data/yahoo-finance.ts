/**
 * Yahoo Finance 데이터 수집
 * 무료 API 사용 (yahoo-finance2 패키지)
 */

import { ChartData, FinancialData, MarketBreadthData } from '@/types';
import { calculateRSI, calculateMA } from '../screeners/chart-screener';

// yahoo-finance2 v3 (서버사이드 전용)
import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
async function getYF() {
  return yf;
}

/**
 * 차트 데이터 수집
 */
export async function fetchChartData(ticker: string): Promise<ChartData> {
  const yf = await getYF();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 300); // 200일선 + 여유

  const result: any[] = await yf.historical(ticker, {
    period1: startDate,
    period2: endDate,
    interval: '1d',
  });

  const closes: number[] = result.map((r: any) => r.close);
  const latest = result[result.length - 1] as any;

  const ma50 = calculateMA(closes, 50);
  const ma200 = calculateMA(closes, 200);
  const rsi14 = calculateRSI(closes, 14);

  return {
    ticker,
    date: latest.date.toISOString().split('T')[0],
    close: latest.close,
    ma50: Math.round(ma50 * 100) / 100,
    ma200: Math.round(ma200 * 100) / 100,
    rsi14: Math.round(rsi14 * 100) / 100,
    volume: latest.volume,
    prices: closes.slice(-60), // 최근 60일 (패턴 분석용)
  };
}

/**
 * 재무 데이터 수집
 */
export async function fetchFinancialData(ticker: string): Promise<FinancialData> {
  const yf = await getYF();

  const quote: any = await yf.quote(ticker);
  const summary: any = await yf.quoteSummary(ticker, {
    modules: ['defaultKeyStatistics', 'earningsTrend', 'financialData'],
  });

  const stats = summary.defaultKeyStatistics || {};
  const trends = summary.earningsTrend?.trend || [];

  // EPS 성장률 수집
  const epsGrowthRates: number[] = [];
  
  // earningsTrend에서 성장률 추출
  for (const t of trends) {
    if (t.growth) {
      epsGrowthRates.push(t.growth * 100);
    }
  }

  // 성장률 데이터가 부족하면 PEG에서 역산
  if (epsGrowthRates.length === 0 && stats.pegRatio) {
    const impliedGrowth = (quote.trailingPE || 20) / stats.pegRatio;
    epsGrowthRates.push(impliedGrowth);
  }

  // 최소 보수적 추정
  if (epsGrowthRates.length === 0) {
    epsGrowthRates.push(10); // 기본값
  }

  // S&P500 PER 가져오기
  let marketPE = 22; // 기본값
  try {
    const spy: any = await yf.quote('SPY');
    if (spy.trailingPE) marketPE = spy.trailingPE;
  } catch {
    // 기본값 사용
  }

  return {
    ticker,
    currentPrice: quote.regularMarketPrice || 0,
    currentEPS: quote.epsTrailingTwelveMonths || 0,
    peRatio: quote.trailingPE || 0,
    forwardPE: quote.forwardPE || 0,
    epsGrowthRates,
    marketPE,
  };
}

/**
 * 시장 센티먼트 데이터 수집
 * VIX는 Yahoo Finance에서 직접 수집
 */
export async function fetchVIX(): Promise<number> {
  const yf = await getYF();
  const quote: any = await yf.quote('^VIX');
  return quote.regularMarketPrice || 20;
}

/**
 * S&P500 PER 수집
 */
export async function fetchMarketPE(): Promise<number> {
  const yf = await getYF();
  const quote: any = await yf.quote('SPY');
  return quote.trailingPE || 22;
}

/**
 * S&P500 내 MA 상회 종목 비율 수집
 * ^SPXA200R: S&P 500 % Above 200-Day Average
 * ^SPXA50R:  S&P 500 % Above 50-Day Average
 */
export async function fetchMarketBreadth(): Promise<MarketBreadthData> {
  const yf = await getYF();
  try {
    const [above200, above50] = await Promise.all([
      yf.quote('^SPXA200R'),  // S&P 500 % Above 200-Day
      yf.quote('^SPXA50R'),   // S&P 500 % Above 50-Day
    ]);
    return {
      pctAbove200: (above200 as any)?.regularMarketPrice || 50,
      pctAbove50: (above50 as any)?.regularMarketPrice || 50,
    };
  } catch {
    return { pctAbove200: 50, pctAbove50: 50 };
  }
}
