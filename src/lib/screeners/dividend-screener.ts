/**
 * 배당 분석기 (Dividend Screener)
 *
 * 배당 투자 관점에서 종목을 평가합니다.
 * - 배당수익률: 시장 평균(S&P500 ~1.3%) 대비
 * - 배당 안전성: 배당성향(Payout Ratio) 기반
 * - 배당 성장률: 5년 CAGR
 * - 연속 증액: 배당 왕족주/귀족주 등급
 *
 * ⚠️ 본 도구는 투자 조언이 아닌 시장 분석 정보를 제공합니다.
 */

import { DividendRawData, DividendAnalysis } from '@/types';

/**
 * 배당수익률 점수 (0-5)
 * S&P500 평균 ~1.3% 기준
 */
function calculateYieldScore(dividendYield: number): number {
  if (dividendYield >= 5) return 5;
  if (dividendYield >= 3.5) return 4;
  if (dividendYield >= 2.5) return 3;
  if (dividendYield >= 1.3) return 2;
  if (dividendYield >= 0.5) return 1;
  return 0;
}

/**
 * 배당 안전성 점수 (0-5)
 * 배당성향이 낮을수록 지속 가능
 */
function calculateSafetyScore(payoutRatio: number): number {
  if (payoutRatio <= 0) return 3; // 데이터 없음 → 중립
  if (payoutRatio <= 30) return 5;
  if (payoutRatio <= 50) return 4;
  if (payoutRatio <= 60) return 3;
  if (payoutRatio <= 75) return 2;
  if (payoutRatio <= 90) return 1;
  return 0; // 90% 초과 → 위험
}

/**
 * 배당 성장률 점수 (0-5)
 * 5년 CAGR 기준
 */
function calculateGrowthScore(growthRate: number): number {
  if (growthRate >= 15) return 5;
  if (growthRate >= 10) return 4;
  if (growthRate >= 7) return 3;
  if (growthRate >= 5) return 2;
  if (growthRate >= 2) return 1;
  return 0;
}

/**
 * 연속 증액 점수 (0-5)
 * 50년+ → 배당 왕족주 (King)
 * 25년+ → 배당 귀족주 (Aristocrat)
 * 10년+ → 배당 성취주 (Achiever)
 */
function calculateStreakScore(years: number): number {
  if (years >= 50) return 5;
  if (years >= 25) return 4;
  if (years >= 10) return 3;
  if (years >= 5) return 2;
  if (years >= 1) return 1;
  return 0;
}

function getStatus(years: number): DividendAnalysis['status'] {
  if (years >= 50) return 'king';
  if (years >= 25) return 'aristocrat';
  if (years >= 10) return 'achiever';
  return 'payer';
}

/**
 * 배당 분석 메인 함수
 */
export function calculateDividendScore(data: DividendRawData): DividendAnalysis {
  const yieldScore = calculateYieldScore(data.dividendYield);
  const safetyScore = calculateSafetyScore(data.payoutRatio);
  const growthScore = calculateGrowthScore(data.growthRate);
  const streakScore = calculateStreakScore(data.consecutiveYears);

  const totalScore = yieldScore + safetyScore + growthScore + streakScore;

  return {
    status: getStatus(data.consecutiveYears),
    scores: {
      yield: yieldScore,
      safety: safetyScore,
      growth: growthScore,
      streak: streakScore,
    },
    data: {
      dividendYield: data.dividendYield,
      payoutRatio: data.payoutRatio,
      consecutiveYears: data.consecutiveYears,
      annualDividend: data.annualDividend,
      growthRate: data.growthRate,
    },
    totalScore,
  };
}
