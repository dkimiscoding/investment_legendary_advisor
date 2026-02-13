/**
 * 통합 판독기 (Combined Screener)
 * 
 * 3종 판독기 통합 → 최종 시장 신호 생성
 * 총점 0-70 (차트25 + 주가20 + 역발상25)
 * 점수가 높을수록 시장 공포 = 역사적 매수 기회 구간
 * 
 * ⚠️ 본 도구는 투자 조언이 아닌 시장 분석 정보를 제공합니다.
 * 모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
 */

import { ChartResult, ValuationResult, SentimentResult, CombinedResult } from '@/types';

function getVerdict(score: number): CombinedResult['finalVerdict'] {
  if (score >= 53) return 'very_bullish';  // 극도 공포 구간 → 역사적 반등 가능성 높음
  if (score >= 42) return 'bullish';       // 공포 구간 → 저평가 시사
  if (score >= 28) return 'neutral';       // 중립 구간
  if (score >= 18) return 'bearish';       // 환호 구간 → 과열 시사
  return 'very_bearish';                    // 극도 환호 구간 → 극단적 과열 시사
}

function getActionGuide(verdict: CombinedResult['finalVerdict']): string {
  switch (verdict) {
    case 'very_bullish':
      return '극도의 공포 구간입니다. 역사적으로 이 수준의 지표에서 시장이 강하게 반등한 사례가 많습니다. 워런 버핏의 격언처럼 "남들이 두려워할 때"에 해당하는 구간입니다.';
    case 'bullish':
      return '공포 구간입니다. 다수의 지표가 저평가를 시사하고 있으며, 과거 유사한 구간에서 중장기 수익률이 양호했던 경향이 있습니다.';
    case 'neutral':
      return '중립 구간입니다. 시장이 적정 수준에 가까우며, 뚜렷한 방향성 신호가 나타나지 않고 있습니다. 기존 전략을 유지하며 관망하기에 적합한 구간입니다.';
    case 'bearish':
      return '환호 구간입니다. 이 수준의 지표는 시장 과열을 시사합니다. 과거 유사 구간에서 조정이 발생했던 사례가 있으므로 리스크 관리에 유의할 필요가 있습니다.';
    case 'very_bearish':
      return '극도의 환호 구간입니다. 다수의 지표가 과열 신호를 보이고 있습니다. 역사적으로 이 수준에서 의미 있는 조정이 나타난 경우가 많았습니다. 현금 비중과 리스크 관리를 점검해볼 시점입니다.';
  }
}

export function calculateCombinedScore(
  chart: ChartResult,
  valuation: ValuationResult,
  sentiment: SentimentResult
): CombinedResult {
  const totalScore = chart.scores.total + valuation.scores.total + sentiment.totalScore;
  const finalVerdict = getVerdict(totalScore);

  return {
    ticker: chart.ticker,
    chart,
    valuation,
    sentiment,
    totalScore,
    finalVerdict,
    actionGuide: getActionGuide(finalVerdict),
  };
}
