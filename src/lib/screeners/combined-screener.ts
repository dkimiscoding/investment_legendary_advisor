/**
 * 통합 판독기 (Combined Screener)
 * 
 * 3종 판독기 통합 → 최종 시장 신호 생성
 * 기본 총점 0-70 (차트25 + 주가20 + 역발상25)
 * 점수가 높을수록 시장 공포 = 역사적 매수 기회 구간
 * 
 * + 투자 대가 전략 엔진 통합 (선택적)
 * 
 * ⚠️ 본 도구는 투자 조언이 아닌 시장 분석 정보를 제공합니다.
 * 모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
 */

import { ChartResult, ValuationResult, SentimentResult, DividendAnalysis, MastersResult, CombinedResult } from '@/types';

function getVerdict(score: number): CombinedResult['finalVerdict'] {
  // 기본 총점 0-70 기준
  if (score >= 53) return 'very_bullish';  // 극도 공포 구간 → 역사적 반등 가능성 높음
  if (score >= 42) return 'bullish';       // 공포 구간 → 저평가 시사
  if (score >= 28) return 'neutral';       // 중립 구간
  if (score >= 18) return 'bearish';       // 환호 구간 → 과열 시사
  return 'very_bearish';                    // 극도 환호 구간 → 극단적 과열 시사
}

function getDividendGuide(dividend: DividendAnalysis): string {
  const parts: string[] = [];

  if (dividend.status === 'king') {
    parts.push(`🏆 배당 왕족주 (${dividend.data.consecutiveYears}년 연속 증액). 50년 이상 배당을 증액해온 극소수의 기업입니다.`);
  } else if (dividend.status === 'aristocrat') {
    parts.push(`👑 배당 귀족주 (${dividend.data.consecutiveYears}년 연속 증액). S&P 500 중 약 10%만 이 자격을 보유합니다.`);
  } else if (dividend.status === 'achiever') {
    parts.push(`⭐ 배당 성취주 (${dividend.data.consecutiveYears}년 연속 증액). 꾸준한 배당 증액 트랙레코드를 보유합니다.`);
  }

  if (dividend.data.dividendYield > 0) {
    parts.push(`현재 배당수익률 ${dividend.data.dividendYield.toFixed(2)}%.`);
  }

  if (dividend.data.payoutRatio > 80) {
    parts.push(`⚠️ 배당성향(${dividend.data.payoutRatio.toFixed(1)}%)이 높아 배당 지속 가능성에 주의가 필요합니다.`);
  }

  if (dividend.data.growthRate > 5) {
    parts.push(`배당 성장률 ${dividend.data.growthRate.toFixed(1)}%로 양호한 배당 성장 추세를 보이고 있습니다.`);
  }

  return parts.join(' ');
}

function getMastersGuide(masters: MastersResult): string {
  const parts: string[] = [];

  parts.push(`🎓 투자 대가 분석 (종합 ${masters.overallScore}/100점, 컨센서스: 매수 ${masters.consensus.buy} / 보류 ${masters.consensus.hold} / 회피 ${masters.consensus.avoid}):`);

  // 핵심 대가별 요약 (상위 3명 + 하위 1명)
  const sorted = [...masters.verdicts].sort((a, b) => b.score - a.score);
  
  const topMasters = sorted.slice(0, 3);
  for (const v of topMasters) {
    const shortName = v.master.split(' (')[0];
    const icon = v.verdict === 'buy' ? '✅' : v.verdict === 'hold' ? '⚠️' : '❌';
    // 핵심 이유만 추출 (첫 번째 이유)
    const mainReason = v.reason.split(' | ')[0];
    parts.push(`${icon} ${shortName} (${v.score}점): ${mainReason}`);
  }

  // 가장 부정적인 대가
  const worstMaster = sorted[sorted.length - 1];
  if (worstMaster.verdict === 'avoid') {
    const shortName = worstMaster.master.split(' (')[0];
    const mainReason = worstMaster.reason.split(' | ')[0];
    parts.push(`❌ ${shortName} (${worstMaster.score}점): ${mainReason}`);
  }

  parts.push(`최적 전략: ${masters.bestFit}`);

  return parts.join('\n');
}

function getActionGuide(
  verdict: CombinedResult['finalVerdict'],
  dividend?: DividendAnalysis,
  masters?: MastersResult
): string {
  let base: string;
  switch (verdict) {
    case 'very_bullish':
      base = '극도의 공포 구간입니다. 역사적으로 이 수준의 지표에서 시장이 강하게 반등한 사례가 많습니다. 워런 버핏의 격언처럼 "남들이 두려워할 때"에 해당하는 구간입니다.';
      break;
    case 'bullish':
      base = '공포 구간입니다. 다수의 지표가 저평가를 시사하고 있으며, 과거 유사한 구간에서 중장기 수익률이 양호했던 경향이 있습니다.';
      break;
    case 'neutral':
      base = '중립 구간입니다. 시장이 적정 수준에 가까우며, 뚜렷한 방향성 신호가 나타나지 않고 있습니다. 기존 전략을 유지하며 관망하기에 적합한 구간입니다.';
      break;
    case 'bearish':
      base = '환호 구간입니다. 이 수준의 지표는 시장 과열을 시사합니다. 과거 유사 구간에서 조정이 발생했던 사례가 있으므로 리스크 관리에 유의할 필요가 있습니다.';
      break;
    case 'very_bearish':
      base = '극도의 환호 구간입니다. 다수의 지표가 과열 신호를 보이고 있습니다. 역사적으로 이 수준에서 의미 있는 조정이 나타난 경우가 많았습니다. 현금 비중과 리스크 관리를 점검해볼 시점입니다.';
      break;
  }

  // 배당 정보 추가
  if (dividend && dividend.data.dividendYield > 0) {
    const dividendGuide = getDividendGuide(dividend);
    if (dividendGuide) {
      base += '\n\n📊 배당 분석: ' + dividendGuide;
    }
  }

  // 투자 대가 분석 추가
  if (masters) {
    const mastersGuide = getMastersGuide(masters);
    base += '\n\n' + mastersGuide;
  }

  return base;
}

export function calculateCombinedScore(
  chart: ChartResult,
  valuation: ValuationResult,
  sentiment: SentimentResult,
  dividend?: DividendAnalysis,
  masters?: MastersResult
): CombinedResult {
  // 기본 점수: 차트(25) + 주가(20) + 역발상(25) = 70
  const totalScore = chart.scores.total + valuation.scores.total + sentiment.totalScore;
  const finalVerdict = getVerdict(totalScore);

  return {
    ticker: chart.ticker,
    chart,
    valuation,
    sentiment,
    dividend: dividend || undefined,
    masters: masters || undefined,
    totalScore,
    finalVerdict,
    actionGuide: getActionGuide(finalVerdict, dividend, masters),
  };
}
