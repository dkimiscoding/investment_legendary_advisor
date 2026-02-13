/**
 * ETF 자동 스크리닝 엔진
 * 
 * ETF 유니버스(~50개)를 배치 분석하여 카테고리별 추천 ETF 생성
 * - 차트 점수 (0-25) + 효율성 점수 (0-20) + 모멘텀 점수 (0-25) = 총 0-70
 * - 캐싱: 4시간 TTL
 */

import { getCached, setCache } from '../cache';
import { fetchChartData, fetchMarketBreadth } from '../data/yahoo-finance';
import { fetchETFProfile, ETFProfile } from '../data/etf-data';
import { MarketBreadthData } from '@/types';
import { calculateChartScore } from './chart-screener';
import { calculateETFEfficiency, calculateETFMomentum, getETFVerdict, getETFVerdictLabel, ETFEfficiencyScore, ETFMomentumScore } from './etf-screener';
import { getAllETFs, ETF_NAMES, ETF_CATEGORIES } from '../data/etf-universe';
import { createLogger } from '../logger';

const log = createLogger('ETFAutoScreener');

const ETF_SCREENING_CACHE_KEY = 'screening:etf';
const ETF_SCREENING_TTL = 4 * 60 * 60 * 1000;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

const etfScreeningProgress = {
  isRunning: false,
  total: 0,
  completed: 0,
  lastRun: null as string | null,
};

export interface ETFAnalysisResult {
  ticker: string;
  name: string;
  category: string;
  price: number;
  changePercent: number;
  chartScore: number;
  efficiencyScore: number;
  momentumScore: number;
  totalScore: number;
  verdict: string;
  verdictLabel: string;
  profile: ETFProfile;
  efficiency: ETFEfficiencyScore;
  momentum: ETFMomentumScore;
  chartDetails: {
    ma: number; deviation: number; rsi: number; pattern: number; breadth: number;
  };
}

export interface ETFScreeningReport {
  timestamp: string;
  totalAnalyzed: number;
  topPicks: ETFAnalysisResult[];          // 종합 상위 10
  momentumLeaders: ETFAnalysisResult[];   // 모멘텀 상위 5
  valueOpportunity: ETFAnalysisResult[];  // 52주 저점 근처 + 효율 우수
  sectorBest: Record<string, ETFAnalysisResult>; // 카테고리별 1위
  dividendETFs: ETFAnalysisResult[];      // 배당 ETF 랭킹
  allResults: ETFAnalysisResult[];
}

export function getETFScreeningProgress() {
  return { ...etfScreeningProgress };
}

export async function runETFScreening(): Promise<ETFScreeningReport> {
  // 캐시 체크
  const cached = getCached<ETFScreeningReport>(ETF_SCREENING_CACHE_KEY);
  if (cached) {
    log.info('ETF 스크리닝 캐시 히트');
    return cached;
  }

  if (etfScreeningProgress.isRunning) {
    throw new Error('ETF 스크리닝이 이미 진행 중입니다');
  }

  etfScreeningProgress.isRunning = true;
  const allETFs = getAllETFs();
  etfScreeningProgress.total = allETFs.length;
  etfScreeningProgress.completed = 0;

  log.info(`ETF 스크리닝 시작: ${allETFs.length}개 ETF`);

  const results: ETFAnalysisResult[] = [];
  const breadth = await fetchMarketBreadth();

  // 배치 처리
  for (let i = 0; i < allETFs.length; i += BATCH_SIZE) {
    const batch = allETFs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(ticker => analyzeETF(ticker, breadth))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    etfScreeningProgress.completed = Math.min(i + BATCH_SIZE, allETFs.length);

    if (i + BATCH_SIZE < allETFs.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // 종합 점수순 정렬
  results.sort((a, b) => b.totalScore - a.totalScore);

  // 카테고리별 베스트
  const sectorBest: Record<string, ETFAnalysisResult> = {};
  for (const r of results) {
    if (!sectorBest[r.category] || r.totalScore > sectorBest[r.category].totalScore) {
      sectorBest[r.category] = r;
    }
  }

  // 52주 저점 근처 + 효율 우수
  const valueOpportunity = results
    .filter(r => r.profile.fiftyTwoWeekRange <= 40 && r.efficiencyScore >= 12)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  // 배당 ETF
  const dividendETFs = results
    .filter(r => r.category === 'dividend')
    .sort((a, b) => b.totalScore - a.totalScore);

  const report: ETFScreeningReport = {
    timestamp: new Date().toISOString(),
    totalAnalyzed: results.length,
    topPicks: results.slice(0, 10),
    momentumLeaders: [...results].sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 5),
    valueOpportunity,
    sectorBest,
    dividendETFs,
    allResults: results,
  };

  setCache(ETF_SCREENING_CACHE_KEY, report, ETF_SCREENING_TTL);
  etfScreeningProgress.isRunning = false;
  etfScreeningProgress.lastRun = report.timestamp;
  log.info(`ETF 스크리닝 완료: ${results.length}개 분석`);

  return report;
}

async function analyzeETF(
  ticker: string,
  breadth: MarketBreadthData
): Promise<ETFAnalysisResult | null> {
  try {
    const [chartData, profile] = await Promise.all([
      fetchChartData(ticker),
      fetchETFProfile(ticker),
    ]);
    chartData.marketBreadth = breadth;

    const chartResult = calculateChartScore(chartData);
    const efficiency = calculateETFEfficiency(profile);
    const momentum = calculateETFMomentum(profile);

    const totalScore = chartResult.scores.total + efficiency.total + momentum.total;
    const verdict = getETFVerdict(totalScore);

    return {
      ticker,
      name: ETF_NAMES[ticker] || profile.name,
      category: ETF_CATEGORIES[ticker] || 'other',
      price: profile.price,
      changePercent: profile.changePercent,
      chartScore: chartResult.scores.total,
      efficiencyScore: efficiency.total,
      momentumScore: momentum.total,
      totalScore,
      verdict,
      verdictLabel: getETFVerdictLabel(verdict),
      profile,
      efficiency,
      momentum,
      chartDetails: {
        ma: chartResult.scores.ma,
        deviation: chartResult.scores.deviation,
        rsi: chartResult.scores.rsi,
        pattern: chartResult.scores.pattern,
        breadth: chartResult.scores.breadth || 0,
      },
    };
  } catch (err) {
    log.warn(`ETF 분석 실패: ${ticker} - ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
