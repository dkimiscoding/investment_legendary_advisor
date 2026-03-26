// ============================================
// 미국주식 투자분석 도구 - 타입 정의
// ============================================

// --- Market Breadth ---
export interface MarketBreadthData {
  pctAbove200: number;
  pctAbove50: number;
}

// --- Chart Screener ---
export interface ChartData {
  ticker: string;
  date: string;
  close: number;
  ma50: number;
  ma200: number;
  rsi14: number;
  volume: number;
  prices: number[];
  marketBreadth?: MarketBreadthData;
}

export interface ChartScore {
  ma: number;
  deviation: number;
  rsi: number;
  pattern: number;
  breadth: number;
  total: number;
}

export interface ChartSignals {
  maStatus: 'above_both' | 'above_50' | 'above_200' | 'below_both';
  deviationPct: number;
  rsiLevel: 'oversold' | 'neutral' | 'overbought';
  pattern: 'accumulation' | 'distribution' | 'neutral';
}

export interface ChartResult {
  ticker: string;
  scores: ChartScore;
  signals: ChartSignals;
  verdict: 'fear' | 'neutral' | 'greed';
}

// --- Valuation Screener ---
export interface FinancialData {
  ticker: string;
  currentPrice: number;
  currentEPS: number;
  peRatio: number;
  forwardPE: number;
  epsGrowthRates: number[];
  marketPE: number;
}

export interface ValuationScore {
  pe: number;
  fairPrice: number;
  peg: number;
  marketPe: number;
  total: number;
}

export interface ValuationResult {
  ticker: string;
  currentPrice: number;
  peRatio: number;
  marketPE: number;
  estimatedEPS: number;
  fairPER: number;
  fairPERRange: { low: number; mid: number; high: number };
  fairPrice: number;
  fairPriceRange: { low: number; mid: number; high: number };
  upsideDownside: number;
  peg: number;
  scores: ValuationScore;
  verdict: 'undervalued' | 'fair' | 'overvalued';
}

// --- Sentiment Screener ---
export type DataSource = 'live' | 'fallback';

export interface SentimentData {
  vix: number;
  putCallRatio: number;
  aaiiBullish: number;
  aaiiBearish: number;
  marginDebtYoY: number;
  hySpread: number;
  sources?: {
    vix: DataSource;
    putCallRatio: DataSource;
    aaii: DataSource;
    marginDebt: DataSource;
    hySpread: DataSource;
  };
}

export interface SentimentScore {
  aaii: number;
  putCall: number;
  vix: number;
  margin: number;
  hy: number;
  total: number;
}

export interface SentimentResult {
  vix: { current: number; score: number };
  putCallRatio: { current: number; score: number };
  aaii: { bullish: number; bearish: number; spread: number; score: number };
  marginDebt: { yoy: number; score: number };
  hySpread: { current: number; score: number };
  totalScore: number;
  verdict: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
}

// --- Dividend Analysis ---
export interface DividendRawData {
  dividendYield: number;      // %
  payoutRatio: number;        // %
  annualDividend: number;     // $ per share
  fiveYearAvgYield: number;   // %
  consecutiveYears: number;
  growthRate: number;          // 5yr CAGR %
}

export interface DividendAnalysis {
  status: 'king' | 'aristocrat' | 'achiever' | 'payer' | 'none';
  scores: {
    yield: number;    // 0-5
    safety: number;   // 0-5
    growth: number;   // 0-5
    streak: number;   // 0-5
  };
  data: {
    dividendYield: number;
    payoutRatio: number;
    consecutiveYears: number;
    annualDividend: number;
    growthRate: number;
  };
  totalScore: number;
}

// --- DividendResult (combined-screener용 확장 타입) ---
export interface DividendResult {
  status: 'king' | 'aristocrat' | 'achiever' | 'grower' | 'payer' | 'none';
  scores: {
    yield: number;
    safety: number;
    growth: number;
    streak: number;
    total: number;
  };
  data: {
    dividendYield: number;
    payoutRatio: number;
    consecutiveYears: number;
    annualDividend: number;
    growthRate: number;
    dividendYield5YAvg: number;
  };
  signals: {
    yieldVsAvg: 'above_avg' | 'below_avg' | 'at_avg';
    payoutSafe: boolean;
  };
  verdict: 'attractive' | 'neutral' | 'unattractive';
  totalScore: number;
}

