/**
 * ETF 데이터 수집
 * yahoo-finance2로 ETF 메타데이터 + 수익률 + 비용비율 수집
 */
import { getCached, setCache, TTL } from '../cache';
import { createLogger } from '../logger';

const log = createLogger('ETFData');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let yfInstance: any = null;
async function getYF() {
  if (!yfInstance) {
    const YahooFinance = (await import('yahoo-finance2')).default;
    yfInstance = new (YahooFinance as unknown as new () => unknown)();
  }
  return yfInstance;
}

export interface ETFProfile {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  expenseRatio: number | null;  // 비용비율 (%)
  aum: number | null;           // 총 자산 (USD)
  avgVolume: number;            // 평균 거래량
  // 기간별 수익률
  returns: {
    month1: number | null;
    month3: number | null;
    month6: number | null;
    year1: number | null;
    ytd: number | null;
  };
  // 배당
  dividendYield: number | null;
  // 52주 범위
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekRange: number; // 현재 위치 (0=최저, 100=최고)
}

export async function fetchETFProfile(ticker: string): Promise<ETFProfile> {
  const cacheKey = `etf:profile:${ticker}`;
  const cached = getCached<ETFProfile>(cacheKey);
  if (cached) return cached;

  log.info(`ETF 프로필 수집: ${ticker}`);
  const yf = await getYF();

  // quoteSummary로 ETF 상세 정보 수집
  const summary = await yf.quoteSummary(ticker, {
    modules: ['price', 'summaryDetail', 'defaultKeyStatistics'] as never[],
  }) as Record<string, Record<string, unknown>>;

  const price = summary.price || {};
  const detail = summary.summaryDetail || {};
  const keyStats = summary.defaultKeyStatistics || {};

  const currentPrice = (price.regularMarketPrice as number) || 0;
  const high52 = (detail.fiftyTwoWeekHigh as number) || currentPrice;
  const low52 = (detail.fiftyTwoWeekLow as number) || currentPrice;
  const range = high52 - low52;

  // 기간별 수익률 계산 (historical 데이터 사용)
  const returns = await fetchETFReturns(ticker);

  const profile: ETFProfile = {
    ticker,
    name: (price.shortName as string) || ticker,
    price: currentPrice,
    changePercent: (price.regularMarketChangePercent as number) || 0,
    expenseRatio: (keyStats.annualReportExpenseRatio as number) != null
      ? (keyStats.annualReportExpenseRatio as number) * 100
      : (detail.expenseRatio as number) != null
        ? (detail.expenseRatio as number) * 100
        : null,
    aum: (detail.totalAssets as number) || null,
    avgVolume: (detail.averageVolume as number) || 0,
    returns,
    dividendYield: (detail.yield as number) != null
      ? (detail.yield as number) * 100
      : null,
    fiftyTwoWeekHigh: high52,
    fiftyTwoWeekLow: low52,
    fiftyTwoWeekRange: range > 0 ? ((currentPrice - low52) / range) * 100 : 50,
  };

  setCache(cacheKey, profile, TTL.FINANCIAL);
  return profile;
}

async function fetchETFReturns(ticker: string): Promise<ETFProfile['returns']> {
  const cacheKey = `etf:returns:${ticker}`;
  const cached = getCached<ETFProfile['returns']>(cacheKey);
  if (cached) return cached;

  try {
    const yf = await getYF();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() - 10); // 여유

    const history = await yf.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as Array<{ date: Date; close: number }>;

    if (!history || history.length < 2) {
      return { month1: null, month3: null, month6: null, year1: null, ytd: null };
    }

    const latest = history[history.length - 1].close;
    const now = new Date();

    const getReturn = (daysAgo: number): number | null => {
      const target = new Date(now);
      target.setDate(target.getDate() - daysAgo);
      // 가장 가까운 날짜 찾기
      let closest = history[0];
      for (const h of history) {
        if (Math.abs(h.date.getTime() - target.getTime()) < Math.abs(closest.date.getTime() - target.getTime())) {
          closest = h;
        }
      }
      if (!closest || closest.close === 0) return null;
      return ((latest - closest.close) / closest.close) * 100;
    };

    // YTD
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let ytdBase = history[0];
    for (const h of history) {
      if (Math.abs(h.date.getTime() - yearStart.getTime()) < Math.abs(ytdBase.date.getTime() - yearStart.getTime())) {
        ytdBase = h;
      }
    }
    const ytd = ytdBase.close > 0 ? ((latest - ytdBase.close) / ytdBase.close) * 100 : null;

    const returns = {
      month1: getReturn(30),
      month3: getReturn(90),
      month6: getReturn(180),
      year1: getReturn(365),
      ytd,
    };

    setCache(cacheKey, returns, TTL.FINANCIAL);
    return returns;
  } catch {
    log.warn(`ETF 수익률 계산 실패: ${ticker}`);
    return { month1: null, month3: null, month6: null, year1: null, ytd: null };
  }
}
