'use client';

import { getSnapshotDisplay } from '@/lib/snapshot-display';
import type { ReliabilitySummary } from '@/lib/reliability';
import type { SnapshotMeta } from '@/lib/snapshots';
import type { ScreeningUniverseMeta } from '@/types';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRankingBasisLabel(rankingBasis?: ScreeningUniverseMeta['rankingBasis']): string {
  if (rankingBasis === 'latest-analysis-score') return '최신 분석 점수';
  return '기본 정렬';
}

export default function SnapshotStatusBanner({
  snapshotMeta,
  reliability,
  universeMeta,
}: {
  snapshotMeta?: SnapshotMeta | null;
  reliability?: ReliabilitySummary | null;
  universeMeta?: ScreeningUniverseMeta | null;
}) {
  if (!snapshotMeta && !reliability) return null;

  const display = snapshotMeta ? getSnapshotDisplay(snapshotMeta) : null;
  const tone = reliability?.level === 'high'
    ? 'fresh'
    : reliability?.level === 'medium'
    ? 'stale'
    : display?.tone ?? 'fallback';

  const toneClasses =
    tone === 'fresh'
      ? 'bg-[#D4F94E]/15 border-[#D4F94E] text-[#D4F94E]'
      : tone === 'stale'
      ? 'bg-[#F5F5F5]/10 border-gray-400 text-gray-200'
      : 'bg-[#C45C3E]/15 border-[#C45C3E] text-[#FED7AA]';

  const title = reliability
    ? reliability.level === 'high'
      ? '데이터 신뢰도 높음'
      : reliability.level === 'medium'
      ? '데이터 신뢰도 보통'
      : '데이터 신뢰도 주의'
    : display?.label ?? '데이터 상태';

  const description = reliability?.message ?? display?.description ?? '';
  const freshness = reliability?.freshness ?? snapshotMeta?.freshness;
  const generatedAt = reliability?.generatedAt ?? snapshotMeta?.generatedAt;
  const sourceUpdatedAt = reliability?.sourceUpdatedAt ?? snapshotMeta?.sourceUpdatedAt;

  return (
    <div className={`mb-4 border-2 rounded-none p-3 ${toneClasses}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <div className="text-sm font-black">{title}</div>
            <div className="text-xs opacity-90">{description}</div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            {freshness && (
              <span className="border border-current/30 px-2 py-1 uppercase tracking-wide">
                {freshness}
              </span>
            )}
            {reliability?.fallbackMetrics?.length ? (
              <span className="border border-current/30 px-2 py-1">
                영향 지표: {reliability.fallbackMetrics.join(', ')}
              </span>
            ) : null}
          </div>
        </div>

        {(generatedAt || sourceUpdatedAt) && (
          <div className="text-xs opacity-80 text-left lg:text-right shrink-0">
            {generatedAt ? <div>생성: {formatDateTime(generatedAt)}</div> : null}
            {sourceUpdatedAt ? <div>원본 기준: {formatDateTime(sourceUpdatedAt)}</div> : null}
          </div>
        )}
      </div>

      {universeMeta ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold opacity-90">
          <span className="border border-current/30 px-2 py-1">
            유니버스: {universeMeta.label}
          </span>
          <span className="border border-current/30 px-2 py-1">
            후보 수: {universeMeta.totalCandidates}개
          </span>
          <span className="border border-current/30 px-2 py-1">
            정렬 기준: {getRankingBasisLabel(universeMeta.rankingBasis)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
