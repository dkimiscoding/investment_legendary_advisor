'use client';

import { getSnapshotDisplay } from '@/lib/snapshot-display';
import type { SnapshotMeta } from '@/lib/snapshots';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SnapshotStatusBanner({ snapshotMeta }: { snapshotMeta?: SnapshotMeta | null }) {
  if (!snapshotMeta) return null;

  const display = getSnapshotDisplay(snapshotMeta);

  const toneClasses =
    display.tone === 'fresh'
      ? 'bg-[#D4F94E]/15 border-[#D4F94E] text-[#D4F94E]'
      : display.tone === 'stale'
      ? 'bg-[#F5F5F5]/10 border-gray-400 text-gray-200'
      : 'bg-[#C45C3E]/15 border-[#C45C3E] text-[#FED7AA]';

  return (
    <div className={`mb-4 border-2 rounded-none p-3 ${toneClasses}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black">{display.label}</div>
          <div className="text-xs opacity-90">{display.description}</div>
        </div>
        <div className="text-xs opacity-80 text-left sm:text-right">
          <div>생성: {formatDateTime(snapshotMeta.generatedAt)}</div>
          <div>원본 기준: {formatDateTime(snapshotMeta.sourceUpdatedAt)}</div>
        </div>
      </div>
    </div>
  );
}
