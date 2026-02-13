/**
 * 차트 판독기 (Technical Screener)
 * 
 * 소몽의 차트 판독 원리:
 * - 이동평균선(50일/200일) 상회 여부로 추세 판단
 * - 이격도(200일선 기준)로 과열/침체 판단
 * - RSI로 과매수/과매도 판단
 * - M/W 패턴으로 전환점 판단
 * - S&P500 내 MA 상회 종목 비율로 시장 전체 건강도 판단
 * 
 * 점수가 높을수록 = 매수에 유리한 상황 (공포 = 기회)
 */

import { ChartData, ChartScore, ChartSignals, ChartResult, MarketBreadthData } from '@/types';

/**
 * 이동평균선 점수 (0-5)
 * - 200일선 & 50일선 모두 상회: 5점 (강한 상승 추세)
 * - 50일선만 상회: 3점
 * - 200일선만 상회: 2점
 * - 모두 하회: 0점
 */
function calculateMAScore(price: number, ma50: number, ma200: number): number {
  if (price > ma200 && price > ma50) return 5;
  if (price > ma50) return 3;
  if (price > ma200) return 2;
  return 0;
}

function getMAStatus(price: number, ma50: number, ma200: number): ChartSignals['maStatus'] {
  if (price > ma200 && price > ma50) return 'above_both';
  if (price > ma50) return 'above_50';
  if (price > ma200) return 'above_200';
  return 'below_both';
}

/**
 * 이격도 점수 (0-5) — 200일선 기준
 * 이격도 = (현재가 - 200일선) / 200일선 × 100
 * 
 * 역발상: 이격도가 낮을수록(주가가 200일선 아래로 떨어져있을수록) 매수 기회
 * - -15% 이하: 5점 (극도 공포 = 매수)
 * - -10% ~ -15%: 4점
 * - -5% ~ -10%: 3점
 * - 0% ~ -5%: 2점
 * - 0% ~ +10%: 1점
 * - +10% 이상: 0점 (과열)
 */
function calculateDeviationScore(price: number, ma200: number): { score: number; pct: number } {
  const deviation = ((price - ma200) / ma200) * 100;
  let score: number;

  if (deviation <= -15) score = 5;
  else if (deviation <= -10) score = 4;
  else if (deviation <= -5) score = 3;
  else if (deviation <= 0) score = 2;
  else if (deviation <= 10) score = 1;
  else score = 0;

  return { score, pct: Math.round(deviation * 100) / 100 };
}

/**
 * RSI 점수 (0-5)
 * 역발상: RSI가 낮을수록(과매도) 매수 기회
 * - RSI < 30: 5점 (과매도 = 매수 기회)
 * - RSI 30-40: 4점
 * - RSI 40-50: 3점
 * - RSI 50-60: 2점
 * - RSI 60-70: 1점
 * - RSI > 70: 0점 (과매수 = 매도 고려)
 */
function calculateRSIScore(rsi: number): { score: number; level: ChartSignals['rsiLevel'] } {
  let score: number;
  let level: ChartSignals['rsiLevel'];

  if (rsi < 30) { score = 5; level = 'oversold'; }
  else if (rsi < 40) { score = 4; level = 'oversold'; }
  else if (rsi < 50) { score = 3; level = 'neutral'; }
  else if (rsi < 60) { score = 2; level = 'neutral'; }
  else if (rsi < 70) { score = 1; level = 'neutral'; }
  else { score = 0; level = 'overbought'; }

  return { score, level };
}

/**
 * M/W 패턴 감지 (0-5)
 * - W패턴(이중바닥): 매수 신호 → 높은 점수
 * - M패턴(이중천장): 매도 신호 → 낮은 점수
 * 
 * 간소화된 구현: 최근 가격 움직임 기반
 */
