// ============================================
// 미국주식 투자분석 도구 - 타입 정의
// ============================================

// --- Market Breadth ---
export interface MarketBreadthData {
  pctAbove200: number; // S&P500 내 200일선 상회 종목 비율 (0-100)
  pctAbove50: number;  // S&P500 내 50일선 상회 종목 비율 (0-100)
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
  prices: number[]; // recent prices for pattern detection
  marketBreadth?: MarketBreadthData;
}

export interface ChartScore {
  ma: number;        // 0-5: 이동평균선
  deviation: number; // 0-5: 이격도 (200일선 기준)
  rsi: number;       // 0-5: RSI
  pattern: number;   // 0-5: M/W 패턴
  breadth: number;   // 0-5: MA 상회 종목 비중
  total: number;     // 0-25
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
  epsGrowthRates: number[]; // 5년 EPS 성장률
  marketPE: number; // S&P500 PE
}

export interface ValuationScore {
  pe: number;         // 0-5
  fairPrice: number;  // 0-5
  peg: number;        // 0-5
  marketPe: number;   // 0-5
  total: number;      // 0-20
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
  upsideDownside: number; // %
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
  aaii: number;     // 0-5 (역발상: 비관적일수록 높음)
  putCall: number;  // 0-5
  vix: number;      // 0-5
  margin: number;   // 0-5
  hy: number;       // 0-5
  total: number;    // 0-25
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

// --- Combined ---
export interface CombinedResult {
  ticker: string;
  chart: ChartResult;
  valuation: ValuationResult;
  sentiment: SentimentResult;
  totalScore: number; // 0-70 (차트25 + 주가20 + 역발상25)
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
