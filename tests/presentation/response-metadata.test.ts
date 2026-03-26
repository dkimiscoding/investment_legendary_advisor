import test from 'node:test';
import { assert } from '../helpers/assert';
import {
  buildCombinedScoreDisplay,
  buildDailyResponse,
  buildETFResponse,
  buildLegendsResponse,
} from '../../src/lib/response-metadata';
import { getScreeningUniverseMeta } from '../../src/lib/data/stock-universe';
import type { DailyScreeningReport, LegendsResponse } from '../../src/types';
import type { ETFScreeningReport } from '../../src/lib/screeners/etf-auto-screener';
import type { SnapshotMeta } from '../../src/lib/snapshots';

const snapshotMeta: SnapshotMeta = {
  key: 'snapshot:daily',
  freshness: 'stale',
  generatedAt: '2026-03-26T00:00:00.000Z',
  sourceUpdatedAt: '2026-03-26T00:00:00.000Z',
  partialFailure: false,
  errorSummary: null,
};

test('buildCombinedScoreDisplay uses a 90-point total when dividend data exists', () => {
  const display = buildCombinedScoreDisplay({
    totalScore: 72,
    chartScore: 20,
    valuationScore: 17,
    sentimentScore: 19,
    dividendScore: 16,
  });

  assert.equal(display.total.rawMaxScore, 90);
  assert.equal(display.total.normalizedScore, 80);
  assert.equal(display.dividend?.rawMaxScore, 20);
});

test('buildDailyResponse attaches reliability and universe metadata', () => {
  const report = {
    date: '2026-03-26',
    marketSummary: {
      sp500: { price: 1, change: 0 },
      vix: { value: 20, level: '보통' },
      tenYearYield: 4.1,
      sentimentVerdict: 'neutral',
    },
    topPicks: { fearBuys: [], undervalued: [], dividendAttractive: [], momentumLeaders: [] },
    allResults: [],
    sectorRotation: [],
    stats: { totalAnalyzed: 0, successCount: 0, failedCount: 0, failedTickers: [] },
    updatedAt: '2026-03-26T00:00:00.000Z',
  } satisfies DailyScreeningReport;

  const response = buildDailyResponse(report, snapshotMeta);

  assert.equal(response.universeMeta.label, getScreeningUniverseMeta().label);
  assert.equal(response.reliability.level, 'medium');
  assert.equal(response.snapshotMeta.generatedAt, snapshotMeta.generatedAt);
});

test('buildETFResponse attaches reliability metadata', () => {
  const report = {
    timestamp: '2026-03-26T00:00:00.000Z',
    totalAnalyzed: 0,
    topPicks: [],
    momentumLeaders: [],
    valueOpportunity: [],
    sectorBest: {},
    dividendETFs: [],
    allResults: [],
  } satisfies ETFScreeningReport;

  const response = buildETFResponse(report, snapshotMeta);

  assert.equal(response.reliability.freshness, 'stale');
  assert.equal(response.snapshotMeta.key, 'snapshot:daily');
});

test('buildLegendsResponse attaches universe and reliability metadata', () => {
  const report = {
    updatedAt: '2026-03-26T00:00:00.000Z',
    marketSummary: {
      sentiment: 'neutral',
      vix: { value: 20, level: 'neutral' },
      sp500Change: 0.1,
    },
    legends: [],
    consensus: [],
    totalLegends: 0,
  } satisfies LegendsResponse;

  const response = buildLegendsResponse(report, snapshotMeta);

  assert.equal(response.universeMeta.label, getScreeningUniverseMeta().label);
  assert.equal(response.reliability.level, 'medium');
  assert.equal(response.snapshotMeta.freshness, 'stale');
});
