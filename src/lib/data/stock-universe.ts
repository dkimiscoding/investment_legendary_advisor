/**
 * 스크리닝 대상 종목 유니버스
 *
 * S&P500 핵심 + 배당 귀족주 + 성장주 + 섹터 대표 + 한국인 인기 종목
 * 총 ~55개 종목을 주기적으로 스크리닝합니다.
 */

// ─── 종목 유니버스 ────────────────────────────────────

export const STOCK_UNIVERSE: Record<string, string[]> = {
  // 대형 기술주
  megaCap: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'BRK-B'],
  // 배당 귀족주 TOP 20
  dividendAristocrats: [
    'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'ABT', 'MMM', 'EMR', 'ITW',
    'CL', 'GPC', 'DOV', 'LOW', 'TGT', 'CAT', 'XOM', 'CVX', 'GD', 'BDX',
  ],
  // 성장주
  growth: ['PLTR', 'SNOW', 'CRWD', 'NET', 'DDOG', 'ZS', 'MDB', 'PANW', 'ANET', 'SMCI'],
  // 섹터 대표
  sectorLeaders: ['JPM', 'V', 'UNH', 'LLY', 'HD', 'CRM', 'COST', 'NFLX', 'AMD', 'QCOM'],
  // 한국인 인기 미국주식 (ETF 포함)
  koreanFavorites: ['SOXL', 'TQQQ', 'SCHD', 'VOO', 'QQQ', 'SPY'],
};

// ─── 종목명 매핑 ──────────────────────────────────────

export const STOCK_NAMES: Record<string, string> = {
  // 대형 기술주
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'GOOGL': 'Alphabet (Google)',
  'AMZN': 'Amazon',
  'NVDA': 'NVIDIA',
  'META': 'Meta Platforms',
  'TSLA': 'Tesla',
  'AVGO': 'Broadcom',
  'BRK-B': 'Berkshire Hathaway',

  // 배당 귀족주
  'JNJ': 'Johnson & Johnson',
  'PG': 'Procter & Gamble',
  'KO': 'Coca-Cola',
  'PEP': 'PepsiCo',
  'MCD': "McDonald's",
  'WMT': 'Walmart',
  'ABT': 'Abbott Labs',
  'MMM': '3M',
  'EMR': 'Emerson Electric',
  'ITW': 'Illinois Tool Works',
  'CL': 'Colgate-Palmolive',
  'GPC': 'Genuine Parts',
  'DOV': 'Dover',
  'LOW': "Lowe's",
  'TGT': 'Target',
  'CAT': 'Caterpillar',
  'XOM': 'Exxon Mobil',
  'CVX': 'Chevron',
  'GD': 'General Dynamics',
  'BDX': 'Becton Dickinson',

  // 성장주
  'PLTR': 'Palantir',
  'SNOW': 'Snowflake',
  'CRWD': 'CrowdStrike',
  'NET': 'Cloudflare',
  'DDOG': 'Datadog',
  'ZS': 'Zscaler',
  'MDB': 'MongoDB',
  'PANW': 'Palo Alto Networks',
  'ANET': 'Arista Networks',
  'SMCI': 'Super Micro Computer',

  // 섹터 대표
  'JPM': 'JPMorgan Chase',
  'V': 'Visa',
  'UNH': 'UnitedHealth',
  'LLY': 'Eli Lilly',
  'HD': 'Home Depot',
  'CRM': 'Salesforce',
  'COST': 'Costco',
  'NFLX': 'Netflix',
  'AMD': 'AMD',
  'QCOM': 'Qualcomm',

  // 한국인 인기 ETF
  'SOXL': 'SOXL (반도체 3배 레버리지)',
  'TQQQ': 'TQQQ (나스닥 3배 레버리지)',
  'SCHD': 'SCHD (배당 ETF)',
  'VOO': 'VOO (S&P500 ETF)',
  'QQQ': 'QQQ (나스닥100 ETF)',
  'SPY': 'SPY (S&P500 ETF)',
};

// ─── 섹터 매핑 ────────────────────────────────────────

export const SECTOR_MAP: Record<string, string> = {
  // Technology
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
  'META': 'Technology', 'NVDA': 'Technology', 'AVGO': 'Technology',
  'AMD': 'Technology', 'QCOM': 'Technology', 'CRM': 'Technology',
  'ANET': 'Technology', 'SMCI': 'Technology',

  // Software / Cybersecurity
  'PLTR': 'Technology', 'SNOW': 'Technology', 'CRWD': 'Technology',
  'NET': 'Technology', 'DDOG': 'Technology', 'ZS': 'Technology',
  'MDB': 'Technology', 'PANW': 'Technology',

  // Consumer Discretionary
  'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary',
  'HD': 'Consumer Discretionary', 'LOW': 'Consumer Discretionary',
  'MCD': 'Consumer Discretionary', 'COST': 'Consumer Discretionary',
  'TGT': 'Consumer Discretionary', 'NFLX': 'Consumer Discretionary',
  'GPC': 'Consumer Discretionary',

  // Consumer Staples
  'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
  'WMT': 'Consumer Staples', 'CL': 'Consumer Staples',

  // Healthcare
  'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'LLY': 'Healthcare',
  'ABT': 'Healthcare', 'BDX': 'Healthcare',

  // Financials
  'JPM': 'Financials', 'V': 'Financials', 'BRK-B': 'Financials',

  // Industrials
  'CAT': 'Industrials', 'MMM': 'Industrials', 'EMR': 'Industrials',
  'ITW': 'Industrials', 'DOV': 'Industrials', 'GD': 'Industrials',

  // Energy
  'XOM': 'Energy', 'CVX': 'Energy',

  // ETF
  'SOXL': 'ETF', 'TQQQ': 'ETF', 'SCHD': 'ETF',
  'VOO': 'ETF', 'QQQ': 'ETF', 'SPY': 'ETF',
};

// ─── 유틸리티 함수 ────────────────────────────────────

/**
 * 중복 제거된 전체 티커 목록 반환
 */
export function getAllTickers(): string[] {
  return [...new Set(Object.values(STOCK_UNIVERSE).flat())];
}

/**
 * 카테고리별 티커 목록 반환
 */
export function getUniverseByCategory(category: string): string[] {
  return STOCK_UNIVERSE[category] || [];
}

/**
 * 티커가 속한 카테고리 반환
 */
export function getCategoryForTicker(ticker: string): string {
  for (const [cat, tickers] of Object.entries(STOCK_UNIVERSE)) {
    if (tickers.includes(ticker)) return cat;
  }
  return 'other';
}

/**
 * ETF 여부 판단
 */
export function isETF(ticker: string): boolean {
  return STOCK_UNIVERSE.koreanFavorites.includes(ticker);
}

/**
 * 섹터 반환
 */
export function getSector(ticker: string): string {
  return SECTOR_MAP[ticker] || 'Other';
}
