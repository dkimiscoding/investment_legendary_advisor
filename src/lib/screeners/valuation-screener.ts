/**
 * 주가 판독기 (Valuation Screener)
 * 
 * 소몽의 핵심 공식:
 * - 적정주가 = 예상 EPS × 적정 PER
 * - 적정 PER = EPS 성장률(%) × (1 ~ 2)
 * - PEG = PER / EPS 성장률
 * 
 * 점수가 높을수록 = 저평가 (매수 기회)
 */

import { FinancialData, ValuationScore, ValuationResult } from '@/types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 시장 PER 대비 종목 PER 점수 (0-5)
 * 종목 PER이 시장 PER보다 낮을수록 유리
 */
function calculatePEScore(peRatio: number, marketPE: number): number {
  if (peRatio <= 0) return 0; // 적자 기업
  const ratio = peRatio / marketPE;
  if (ratio < 0.5) return 5;
  if (ratio < 0.75) return 4;
  if (ratio < 1.0) return 3;
  if (ratio < 1.25) return 2;
  if (ratio < 1.5) return 1;
  return 0;
}

/**
 * 적정주가 대비 현재가 점수 (0-5)
 * 현재가가 적정주가보다 많이 낮을수록 유리
 * fairPriceMid(×1.5 배수) 기준으로 점수 산정
 */
function calculateFairPriceScore(currentPrice: number, fairPriceMid: number): number {
  if (fairPriceMid <= 0) return 0;
  const upside = ((fairPriceMid - currentPrice) / currentPrice) * 100;
  if (upside >= 50) return 5;
  if (upside >= 30) return 4;
  if (upside >= 10) return 3;
  if (upside >= 0) return 2;
  if (upside >= -15) return 1;
  return 0; // 적정가 대비 15% 이상 고평가
}

/**
 * PEG 점수 (0-5)
 * PEG < 1 : 성장성 대비 저평가
 * PEG = 1 : 적정
 * PEG > 1 : 성장성 대비 고평가
 */
function calculatePEGScore(peg: number): number {
  if (peg <= 0) return 0; // 음수 성장
  if (peg < 0.5) return 5;
  if (peg < 0.75) return 4;
  if (peg < 1.0) return 3;
  if (peg < 1.5) return 2;
  if (peg < 2.0) return 1;
  return 0;
}

/**
 * 시장 PER 수준 점수 (0-5)
 * S&P500 PER이 낮을수록 시장 전체가 저평가
 */
function calculateMarketPEScore(marketPE: number): number {
  if (marketPE < 15) return 5;
  if (marketPE < 18) return 4;
  if (marketPE < 20) return 3;
  if (marketPE < 23) return 2;
  if (marketPE < 25) return 1;
  return 0;
}

/**
 * 주가 판독기 메인 함수
 */
export function calculateValuationScore(data: FinancialData): ValuationResult {
  // 핵심 공식: 적정 PER = EPS 성장률 중앙값 × (1 ~ 2)
  const validGrowthRates = data.epsGrowthRates.filter(g => g > 0);
  const medianGrowth = validGrowthRates.length > 0 ? median(validGrowthRates) : 15;

  // 적정 PER 범위: 보수적(×1), 중간(×1.5), 낙관적(×2)
  const fairPERLow = medianGrowth * 1;
  const fairPERMid = medianGrowth * 1.5;
  const fairPERHigh = medianGrowth * 2;

  // 예상 EPS (1년 후)
  const nextYearGrowth = data.epsGrowthRates[0] || medianGrowth;
  const estimatedEPS = data.currentEPS * (1 + nextYearGrowth / 100);

  // 적정주가 범위 = 예상 EPS × 적정 PER 범위
  const fairPriceLow = estimatedEPS * fairPERLow;
  const fairPriceMid = estimatedEPS * fairPERMid;
  const fairPriceHigh = estimatedEPS * fairPERHigh;

  // 상승여력 (중간값 기준)
  const upsideDownside = ((fairPriceMid - data.currentPrice) / data.currentPrice) * 100;

  // PEG
  const peg = medianGrowth > 0 ? data.peRatio / medianGrowth : 999;

  // 점수 계산 (fairPriceMid 기준)
  const peScore = calculatePEScore(data.peRatio, data.marketPE);
  const fairPriceScore = calculateFairPriceScore(data.currentPrice, fairPriceMid);
  const pegScore = calculatePEGScore(peg);
  const marketPeScore = calculateMarketPEScore(data.marketPE);

  const total = peScore + fairPriceScore + pegScore + marketPeScore;

  const scores: ValuationScore = {
    pe: peScore,
    fairPrice: fairPriceScore,
    peg: pegScore,
    marketPe: marketPeScore,
    total,
  };

  let verdict: ValuationResult['verdict'];
  if (total >= 14) verdict = 'undervalued';
  else if (total >= 7) verdict = 'fair';
  else verdict = 'overvalued';

  return {
    ticker: data.ticker,
    currentPrice: data.currentPrice,
    peRatio: data.peRatio,
    marketPE: data.marketPE,
    estimatedEPS: Math.round(estimatedEPS * 100) / 100,
    fairPER: Math.round(fairPERMid * 100) / 100,
    fairPERRange: {
      low: Math.round(fairPERLow * 100) / 100,
      mid: Math.round(fairPERMid * 100) / 100,
      high: Math.round(fairPERHigh * 100) / 100,
    },
    fairPrice: Math.round(fairPriceMid * 100) / 100,
    fairPriceRange: {
      low: Math.round(fairPriceLow * 100) / 100,
      mid: Math.round(fairPriceMid * 100) / 100,
      high: Math.round(fairPriceHigh * 100) / 100,
    },
    upsideDownside: Math.round(upsideDownside * 100) / 100,
    peg: Math.round(peg * 100) / 100,
    scores,
    verdict,
  };
}
