import type { SnapshotMeta } from './snapshots';

export interface SnapshotDisplay {
  label: string;
  description: string;
  tone: 'fresh' | 'stale' | 'fallback';
}

export function getSnapshotDisplay(meta: SnapshotMeta): SnapshotDisplay {
  if (meta.freshness === 'fresh') {
    return {
      label: '최신 스냅샷',
      description: '방금 계산된 최신 결과를 보고 있습니다.',
      tone: 'fresh',
    };
  }

  if (meta.freshness === 'stale') {
    return {
      label: '캐시된 스냅샷',
      description: '최근 성공 결과를 재사용하고 있습니다.',
      tone: 'stale',
    };
  }

  return {
    label: '대체 스냅샷',
    description: meta.errorSummary
      ? `새 계산에 실패해 이전 성공 결과를 보여줍니다. (${meta.errorSummary})`
      : '새 계산에 실패해 이전 성공 결과를 보여줍니다.',
    tone: 'fallback',
  };
}
