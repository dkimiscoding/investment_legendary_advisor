import type { SnapshotMeta } from './snapshots';

export type ReliabilityLevel = 'high' | 'medium' | 'caution';

export interface ReliabilitySummary {
  level: ReliabilityLevel;
  freshness: SnapshotMeta['freshness'];
  fallbackMetrics: string[];
  message: string;
  generatedAt: string;
  sourceUpdatedAt: string;
}

function getReliabilityLevel(meta: SnapshotMeta): ReliabilityLevel {
  if (meta.freshness === 'fresh' && !meta.partialFailure) return 'high';
  if (meta.freshness === 'fallback' || meta.partialFailure) return 'caution';
  return 'medium';
}

function getReliabilityMessage(meta: SnapshotMeta, fallbackMetrics: string[]): string {
  const fallbackSuffix = fallbackMetrics.length > 0 ? ` (${fallbackMetrics.join(', ')})` : '';

  if (meta.freshness === 'fresh') {
    return meta.partialFailure
      ? `최신 계산 결과지만 일부 지표는 대체값을 사용했습니다${fallbackSuffix}.`
      : '최신 계산 결과입니다.';
  }

  if (meta.freshness === 'stale') {
    return meta.partialFailure
      ? `최근 성공 결과를 재사용하고 있습니다. 일부 지표는 대체값을 사용했습니다${fallbackSuffix}.`
      : '최근 성공 결과를 재사용하고 있습니다.';
  }

  return meta.errorSummary
    ? `새 계산에 실패해 이전 성공 결과를 보여줍니다. (${meta.errorSummary})${fallbackSuffix}`
    : `새 계산에 실패해 이전 성공 결과를 보여줍니다.${fallbackSuffix}`;
}

export function buildReliabilitySummary(
  meta: SnapshotMeta,
  fallbackMetrics: string[] = [],
): ReliabilitySummary {
  return {
    level: getReliabilityLevel(meta),
    freshness: meta.freshness,
    fallbackMetrics,
    message: getReliabilityMessage(meta, fallbackMetrics),
    generatedAt: meta.generatedAt,
    sourceUpdatedAt: meta.sourceUpdatedAt,
  };
}
