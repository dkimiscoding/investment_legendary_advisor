/**
 * S&P 500 배당 귀족주 리스트 (2024년 기준)
 * 
 * 배당 귀족주 자격:
 * - S&P 500 소속
 * - 시가총액 $30억 이상
 * - 25년 연속 배당 증액
 * 
 * 배당 왕족주(Dividend King): 50년 이상 연속 증액
 */

export interface DividendAristocratInfo {
  name: string;
  years: number;
  sector: string;
}

export const DIVIDEND_ARISTOCRATS: Record<string, DividendAristocratInfo> = {
  'MMM': { name: '3M', years: 65, sector: 'Industrials' },
  'ABT': { name: 'Abbott Labs', years: 51, sector: 'Healthcare' },
  'ABBV': { name: 'AbbVie', years: 51, sector: 'Healthcare' },
  'AFL': { name: 'Aflac', years: 41, sector: 'Financials' },
  'APD': { name: 'Air Products', years: 41, sector: 'Materials' },
  'ALB': { name: 'Albemarle', years: 29, sector: 'Materials' },
  'AMCR': { name: 'Amcor', years: 39, sector: 'Materials' },
  'AOS': { name: 'A.O. Smith', years: 30, sector: 'Industrials' },
  'ATO': { name: 'Atmos Energy', years: 39, sector: 'Utilities' },
  'ADP': { name: 'ADP', years: 49, sector: 'IT' },
  'BDX': { name: 'Becton Dickinson', years: 52, sector: 'Healthcare' },
  'BRO': { name: 'Brown & Brown', years: 29, sector: 'Financials' },
  'CAH': { name: 'Cardinal Health', years: 36, sector: 'Healthcare' },
  'CAT': { name: 'Caterpillar', years: 30, sector: 'Industrials' },
  'CVX': { name: 'Chevron', years: 36, sector: 'Energy' },
  'CB': { name: 'Chubb', years: 30, sector: 'Financials' },
  'CINF': { name: 'Cincinnati Financial', years: 63, sector: 'Financials' },
  'CTAS': { name: 'Cintas', years: 40, sector: 'Industrials' },
  'CLX': { name: 'Clorox', years: 46, sector: 'Consumer Staples' },
  'KO': { name: 'Coca-Cola', years: 61, sector: 'Consumer Staples' },
  'CL': { name: 'Colgate-Palmolive', years: 61, sector: 'Consumer Staples' },
  'DOV': { name: 'Dover', years: 68, sector: 'Industrials' },
  'ECL': { name: 'Ecolab', years: 32, sector: 'Materials' },
  'EMR': { name: 'Emerson Electric', years: 67, sector: 'Industrials' },
  'ESS': { name: 'Essex Property', years: 29, sector: 'Real Estate' },
  'EXPD': { name: 'Expeditors', years: 29, sector: 'Industrials' },
  'XOM': { name: 'Exxon Mobil', years: 41, sector: 'Energy' },
  'FRT': { name: 'Federal Realty', years: 56, sector: 'Real Estate' },
  'BEN': { name: 'Franklin Resources', years: 44, sector: 'Financials' },
  'GD': { name: 'General Dynamics', years: 32, sector: 'Industrials' },
  'GPC': { name: 'Genuine Parts', years: 67, sector: 'Consumer Disc' },
  'HRL': { name: 'Hormel Foods', years: 57, sector: 'Consumer Staples' },
  'IBM': { name: 'IBM', years: 28, sector: 'IT' },
  'ITW': { name: 'Illinois Tool Works', years: 49, sector: 'Industrials' },
  'JNJ': { name: 'Johnson & Johnson', years: 61, sector: 'Healthcare' },
  'KMB': { name: 'Kimberly-Clark', years: 51, sector: 'Consumer Staples' },
  'LIN': { name: 'Linde', years: 30, sector: 'Materials' },
  'LOW': { name: "Lowe's", years: 61, sector: 'Consumer Disc' },
  'MKC': { name: 'McCormick', years: 37, sector: 'Consumer Staples' },
  'MCD': { name: "McDonald's", years: 48, sector: 'Consumer Disc' },
  'MDT': { name: 'Medtronic', years: 46, sector: 'Healthcare' },
  'NEE': { name: 'NextEra Energy', years: 29, sector: 'Utilities' },
  'NUE': { name: 'Nucor', years: 50, sector: 'Materials' },
  'PEP': { name: 'PepsiCo', years: 51, sector: 'Consumer Staples' },
  'PG': { name: 'Procter & Gamble', years: 67, sector: 'Consumer Staples' },
  'ROP': { name: 'Roper Technologies', years: 30, sector: 'Industrials' },
  'SHW': { name: 'Sherwin-Williams', years: 45, sector: 'Materials' },
  'SWK': { name: 'Stanley Black & Decker', years: 56, sector: 'Industrials' },
  'SYY': { name: 'Sysco', years: 53, sector: 'Consumer Staples' },
  'TROW': { name: 'T. Rowe Price', years: 37, sector: 'Financials' },
  'TGT': { name: 'Target', years: 52, sector: 'Consumer Disc' },
  'WMT': { name: 'Walmart', years: 50, sector: 'Consumer Staples' },
  'WST': { name: 'West Pharma', years: 31, sector: 'Healthcare' },
  'ED': { name: 'Consolidated Edison', years: 49, sector: 'Utilities' },
};

/**
 * 배당 귀족/왕족 상태 반환
 * - king: 50년+ 연속 증액 (배당 왕족주)
 * - aristocrat: 25년+ 연속 증액 (배당 귀족주)
 * - none: 리스트에 없음
 */
export function getDividendStatus(ticker: string): 'king' | 'aristocrat' | 'none' {
  const entry = DIVIDEND_ARISTOCRATS[ticker];
  if (!entry) return 'none';
  return entry.years >= 50 ? 'king' : 'aristocrat';
}

/**
 * 배당 귀족주 연속 증액 년수 반환
 * 리스트에 없으면 null
 */
export function getConsecutiveYears(ticker: string): number | null {
  const entry = DIVIDEND_ARISTOCRATS[ticker];
  return entry ? entry.years : null;
}

/**
 * 배당 귀족주 정보 반환
 */
export function getAristocratInfo(ticker: string): DividendAristocratInfo | null {
  return DIVIDEND_ARISTOCRATS[ticker] || null;
}
