/**
 * ETF 유니버스
 * 섹터별 대표 ETF + 테마 ETF + 채권/원자재 ETF
 * 총 ~50개 ETF를 주기적으로 스크리닝
 */

export const ETF_UNIVERSE: Record<string, string[]> = {
  // 시장 전체
  market: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO'],
  // 섹터 SPDR
  sector: ['XLK', 'XLV', 'XLF', 'XLE', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'],
  // 테마/성장
  thematic: ['ARKK', 'SOXX', 'SMH', 'IGV', 'HACK', 'BOTZ', 'LIT', 'TAN', 'ICLN'],
  // 배당
  dividend: ['VYM', 'SCHD', 'HDV', 'DVY', 'NOBL'],
  // 채권
  bond: ['TLT', 'IEF', 'SHY', 'HYG', 'LQD', 'BND'],
  // 원자재/실물자산
  commodity: ['GLD', 'SLV', 'USO', 'DBA'],
  // 국제
  international: ['EEM', 'VEA', 'EFA', 'FXI'],
};

export const ETF_NAMES: Record<string, string> = {
  // 시장 전체
  SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000',
  VTI: 'Total US Market', VOO: 'Vanguard S&P 500',
  // 섹터
  XLK: 'Technology', XLV: 'Healthcare', XLF: 'Financials', XLE: 'Energy',
  XLI: 'Industrials', XLY: 'Consumer Disc.', XLP: 'Consumer Staples',
  XLU: 'Utilities', XLB: 'Materials', XLRE: 'Real Estate', XLC: 'Communication',
  // 테마
  ARKK: 'ARK Innovation', SOXX: 'Semiconductor', SMH: 'VanEck Semiconductor',
  IGV: 'Software', HACK: 'Cybersecurity', BOTZ: 'Robotics & AI',
  LIT: 'Lithium & Battery', TAN: 'Solar Energy', ICLN: 'Clean Energy',
  // 배당
  VYM: 'High Dividend', SCHD: 'Dividend Growth', HDV: 'High Dividend Core',
  DVY: 'Select Dividend', NOBL: 'Dividend Aristocrats',
  // 채권
  TLT: '20+ Year Treasury', IEF: '7-10 Year Treasury', SHY: '1-3 Year Treasury',
  HYG: 'High Yield Corp', LQD: 'IG Corp Bond', BND: 'Total Bond',
  // 원자재
  GLD: 'Gold', SLV: 'Silver', USO: 'Oil', DBA: 'Agriculture',
  // 국제
  EEM: 'Emerging Markets', VEA: 'Developed Markets', EFA: 'EAFE', FXI: 'China Large Cap',
};

export const ETF_CATEGORIES: Record<string, string> = {};
for (const [category, tickers] of Object.entries(ETF_UNIVERSE)) {
  for (const ticker of tickers) {
    ETF_CATEGORIES[ticker] = category;
  }
}

export function getAllETFs(): string[] {
  return Object.values(ETF_UNIVERSE).flat();
}
