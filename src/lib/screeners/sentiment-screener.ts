/**
 * 역발상 판독기 (Sentiment/Contrarian Screener)
 * 
 * 소몽의 역발상 투자 원리:
 * - 시장이 공포에 빠질 때 매수 (VIX 높음, P/C Ratio 높음)
 * - 시장이 환호할 때 매도
 * 
 * 점수가 높을수록 = 시장 공포 = 역발상 매수 기회
 */

import { SentimentData, SentimentResult } from '@/types';

/**
 * AAII Bull/Bear Spread 점수 (0-5)
 * Spread = Bullish% - Bearish%
 * 역발상: 비관적(spread 낮음)일수록 매수 기회
 */
function calculateAAIIScore(bullish: number, bearish: number): number {
  const spread = bullish - bearish;
  if (spread < -20) return 5; // 극단적 비관 = 매수
  if (spread < -10) return 4;
  if (spread < 0) return 3;
  if (spread < 10) return 2;
  if (spread < 20) return 1;
  return 0; // 극단적 낙관 = 매도
}

/**
 * Put/Call Ratio 점수 (0-5)
 * P/C > 1: 풋 옵션 많음 = 시장 공포 = 매수 기회
 * P/C < 0.7: 콜 옵션 많음 = 시장 환호 = 주의
 */
function calculatePCScore(pcRatio: number): number {
  if (pcRatio >= 1.2) return 5;
  if (pcRatio >= 1.0) return 4;
  if (pcRatio >= 0.9) return 3;
  if (pcRatio >= 0.8) return 2;
  if (pcRatio >= 0.7) return 1;
  return 0;
}

/**
 * VIX 점수 (0-5)
 * VIX > 30: 극도 공포 = 매수 기회
 * VIX < 15: 안일 = 주의
 */
function calculateVIXScore(vix: number): number {
  if (vix >= 35) return 5;
  if (vix >= 30) return 4;
  if (vix >= 25) return 3;
  if (vix >= 20) return 2;
  if (vix >= 15) return 1;
  return 0;
}

/**
 * Margin Debt YoY 변화 점수 (0-5)
 * 역발상: 신용잔고 급감 = 공포 = 매수 기회
 */
function calculateMarginScore(yoyChange: number): number {
  if (yoyChange < -20) return 5;
  if (yoyChange < -10) return 4;
  if (yoyChange < 0) return 3;
  if (yoyChange < 10) return 2;
  if (yoyChange < 20) return 1;
  return 0;
}

/**
 * High Yield Spread 점수 (0-5)
 * HY Spread 확대 = 리스크 회피 = 공포 = 매수 기회
 */
function calculateHYScore(hySpread: number): number {
  if (hySpread >= 6) return 5;
  if (hySpread >= 5) return 4;
  if (hySpread >= 4) return 3;
  if (hySpread >= 3.5) return 2;
  if (hySpread >= 3) return 1;
  return 0;
}

/**
 * 역발상 판독기 메인 함수
 */
export function calculateSentimentScore(data: SentimentData): SentimentResult {
  const aaiiScore = calculateAAIIScore(data.aaiiBullish, data.aaiiBearish);
  const pcScore = calculatePCScore(data.putCallRatio);
  const vixScore = calculateVIXScore(data.vix);
  const marginScore = calculateMarginScore(data.marginDebtYoY);
  const hyScore = calculateHYScore(data.hySpread);

  const totalScore = aaiiScore + pcScore + vixScore + marginScore + hyScore;

  let verdict: SentimentResult['verdict'];
  if (totalScore >= 20) verdict = 'extreme_fear';
  else if (totalScore >= 15) verdict = 'fear';
  else if (totalScore >= 10) verdict = 'neutral';
  else if (totalScore >= 5) verdict = 'greed';
  else verdict = 'extreme_greed';

  return {
    vix: { current: data.vix, score: vixScore },
    putCallRatio: { current: data.putCallRatio, score: pcScore },
    aaii: {
      bullish: data.aaiiBullish,
      bearish: data.aaiiBearish,
      spread: data.aaiiBullish - data.aaiiBearish,
      score: aaiiScore,
    },
    marginDebt: { yoy: data.marginDebtYoY, score: marginScore },
    hySpread: { current: data.hySpread, score: hyScore },
    totalScore,
    verdict,
  };
}
