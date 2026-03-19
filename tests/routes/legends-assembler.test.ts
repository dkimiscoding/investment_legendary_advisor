import test from 'node:test';
import path from 'node:path';
import Module from 'node:module';
import { assert } from '../helpers/assert';
import type {} from '../../src/lib/legends/build-recommendations';
import type { DailyScreeningReport, ScreeningResult } from '../../src/types';

const moduleInternal = Module as typeof Module & {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: object,
  ) => string;
};

const originalResolveFilename = moduleInternal._resolveFilename;

moduleInternal._resolveFilename = function patchedResolveFilename(
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: object,
) {
  if (request.startsWith('@/')) {
    const resolved = path.resolve(__dirname, '../../src', request.slice(2));
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

async function loadBuilder(): Promise<{
  buildLegendRecommendations: (input: { report: DailyScreeningReport }) => {
    legends: Array<{ topPicks: unknown[] }>;
    totalLegends: number;
    consensus: Array<{ count: number }>;
  };
}> {
  return import('../../src/lib/legends/build-recommendations');
}

function makeStock(overrides: Partial<ScreeningResult> = {}): ScreeningResult {
  return {
    ticker: 'AAPL',
    name: 'Apple',
    category: 'megaCap',
    currentPrice: 100,
    changePercent: 1.2,
    totalScore: 72,
    maxScore: 90,
    chartScore: 18,
    valuationScore: 14,
    sentimentScore: 16,
    dividendScore: 12,
    verdict: '🟢 매수 관점 매우 유리',
    highlights: ['sample'],
    signals: {
      maStatus: 'above_both',
      rsiLevel: 'neutral',
      valuationVerdict: 'undervalued',
      pattern: 'accumulation',
    },
    isDividendAristocrat: false,
    sector: 'Technology',
    lastUpdated: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}

const report: DailyScreeningReport = {
  date: '2026-03-19',
  marketSummary: {
    sp500: { price: 5200, change: 0.8 },
    vix: { value: 18, level: 'moderate' },
    tenYearYield: 4.1,
    sentimentVerdict: 'neutral',
  },
  topPicks: {
    fearBuys: [],
    undervalued: [],
    dividendAttractive: [],
    momentumLeaders: [],
  },
  allResults: [
    makeStock({ ticker: 'AAPL', name: 'Apple', sector: 'Technology' }),
    makeStock({ ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', isDividendAristocrat: true }),
    makeStock({ ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', isDividendAristocrat: true, dividendScore: 16 }),
    makeStock({ ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', chartScore: 14 }),
    makeStock({ ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', isDividendAristocrat: true }),
    makeStock({ ticker: 'JPM', name: 'JPMorgan', sector: 'Financials', chartScore: 16 }),
    makeStock({ ticker: 'UNP', name: 'Union Pacific', sector: 'Industrials', changePercent: 0.6 }),
    makeStock({ ticker: 'QQQ', name: 'Invesco QQQ', sector: 'ETF', dividendScore: null, isDividendAristocrat: false }),
  ],
  sectorRotation: [],
  stats: {
    totalAnalyzed: 8,
    successCount: 8,
    failedCount: 0,
    failedTickers: [],
  },
  updatedAt: '2026-03-19T00:00:00.000Z',
};

test('buildLegendRecommendations returns capped legend picks and sorted consensus', async () => {
  const { buildLegendRecommendations } = await loadBuilder();
  const result = buildLegendRecommendations({ report });

  assert.equal(result.legends.length, 8);
  assert.equal(result.totalLegends, 8);
  assert.ok(result.legends.every((legend) => legend.topPicks.length <= 5));
  assert.ok(result.consensus.length > 0);
  assert.ok(result.consensus.every((stock, index, arr) => index === 0 || arr[index - 1].count >= stock.count));
});
