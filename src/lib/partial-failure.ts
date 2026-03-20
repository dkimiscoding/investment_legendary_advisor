import type { CombinedResult } from '@/types';

const METRIC_LABELS: Record<keyof NonNullable<CombinedResult['dataSources']>, string> = {
  vix: 'VIX',
  putCallRatio: '풋/콜 비율',
  aaii: 'AAII',
  marginDebt: '신용잔고',
  hySpread: '하이일드 스프레드',
};

export function getPartialFailureSummary(dataSources?: CombinedResult['dataSources']) {
  if (!dataSources) return null;

  const fallbackMetrics = Object.entries(dataSources)
    .filter(([, source]) => source === 'fallback')
    .map(([key]) => METRIC_LABELS[key as keyof typeof METRIC_LABELS]);

  if (fallbackMetrics.length === 0) {
    return null;
  }

  return {
    fallbackMetrics,
    message: `${fallbackMetrics.join(', ')} 지표는 실시간 수집에 실패해 추정치로 표시됩니다.`,
  };
}