// --- Market Overview ---
export interface MarketQuote {
  label: string;
  ticker: string;
  price: number;
  change: number;
  changePct: number;
}

export interface MarketOverview {
  sp500: MarketQuote;
  nasdaq: MarketQuote;
  vix: MarketQuote;
  treasury10y: MarketQuote;
  timestamp: string;
}

// --- Masters Strategy Engine ---
export interface MastersData {
  roe: number;                      // Return on Equity (%) — financialData.returnOnEquity × 100
  debtToEquity: number;             // Debt-to-Equity ratio (%) — financialData.debtToEquity
  pbr: number;                      // Price-to-Book Ratio — defaultKeyStatistics.priceToBook
  currentRatio: number;             // Current Ratio — financialData.currentRatio
  revenueGrowth: number;            // Revenue Growth YoY (%) — financialData.revenueGrowth × 100
  week52High: number;               // 52-week high price
  week52Low: number;                // 52-week low price
  avgVolume10d: number;             // 10-day average daily volume
  avgVolume3m: number;              // 3-month average daily volume
  beta: number;                     // Beta (vs S&P 500)
  sector: string;                   // Sector name
}

export interface MasterVerdict {
  master: string;
  strategy: string;
  verdict: 'buy' | 'hold' | 'avoid';
  reason: string;
  score: number; // 0-10
}

export interface MastersResult {
  ticker: string;
  verdicts: MasterVerdict[];
  consensus: { buy: number; hold: number; avoid: number };
  bestFit: string;    // 이 종목에 가장 적합한 대가 전략
  overallScore: number; // 0-100 (8명 평균)
}

// --- Combined ---
export interface CombinedResult {
  ticker: string;
  chart: ChartResult;
  valuation: ValuationResult;
  sentiment: SentimentResult;
  dividend?: DividendAnalysis;
  masters?: MastersResult;
  dataSources?: {
    vix: DataSource;
    putCallRatio: DataSource;
    aaii: DataSource;
    marginDebt: DataSource;
    hySpread: DataSource;
  };
  totalScore: number;  // 0-70 (차트25 + 주가20 + 역발상25)
  finalVerdict: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  actionGuide: string;
}

// --- Top 20 ---
export interface Top20Stock {
  ticker: string;
  name: string;
  chartScore: number;
  valuationScore: number;
  sentimentScore: number;
  totalScore: number;
  tier: 1 | 2 | 3;
}

// --- Screening (자동 스크리닝) ---
export interface ScreeningResult {
  ticker: string;
  name: string;
  category: string;
  currentPrice: number;
  changePercent: number;
  totalScore: number;
  maxScore: number;
  chartScore: number;
  valuationScore: number;
  sentimentScore: number;
  dividendScore: number | null;
  verdict: string;
  highlights: string[];
  signals: {
    maStatus: string;
    rsiLevel: string;
    valuationVerdict: string;
    pattern: string;
  };
  isDividendAristocrat: boolean;
  sector: string;
  lastUpdated: string;
}

export interface ScreeningUniverseMeta {
  label: string;
  totalCandidates: number;
  rankingBasis: 'latest-analysis-score';
  segments: string[];
}

export interface DailyScreeningReport {
  date: string;
  universeMeta?: ScreeningUniverseMeta;
  marketSummary: {
    sp500: { price: number; change: number };
    vix: { value: number; level: string };
    tenYearYield: number;
    sentimentVerdict: string;
  };
  topPicks: {
    fearBuys: ScreeningResult[];
    undervalued: ScreeningResult[];
    dividendAttractive: ScreeningResult[];
    momentumLeaders: ScreeningResult[];
  };
  allResults: ScreeningResult[];
  sectorRotation: {
    sector: string;
    avgScore: number;
    recommendation: string;
    tickers: string[];
  }[];
  stats: {
    totalAnalyzed: number;
    successCount: number;
    failedCount: number;
    failedTickers: string[];
  };
  updatedAt: string;
}

export * from './legends';
