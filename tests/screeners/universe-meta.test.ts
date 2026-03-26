import test from 'node:test';
import { assert } from '../helpers/assert';
import { getScreeningUniverseMeta } from '../../src/lib/data/stock-universe';
import type { DailyScreeningReport } from '../../src/types';

test('getScreeningUniverseMeta describes the blended stock universe', () => {
  const meta = getScreeningUniverseMeta();

  assert.equal(meta.label, 'S&P500 Top 100 + Dow 30 + Nasdaq Top 50');
  assert.ok(meta.totalCandidates >= 100);
  assert.equal(meta.rankingBasis, 'latest-analysis-score');
  assert.deepEqual(meta.segments, ['sp500Top100', 'dowJones30', 'nasdaqTop50']);
});

test('daily screening reports include universeMeta', () => {
  const report: Pick<DailyScreeningReport, 'universeMeta'> = {
    universeMeta: getScreeningUniverseMeta(),
  };

  assert.equal(report.universeMeta!.label, 'S&P500 Top 100 + Dow 30 + Nasdaq Top 50');
});
