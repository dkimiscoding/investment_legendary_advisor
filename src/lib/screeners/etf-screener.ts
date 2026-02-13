/**
 * ETF 스크리너
 *
 * 3종 판독 원리를 ETF에 맞게 적용:
 * 1. 차트 (0-25): MA/RSI/추세/패턴/브레스 — 개별주와 동일
 * 2. 효율성 (0-20): 비용비율, AUM, 거래량, 52주 위치
 * 3. 모멘텀 (0-25): 1M/3M/6M/1Y 수익률 종합
 *
 * 총점: 0-70
 */

import { ETFProfile } from '../data/etf-data';

export interface ETFEfficiencyScore {
  expenseRatio: number;   // 0-6: 낮을수록 좋음
  aum: number;            // 0-5: 클수록 안정적
  volume: number;         // 0-4: 유동성
  range52w: number;       // 0-5: 52주 저점 근처 = 기회
  total: number;          // 0-20
}

export interface ETFMomentumScore {
  month1: number;         // 0-6
  month3: number;         // 0-6
  month6: number;         // 0-7
  year1: number;          // 0-6
  total: number;          // 0-25
}

export interface ETFScreenerResult {
  ticker: string;
  efficiency: ETFEfficiencyScore;
  momentum: ETFMomentumScore;
  profile: ETFProfile;
}

export function calculateETFEfficiency(profile: ETFProfile): ETFEfficiencyScore {
  // 비용비율 (0-6): 낮을수록 좋음
  let expenseRatio = 3;
  if (profile.expenseRatio != null) {
    if (profile.expenseRatio <= 0.05) expenseRatio = 6;
    else if (profile.expenseRatio <= 0.1) expenseRatio = 5;
    else if (profile.expenseRatio <= 0.2) expenseRatio = 4;
    else if (profile.expenseRatio <= 0.5) expenseRatio = 3;
    else if (profile.expenseRatio <= 0.75) expenseRatio = 2;
    else if (profile.expenseRatio <= 1.0) expenseRatio = 1;
    else expenseRatio = 0;
  }

  // AUM (0-5): 클수록 안정적
  let aum = 2;
  if (profile.aum != null) {
    const aumB = profile.aum / 1e9;
    if (aumB >= 50) aum = 5;
    else if (aumB >= 10) aum = 4;
    else if (aumB >= 1) aum = 3;
    else if (aumB >= 0.1) aum = 2;
    else aum = 1;
  }

  // 거래량 (0-4)
  let volume = 2;
  const avgVol = profile.avgVolume;
  if (avgVol >= 10_000_000) volume = 4;
  else if (avgVol >= 1_000_000) volume = 3;
  else if (avgVol >= 100_000) volume = 2;
  else volume = 1;

  // 52주 위치 (0-5): 저점 근처 = 매수 기회 (역발상)
  let range52w = 2;
  const pos = profile.fiftyTwoWeekRange; // 0-100
  if (pos <= 20) range52w = 5;       // 52주 저점 근처 — 공포 매수
  else if (pos <= 35) range52w = 4;
  else if (pos <= 50) range52w = 3;
  else if (pos <= 70) range52w = 2;
  else if (pos <= 85) range52w = 1;
  else range52w = 0;                    // 52주 고점 근처

  const total = expenseRatio + aum + volume + range52w;
  return { expenseRatio, aum, volume, range52w, total };
}

export function calculateETFMomentum(profile: ETFProfile): ETFMomentumScore {
  const r = profile.returns;

  // 1개월 수익률 (0-6)
  const month1 = scoreMomentum(r.month1, [-5, -2, 0, 2, 5, 8]);
  // 3개월 (0-6)
  const month3 = scoreMomentum(r.month3, [-10, -3, 0, 5, 10, 15]);
  // 6개월 (0-7)
  const month6 = scoreMomentum7(r.month6, [-15, -5, 0, 5, 15, 25, 35]);
  // 1년 (0-6)
  const year1 = scoreMomentum(r.year1, [-10, 0, 5, 10, 20, 30]);

  const total = month1 + month3 + month6 + year1;
  return { month1, month3, month6, year1, total };
}

function scoreMomentum(value: number | null, thresholds: number[]): number {
  if (value == null) return 3; // 데이터 없으면 중립
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1;
  }
  return 0;
}

function scoreMomentum7(value: number | null, thresholds: number[]): number {
  if (value == null) return 3;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1;
  }
  return 0;
}

export type ETFVerdict = 'strong_opportunity' | 'opportunity' | 'neutral' | 'caution' | 'avoid';

export function getETFVerdict(totalScore: number): ETFVerdict {
  if (totalScore >= 55) return 'strong_opportunity';
  if (totalScore >= 45) return 'opportunity';
  if (totalScore >= 30) return 'neutral';
  if (totalScore >= 20) return 'caution';
  return 'avoid';
}

export function getETFVerdictLabel(verdict: ETFVerdict): string {
  switch (verdict) {
    case 'strong_opportunity': return '🟢 강력 기회';
    case 'opportunity': return '🔵 기회';
    case 'neutral': return '⚪ 중립';
    case 'caution': return '🟡 주의';
    case 'avoid': return '🔴 회피';
  }
}
