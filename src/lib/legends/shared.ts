export const LEGEND_ICONS: Record<string, string> = {
  buffett: '🦉',
  graham: '📚',
  lynch: '🔍',
  livermore: '📈',
  templeton: '🌍',
  simons: '🤖',
  bogle: '⚖️',
  dalio: '🌦️',
};

export const LEGEND_COLORS: Record<string, string> = {
  buffett: '#D4F94E',
  graham: '#60A5FA',
  lynch: '#F472B6',
  livermore: '#F87171',
  templeton: '#A78BFA',
  simons: '#34D399',
  bogle: '#94A3B8',
  dalio: '#FB923C',
};

export const SECTOR_KO: Record<string, string> = {
  'Consumer Staples': '필수소비재',
  'Healthcare': '헬스케어',
  'Financials': '금융',
  'Technology': '기술',
  'Industrials': '산업재',
  'Energy': '에너지',
  'Consumer Discretionary': '임의소비재',
  'Communications': '통신',
  'Utilities': '유틸리티',
  'Real Estate': '부동산',
  'Materials': '소재',
  ETF: 'ETF',
  Other: '기타',
};

export const PORTFOLIO_STYLE_KO: Record<string, string> = {
  concentrated: '집중 투자형',
  diversified: '분산 투자형',
  quantitative: '퀀트형',
  index: '인덱스형',
  'all-weather': '올웨더형',
};

export const HOLDING_PERIOD_KO: Record<string, string> = {
  short: '단기 (1년 미만)',
  medium: '중기 (1-3년)',
  long: '장기 (3-10년)',
  indefinite: '무기한',
};

export const RISK_PROFILE_KO: Record<string, { label: string; color: string }> = {
  conservative: { label: '보수적', color: '#22C55E' },
  moderate: { label: '중립적', color: '#EAB308' },
  aggressive: { label: '공격적', color: '#EF4444' },
};

export const SENTIMENT_KO: Record<string, string> = {
  extreme_fear: '극도의 공포',
  fear: '공포',
  neutral: '중립',
  greed: '탐욕',
  extreme_greed: '극도의 탐욕',
};

export const VIX_LEVEL_KO: Record<string, string> = {
  low: '안정',
  moderate: '보통',
  elevated: '경계',
  high: '공포',
  extreme: '극도 공포',
};

export function maStatusLabel(status: string): string {
  if (status === 'above_both') return '강한 상승';
  if (status === 'above_50') return '상승 초기';
  if (status === 'above_200') return '장기 상승';
  return '하락 추세';
}

export function rsiLabel(level: string): string {
  if (level === 'oversold') return '과매도';
  if (level === 'overbought') return '과매수';
  return '중립';
}

export function valLabel(verdict: string): string {
  if (verdict === 'undervalued') return '저평가';
  if (verdict === 'overvalued') return '고평가';
  return '적정';
}
