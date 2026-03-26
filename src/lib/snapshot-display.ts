import type { SnapshotMeta } from './snapshots';

export interface SnapshotDisplay {
  label: string;
  description: string;
  tone: 'fresh' | 'stale' | 'fallback';
}

export function getSnapshotDisplay(meta: SnapshotMeta): SnapshotDisplay {
  if (meta.freshness === 'fresh') {
    return {
      label: '최신 계산 결과',
      description: '방금 계산된 최신 데이터 기준 결과를 보고 있습니다.',
      tone: 'fresh',
    };
  }

  if (meta.freshness === 'stale') {
    return {
      label: '최근 성공 결과 재사용',
      description: '실시간 재계산 대신 마지막 성공 snapshot 기준 결과를 보고 있습니다.',
      tone: 'stale',
    };
  }

  return {
    label: '대체 결과 표시 중',
    description: meta.errorSummary
      ? `새 계산에 실패해 이전 성공 결과를 보여줍니다. (${meta.errorSummary})`
      : '새 계산에 실패해 이전 성공 결과를 보여줍니다.',
    tone: 'fallback',
  };
}