function calculatePatternScore(prices: number[]): { score: number; pattern: ChartSignals['pattern'] } {
  if (prices.length < 20) return { score: 3, pattern: 'neutral' };

  const recent = prices.slice(-20);
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const firstMin = Math.min(...firstHalf);
  const firstMax = Math.max(...firstHalf);
  const secondMin = Math.min(...secondHalf);
  const secondMax = Math.max(...secondHalf);

  // W패턴: 두 번의 저점 후 반등
  const isWPattern = 
    firstMin < firstHalf[0] && 
    secondMin < secondHalf[secondHalf.length - 1] &&
    Math.abs(firstMin - secondMin) / firstMin < 0.05 &&
    secondHalf[secondHalf.length - 1] > (firstMax + secondMax) / 2 * 0.95;

  // M패턴: 두 번의 고점 후 하락
  const isMPattern =
    firstMax > firstHalf[0] &&
    secondMax > secondHalf[secondHalf.length - 1] &&
    Math.abs(firstMax - secondMax) / firstMax < 0.05 &&
    secondHalf[secondHalf.length - 1] < (firstMin + secondMin) / 2 * 1.05;

  if (isWPattern) return { score: 5, pattern: 'accumulation' };
  if (isMPattern) return { score: 0, pattern: 'distribution' };

  // 트렌드 기반 중간 점수
  const trend = (recent[recent.length - 1] - recent[0]) / recent[0];
  if (trend < -0.05) return { score: 4, pattern: 'accumulation' }; // 하락 중 = 잠재 기회
  if (trend > 0.05) return { score: 1, pattern: 'distribution' };  // 상승 중 = 주의
  return { score: 3, pattern: 'neutral' };
}

/**
 * MA 상회 종목 비중 점수 (0-5)
 * S&P500 내 200일선/50일선 위에 있는 종목의 비율
 * 
 * 역발상: 비율 낮을수록(시장 침체) 매수 기회
 * - 평균 < 20%: 5점 (극도 침체)
 * - 평균 20-30%: 4점
 * - 평균 30-50%: 3점
 * - 평균 50-70%: 2점
 * - 평균 70-80%: 1점
 * - 평균 > 80%: 0점 (과열)
 */
function calculateBreadthScore(breadth: MarketBreadthData): number {
  const avg = (breadth.pctAbove200 + breadth.pctAbove50) / 2;
  if (avg < 20) return 5;
  if (avg < 30) return 4;
  if (avg < 50) return 3;
  if (avg < 70) return 2;
  if (avg < 80) return 1;
  return 0;
}

/**
 * 차트 판독기 메인 함수
 */
export function calculateChartScore(data: ChartData): ChartResult {
  const maScore = calculateMAScore(data.close, data.ma50, data.ma200);
  const maStatus = getMAStatus(data.close, data.ma50, data.ma200);
  const { score: deviationScore, pct: deviationPct } = calculateDeviationScore(data.close, data.ma200);
  const { score: rsiScore, level: rsiLevel } = calculateRSIScore(data.rsi14);
  const { score: patternScore, pattern } = calculatePatternScore(data.prices);
  const breadthScore = data.marketBreadth
    ? calculateBreadthScore(data.marketBreadth)
    : 3; // 데이터 없으면 중립(3)

  const total = maScore + deviationScore + rsiScore + patternScore + breadthScore;

  const scores: ChartScore = {
    ma: maScore,
    deviation: deviationScore,
    rsi: rsiScore,
    pattern: patternScore,
    breadth: breadthScore,
    total,
  };

  const signals: ChartSignals = {
    maStatus,
    deviationPct,
    rsiLevel,
    pattern,
  };

  let verdict: ChartResult['verdict'];
  if (total <= 9) verdict = 'greed';       // 낮은 점수 = 시장 과열
  else if (total <= 16) verdict = 'neutral';
  else verdict = 'fear';                    // 높은 점수 = 시장 공포 = 매수 기회

  return { ticker: data.ticker, scores, signals, verdict };
}

/**
 * RSI 계산 (14일 기본)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * 이동평균 계산
 */
export function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
