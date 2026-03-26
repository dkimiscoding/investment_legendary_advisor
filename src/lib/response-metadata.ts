import type { SnapshotMeta } from './snapshots';
import { getScreeningUniverseMeta } from './data/stock-universe';
import { buildReliabilitySummary } from './reliability';
import { toNormalizedScore } from './score-display';
import type {
  DailyScreeningReport,
  LegendRecommendation,
  LegendsResponse,
  ScoreDisplayBreakdown,
  ScreeningUniverseMeta,
} from '@/types';
import type { ETFScreeningReport } from './screeners/etf-auto-screener';

export function buildCombinedScoreDisplay(options: {
  totalScore: number;
  chartScore: number;
  valuationScore: number;
  sentimentScore: number;
  dividendScore?: number;
  mastersScore?: number;
}): ScoreDisplayBreakdown {
  return {
    total: toNormalizedScore(options.totalScore, options.dividendScore != null ? 90 : 70),
    chart: toNormalizedScore(options.chartScore, 25),
    valuation: toNormalizedScore(options.valuationScore, 20),
    sentiment: toNormalizedScore(options.sentimentScore, 25),
    ...(options.dividendScore != null ? { dividend: toNormalizedScore(options.dividendScore, 20) } : {}),
    ...(options.mastersScore != null ? { masters: toNormalizedScore(options.mastersScore, 100) } : {}),
  };
}

export function buildDailyResponse(data: DailyScreeningReport, snapshotMeta: SnapshotMeta) {
  return {
    ...data,
    universeMeta: data.universeMeta ?? getScreeningUniverseMeta(),
    snapshotMeta,
    reliability: buildReliabilitySummary(snapshotMeta),
  };
}

export function buildETFResponse(data: ETFScreeningReport, snapshotMeta: SnapshotMeta) {
  return {
    ...data,
    snapshotMeta,
    reliability: buildReliabilitySummary(snapshotMeta),
  };
}

function buildUniverseMeta(recommendations: LegendsResponse & { universeMeta?: ScreeningUniverseMeta }): ScreeningUniverseMeta {
  return recommendations.universeMeta ?? getScreeningUniverseMeta();
}

export function buildLegendsResponse(
  recommendations: LegendsResponse & { universeMeta?: ScreeningUniverseMeta },
  snapshotMeta: SnapshotMeta,
) {
  return {
    ...recommendations,
    universeMeta: buildUniverseMeta(recommendations),
    snapshotMeta,
    reliability: buildReliabilitySummary(snapshotMeta),
  };
}

export function buildLegendDetailResponse(
  legend: LegendRecommendation,
  recommendations: LegendsResponse & { universeMeta?: ScreeningUniverseMeta },
  snapshotMeta: SnapshotMeta,
) {
  return {
    ...legend,
    universeMeta: buildUniverseMeta(recommendations),
    snapshotMeta,
    reliability: buildReliabilitySummary(snapshotMeta),
  };
}
