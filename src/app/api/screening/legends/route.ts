import { NextRequest, NextResponse } from 'next/server';
import { LEGEND_STRATEGIES } from '@/lib/data/legend-strategies';
import { STOCK_NAMES } from '@/lib/data/stock-universe';
import { runDailyScreening } from '@/lib/screeners/auto-screener';
import { ScreeningResult, DailyScreeningReport } from '@/types';

export const maxDuration = 300;

// ─── Response Types ───────────────────────────────────

interface LegendKeyMetric {
  label: string;
  value: string;
  isPositive: boolean;
}

interface LegendPick {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  changePercent: number;
  score: number;
  legendOpinion: string;
  keyMetrics: LegendKeyMetric[];
  reasons: string[];
}

interface LegendRecommendation {
  legendId: string;
  legendName: string;
  legendNameEn: string;
  legendNickname: string;
  legendIcon: string;
  legendColor: string;
  philosophy: string;
  famousQuote: string;
  marketView: string;
  investmentAdvice: string;
  topPicks: LegendPick[];
  portfolioStyle: string;
  holdingPeriod: string;
  riskProfile: string;
}

interface ConsensusStock {
  ticker: string;
  name: string;
  sector: string;
  recommendedBy: { legendId: string; legendName: string; legendIcon: string; score: number }[];
  count: number;
}

// ─── Constants ────────────────────────────────────────

const LEGEND_ICONS: Record<string, string> = {
  buffett: '🦉', graham: '📚', lynch: '🔍', livermore: '📈',
  templeton: '🌍', simons: '🤖', bogle: '⚖️', dalio: '🌦️',
};

const LEGEND_COLORS: Record<string, string> = {
  buffett: '#D4F94E', graham: '#60A5FA', lynch: '#F472B6', livermore: '#F87171',
  templeton: '#A78BFA', simons: '#34D399', bogle: '#94A3B8', dalio: '#FB923C',
};

const TOP_PICKS_COUNT = 5;
const MAX_OVERLAP = 2;

const SECTOR_KO: Record<string, string> = {
  'Consumer Staples': '필수소비재', 'Healthcare': '헬스케어', 'Financials': '금융',
  'Technology': '기술', 'Industrials': '산업재', 'Energy': '에너지',
  'Consumer Discretionary': '임의소비재', 'Communications': '통신', 'Utilities': '유틸리티',
  'Real Estate': '부동산', 'Materials': '소재', 'ETF': 'ETF', 'Other': '기타',
};

const PORTFOLIO_STYLE_KO: Record<string, string> = {
  concentrated: '집중 투자형', diversified: '분산 투자형', quantitative: '퀀트형',
  index: '인덱스형', 'all-weather': '올웨더형',
};

const HOLDING_PERIOD_KO: Record<string, string> = {
  short: '단기 (1년 미만)', medium: '중기 (1-3년)', long: '장기 (3-10년)', indefinite: '무기한',
};

// ─── Scoring Engine Interface ─────────────────────────

interface ScoringEngine {
  filter(stock: ScreeningResult): boolean;
  relaxedFilter(stock: ScreeningResult): boolean;
  score(stock: ScreeningResult, vixValue: number): number;
  opinion(stock: ScreeningResult): string;
  metrics(stock: ScreeningResult): LegendKeyMetric[];
  reasons(stock: ScreeningResult): string[];
}

// ─── Helper ───────────────────────────────────────────

function maStatusLabel(status: string): string {
  if (status === 'above_both') return '강한 상승';
  if (status === 'above_50') return '상승 초기';
  if (status === 'above_200') return '장기 상승';
  return '하락 추세';
}

function rsiLabel(level: string): string {
  if (level === 'oversold') return '과매도';
  if (level === 'overbought') return '과매수';
  return '중립';
}

function valLabel(verdict: string): string {
  if (verdict === 'undervalued') return '저평가';
  if (verdict === 'overvalued') return '고평가';
  return '적정';
}

// ─── 1. 워런 버핏 (가치 + 배당 + 우량기업) ──────────

function createBuffettEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Consumer Staples': 8, 'Healthcare': 8, 'Financials': 5,
    'Consumer Discretionary': 3, 'Industrials': 3,
  };
  return {
    filter: (s) => s.signals.valuationVerdict !== 'overvalued' && s.sector !== 'ETF',
    relaxedFilter: (s) => s.sector !== 'ETF',
    score(s) {
      let sc = s.valuationScore * 3;
      sc += (s.dividendScore ?? 0) * 2;
      if (s.isDividendAristocrat) sc += 20;
      if (s.signals.valuationVerdict === 'undervalued') sc += 10;
      if (s.signals.maStatus === 'above_both') sc += 3;
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      if (s.signals.valuationVerdict === 'undervalued') {
        parts.push(`${s.name}은(는) 현재 내재가치 대비 저평가되어 있어 매력적인 진입 구간입니다.`);
      } else {
        parts.push(`${s.name}은(는) 합리적인 가격 수준에서 거래되고 있습니다.`);
      }
      if (s.isDividendAristocrat) {
        parts.push('수십 년간 배당을 꾸준히 인상해온 역사는 이 기업의 견고한 현금흐름과 주주환원 의지를 보여줍니다.');
      } else if (s.dividendScore && s.dividendScore >= 10) {
        parts.push('안정적인 배당 수익도 장기 투자자에게 매력적입니다.');
      }
      parts.push(`${SECTOR_KO[s.sector] || s.sector} 분야에서 지속 가능한 경쟁우위(해자)를 가진 기업으로 판단됩니다.`);
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '밸류에이션', value: valLabel(s.signals.valuationVerdict), isPositive: s.signals.valuationVerdict !== 'overvalued' });
      if (s.dividendScore !== null) {
        m.push({ label: '배당', value: s.dividendScore >= 15 ? '우수' : s.dividendScore >= 10 ? '양호' : '보통', isPositive: s.dividendScore >= 10 });
      }
      if (s.isDividendAristocrat) m.push({ label: '배당 귀족', value: '✓', isPositive: true });
      m.push({ label: '추세', value: maStatusLabel(s.signals.maStatus), isPositive: s.signals.maStatus !== 'below_both' });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      if (s.signals.valuationVerdict === 'undervalued') r.push('내재가치 대비 저평가');
      if (s.isDividendAristocrat) r.push('배당 귀족주 — 장기 배당 인상 역사');
      if (s.dividendScore && s.dividendScore >= 10) r.push('높은 배당 매력도');
      if (s.signals.maStatus === 'above_both') r.push('안정적 상승 추세');
      r.push(`${SECTOR_KO[s.sector] || s.sector} 섹터 우량 기업`);
      return r.slice(0, 4);
    },
  };
}

// ─── 2. 벤자민 그레이엄 (극단적 안전마진) ───────────

function createGrahamEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Financials': 5, 'Industrials': 5, 'Consumer Staples': 5, 'Utilities': 3, 'Energy': 3,
  };
  return {
    filter: (s) => s.signals.valuationVerdict === 'undervalued' && s.sector !== 'ETF',
    relaxedFilter: (s) => s.signals.valuationVerdict !== 'overvalued' && s.sector !== 'ETF',
    score(s) {
      let sc = s.valuationScore * 5;
      sc += (s.dividendScore ?? 0) * 1.5;
      if (s.isDividendAristocrat) sc += 10;
      if (s.signals.valuationVerdict === 'undervalued') sc += 15;
      // 그레이엄은 모멘텀을 의심 — 과열 종목 감점
      if (s.chartScore > 20) sc -= 10;
      if (s.signals.rsiLevel === 'overbought') sc -= 15;
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      parts.push(`${s.name}은(는) 현재 시장에서 안전마진이 확보된 종목입니다.`);
      if (s.signals.valuationVerdict === 'undervalued') {
        parts.push('내재가치 대비 할인된 가격에 거래되고 있어, 하방 리스크가 제한적입니다.');
      }
      if (s.isDividendAristocrat) {
        parts.push('장기간 배당을 유지한 기록은 기업의 재무 건전성을 입증합니다.');
      }
      if (s.chartScore <= 12) {
        parts.push('시장이 이 기업의 진정한 가치를 인식하기까지 인내가 필요하지만, 그것이 바로 기회입니다.');
      }
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '안전마진', value: s.signals.valuationVerdict === 'undervalued' ? '충분' : '부분', isPositive: s.signals.valuationVerdict === 'undervalued' });
      m.push({ label: '밸류에이션', value: `${s.valuationScore}/20`, isPositive: s.valuationScore >= 12 });
      if (s.dividendScore !== null) {
        m.push({ label: '배당', value: s.dividendScore >= 10 ? '양호' : '보통', isPositive: s.dividendScore >= 10 });
      }
      m.push({ label: 'RSI', value: rsiLabel(s.signals.rsiLevel), isPositive: s.signals.rsiLevel !== 'overbought' });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      if (s.signals.valuationVerdict === 'undervalued') r.push('내재가치 대비 안전마진 확보');
      r.push(`밸류에이션 점수 ${s.valuationScore}/20점`);
      if (s.isDividendAristocrat) r.push('배당 귀족주 — 재무 건전성 입증');
      if (s.chartScore <= 10) r.push('시장 과소평가 — 역발상 기회');
      if (s.signals.rsiLevel !== 'overbought') r.push('과열되지 않은 가격 수준');
      return r.slice(0, 4);
    },
  };
}

// ─── 3. 피터 린치 (성장 대비 합리적 가격) ───────────

function createLynchEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Technology': 8, 'Consumer Discretionary': 6, 'Healthcare': 5, 'Communications': 4,
  };
  return {
    filter: (s) => s.sector !== 'ETF' && s.sector !== 'Utilities' && s.sector !== 'Real Estate',
    relaxedFilter: (s) => s.sector !== 'ETF',
    score(s) {
      let sc = s.chartScore * 2.5;
      sc += s.valuationScore * 2;
      if (s.changePercent > 0) sc += Math.min(s.changePercent * 2, 10);
      if (s.signals.pattern === 'accumulation') sc += 8;
      if (s.signals.valuationVerdict === 'undervalued' && s.chartScore >= 15) sc += 12; // 성장 + 가치 콤보
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      if (s.chartScore >= 18 && s.valuationScore >= 12) {
        parts.push(`${s.name}은(는) 전형적인 '성장을 공짜로 사는' 기회입니다.`);
        parts.push('기술적 모멘텀이 살아있으면서도 밸류에이션이 합리적입니다.');
      } else if (s.chartScore >= 18) {
        parts.push(`${s.name}은(는) 강한 성장 모멘텀을 보이고 있습니다.`);
        parts.push(`${SECTOR_KO[s.sector] || s.sector} 분야에서 시장 점유율을 빠르게 확대하고 있는 것으로 보입니다.`);
      } else {
        parts.push(`${s.name}은(는) 성장 잠재력이 아직 주가에 충분히 반영되지 않은 종목입니다.`);
      }
      if (s.signals.pattern === 'accumulation') {
        parts.push('스마트머니의 매집 패턴이 감지됩니다.');
      }
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '성장성', value: s.chartScore >= 18 ? '우수' : s.chartScore >= 12 ? '양호' : '보통', isPositive: s.chartScore >= 12 });
      m.push({ label: '밸류에이션', value: valLabel(s.signals.valuationVerdict), isPositive: s.signals.valuationVerdict !== 'overvalued' });
      m.push({ label: '모멘텀', value: s.changePercent > 0 ? `+${s.changePercent.toFixed(1)}%` : `${s.changePercent.toFixed(1)}%`, isPositive: s.changePercent > 0 });
      m.push({ label: '패턴', value: s.signals.pattern === 'accumulation' ? '매집' : s.signals.pattern === 'distribution' ? '분배' : '중립', isPositive: s.signals.pattern === 'accumulation' });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      if (s.chartScore >= 18 && s.valuationScore >= 12) r.push('성장 + 가치의 이상적 조합');
      if (s.chartScore >= 15) r.push('강한 성장 모멘텀');
      if (s.signals.valuationVerdict === 'undervalued') r.push('성장률 대비 저평가');
      if (s.signals.pattern === 'accumulation') r.push('W패턴(매집) 감지');
      if (s.changePercent > 0) r.push(`최근 주가 상승 (+${s.changePercent.toFixed(1)}%)`);
      r.push(`${SECTOR_KO[s.sector] || s.sector} 섹터 성장주`);
      return r.slice(0, 4);
    },
  };
}

// ─── 4. 제시 리버모어 (순수 모멘텀/추세추종) ────────

function createLivermoreEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Technology': 5, 'Energy': 3, 'Consumer Discretionary': 3,
  };
  return {
    filter: (s) =>
      (s.signals.maStatus === 'above_both' || s.signals.maStatus === 'above_50') &&
      s.signals.rsiLevel !== 'overbought' &&
      s.sector !== 'ETF',
    relaxedFilter: (s) =>
      s.signals.maStatus !== 'below_both' &&
      s.signals.rsiLevel !== 'overbought',
    score(s) {
      let sc = s.chartScore * 5;
      if (s.signals.pattern === 'accumulation') sc += 15;
      if (s.signals.maStatus === 'above_both') sc += 10;
      if (s.changePercent > 0) sc += Math.min(s.changePercent * 3, 15);
      if (s.signals.rsiLevel === 'neutral') sc += 5; // 모멘텀 구간 보너스
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      if (s.signals.maStatus === 'above_both') {
        parts.push(`${s.name}은(는) 50일/200일 이동평균선을 모두 상회하며 확실한 상승 추세에 있습니다.`);
      } else {
        parts.push(`${s.name}은(는) 상승 추세가 시작되고 있습니다.`);
      }
      if (s.signals.pattern === 'accumulation') {
        parts.push('거래량 패턴이 기관의 매집을 시사합니다. 큰 움직임이 올 수 있습니다.');
      }
      if (s.signals.rsiLevel === 'neutral') {
        parts.push('RSI가 모멘텀 구간(50-70)에 위치해 있어 아직 상승 여력이 있습니다.');
      }
      parts.push('추세가 확인된 종목에 올라타되, 반드시 손절 라인을 설정하세요.');
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '추세', value: maStatusLabel(s.signals.maStatus), isPositive: s.signals.maStatus === 'above_both' });
      m.push({ label: 'RSI', value: rsiLabel(s.signals.rsiLevel), isPositive: s.signals.rsiLevel === 'neutral' });
      m.push({ label: '차트점수', value: `${s.chartScore}/25`, isPositive: s.chartScore >= 15 });
      m.push({ label: '등락률', value: `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`, isPositive: s.changePercent > 0 });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      if (s.signals.maStatus === 'above_both') r.push('50일+200일선 상회 (강한 상승 추세)');
      else if (s.signals.maStatus === 'above_50') r.push('50일선 상회 (상승 추세 전환)');
      if (s.signals.pattern === 'accumulation') r.push('기관 매집 패턴 감지');
      if (s.signals.rsiLevel === 'neutral') r.push('RSI 모멘텀 구간 (상승 여력)');
      if (s.changePercent > 2) r.push(`최근 강한 상승 (+${s.changePercent.toFixed(1)}%)`);
      r.push(`차트 점수 ${s.chartScore}/25점`);
      return r.slice(0, 4);
    },
  };
}

// ─── 5. 존 템플턴 (역발상/비관론 매수) ─────────────

function createTempletonEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Healthcare': 5, 'Energy': 5, 'Industrials': 3, 'Financials': 3,
  };
  return {
    filter: (s) =>
      s.signals.rsiLevel === 'oversold' ||
      s.signals.valuationVerdict === 'undervalued' ||
      s.signals.maStatus === 'below_both' ||
      s.chartScore <= 10,
    relaxedFilter: (s) =>
      s.signals.valuationVerdict !== 'overvalued' ||
      s.chartScore <= 15,
    score(s) {
      let sc = s.valuationScore * 4;
      sc += (25 - s.chartScore) * 2; // 역으로: 차트가 나쁠수록 점수 높음
      if (s.signals.rsiLevel === 'oversold') sc += 20;
      if (s.signals.maStatus === 'below_both') sc += 10;
      if (s.signals.valuationVerdict === 'undervalued') sc += 15;
      sc += (s.dividendScore ?? 0);
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      if (s.signals.rsiLevel === 'oversold') {
        parts.push(`${s.name}은(는) 현재 극도의 과매도 상태입니다.`);
        parts.push('다른 투자자들이 두려워할 때가 바로 매수의 적기입니다.');
      } else if (s.signals.maStatus === 'below_both') {
        parts.push(`${s.name}은(는) 주요 이동평균선을 하회하며 비관론이 지배하고 있습니다.`);
        parts.push('하지만 이 기업의 장기적 가치는 일시적인 주가 하락으로 훼손되지 않습니다.');
      } else {
        parts.push(`${s.name}은(는) 시장에서 과소평가된 종목입니다.`);
      }
      if (s.signals.valuationVerdict === 'undervalued') {
        parts.push('펀더멘탈 대비 깊은 할인을 받고 있어 장기적 가치 회복이 기대됩니다.');
      }
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '과매도', value: s.signals.rsiLevel === 'oversold' ? '극심' : s.chartScore <= 10 ? '심함' : '보통', isPositive: s.signals.rsiLevel === 'oversold' });
      m.push({ label: '밸류에이션', value: valLabel(s.signals.valuationVerdict), isPositive: s.signals.valuationVerdict === 'undervalued' });
      m.push({ label: '추세', value: maStatusLabel(s.signals.maStatus), isPositive: false }); // 템플턴은 하락이 오히려 긍정
      if (s.dividendScore !== null) {
        m.push({ label: '배당', value: s.dividendScore >= 10 ? '양호' : '보통', isPositive: s.dividendScore >= 10 });
      }
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      if (s.signals.rsiLevel === 'oversold') r.push('극도의 과매도 — 반등 잠재력');
      if (s.signals.valuationVerdict === 'undervalued') r.push('내재가치 대비 깊은 할인');
      if (s.signals.maStatus === 'below_both') r.push('이동평균선 하회 — 비관론 극대');
      if (s.chartScore <= 8) r.push('시장 극도 외면 — 최대 비관의 시점');
      if (s.dividendScore && s.dividendScore > 0) r.push('하락장에서도 배당 수령 가능');
      r.push(`밸류에이션 점수 ${s.valuationScore}/20점`);
      return r.slice(0, 4);
    },
  };
}

// ─── 6. 짐 사이먼스 (통계적 이상 신호) ─────────────

function createSimonsEngine(): ScoringEngine {
  const sectorBonus: Record<string, number> = {
    'Technology': 3, 'Financials': 3, 'Consumer Discretionary': 2,
  };
  return {
    filter: (_s) => true, // 퀀트는 모든 것을 봄
    relaxedFilter: (_s) => true,
    score(s) {
      // 극단값일수록 높은 점수 (양방향)
      const chartDeviation = Math.abs(s.chartScore - 12.5);
      const valDeviation = Math.abs(s.valuationScore - 10);
      let sc = chartDeviation * 4;
      sc += valDeviation * 3;
      sc += Math.abs(s.changePercent) * 2;
      // 극단적 RSI는 강한 신호
      if (s.signals.rsiLevel === 'oversold' || s.signals.rsiLevel === 'overbought') sc += 15;
      // 가격-추세 다이버전스 (차트 좋은데 밸류에이션 나쁨, 또는 그 반대)
      if ((s.chartScore >= 18 && s.valuationScore <= 6) || (s.chartScore <= 8 && s.valuationScore >= 15)) sc += 12;
      // 패턴 감지
      if (s.signals.pattern !== 'neutral') sc += 8;
      sc += sectorBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      const parts: string[] = [];
      const chartDev = Math.abs(s.chartScore - 12.5);
      const valDev = Math.abs(s.valuationScore - 10);
      if (chartDev > 8 || valDev > 7) {
        parts.push(`${s.name}에서 강한 통계적 이상 신호가 포착되었습니다.`);
      } else {
        parts.push(`${s.name}에서 유의미한 퀀트 신호가 감지되었습니다.`);
      }
      if (s.signals.rsiLevel === 'oversold') {
        parts.push('RSI가 극단적 과매도 수준으로, 평균회귀(Mean Reversion) 가능성이 높습니다.');
      } else if (s.signals.rsiLevel === 'overbought') {
        parts.push('RSI가 과매수 극단에 도달했습니다. 단기 조정 후 재매수 기회를 모색하세요.');
      }
      if ((s.chartScore >= 18 && s.valuationScore <= 6) || (s.chartScore <= 8 && s.valuationScore >= 15)) {
        parts.push('가격과 가치 간 다이버전스가 발생 — 이는 통계적 차익거래 기회입니다.');
      }
      parts.push('데이터가 말해주는 패턴을 따르세요.');
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      const chartDev = Math.abs(s.chartScore - 12.5);
      m.push({ label: '신호강도', value: chartDev > 8 ? '매우 강함' : chartDev > 5 ? '강함' : '보통', isPositive: chartDev > 5 });
      m.push({ label: 'RSI', value: rsiLabel(s.signals.rsiLevel), isPositive: s.signals.rsiLevel !== 'neutral' });
      m.push({ label: '변동성', value: Math.abs(s.changePercent) > 3 ? '높음' : '보통', isPositive: Math.abs(s.changePercent) > 2 });
      m.push({ label: '다이버전스', value: ((s.chartScore >= 18 && s.valuationScore <= 6) || (s.chartScore <= 8 && s.valuationScore >= 15)) ? '감지' : '없음', isPositive: (s.chartScore >= 18 && s.valuationScore <= 6) || (s.chartScore <= 8 && s.valuationScore >= 15) });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      const chartDev = Math.abs(s.chartScore - 12.5);
      if (chartDev > 8) r.push('극단적 차트 이상값 포착');
      if (s.signals.rsiLevel === 'oversold') r.push('과매도 극단 — 평균회귀 기대');
      if (s.signals.rsiLevel === 'overbought') r.push('과매수 극단 — 숏 또는 풋 헤지');
      if ((s.chartScore >= 18 && s.valuationScore <= 6) || (s.chartScore <= 8 && s.valuationScore >= 15)) r.push('가격-가치 다이버전스');
      if (s.signals.pattern !== 'neutral') r.push(`${s.signals.pattern === 'accumulation' ? '매집' : '분배'} 패턴 감지`);
      if (Math.abs(s.changePercent) > 3) r.push(`높은 변동성 (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(1)}%)`);
      r.push('통계적 알고리즘 시그널');
      return r.slice(0, 4);
    },
  };
}

// ─── 7. 잭 보글 (인덱스 > 개별주) ──────────────────

function createBogleEngine(): ScoringEngine {
  return {
    filter: (_s) => true,
    relaxedFilter: (_s) => true,
    score(s) {
      // ETF는 압도적 우선
      if (s.sector === 'ETF') return 200;
      // 비 ETF: 안정적 대형주 선호
      let sc = s.valuationScore * 1.5;
      sc += (s.dividendScore ?? 0) * 1.5;
      if (s.isDividendAristocrat) sc += 10;
      // 변동성 낮을수록 좋음 (차트 점수가 극단적이지 않으면 보너스)
      const chartStability = 12.5 - Math.abs(s.chartScore - 12.5);
      sc += chartStability;
      // 대형 우량 섹터 보너스
      const stableBonus: Record<string, number> = {
        'Consumer Staples': 5, 'Healthcare': 4, 'Utilities': 4, 'Financials': 3,
      };
      sc += stableBonus[s.sector] || 0;
      return sc;
    },
    opinion(s) {
      if (s.sector === 'ETF') {
        return `${s.name}은(는) 시장 전체에 분산 투자하는 가장 효율적인 방법입니다. 개별 종목 선택의 위험 없이 시장의 장기 성장에 참여할 수 있습니다. 낮은 비용으로 꾸준히 적립 매수하세요.`;
      }
      const parts: string[] = [];
      parts.push(`솔직히 말씀드리면, ${s.name} 대신 인덱스 펀드(VOO, SPY)에 투자하는 것이 대부분의 투자자에게 더 나은 선택입니다.`);
      if (s.isDividendAristocrat || (s.dividendScore && s.dividendScore >= 12)) {
        parts.push('다만, 이 기업은 안정적 배당과 견고한 시장 지위를 가지고 있어 인덱스 보완 용도로 고려할 수 있습니다.');
      }
      return parts.join(' ');
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '유형', value: s.sector === 'ETF' ? 'ETF' : '개별주', isPositive: s.sector === 'ETF' });
      m.push({ label: '안정성', value: Math.abs(s.chartScore - 12.5) < 5 ? '높음' : '보통', isPositive: Math.abs(s.chartScore - 12.5) < 5 });
      if (s.dividendScore !== null) {
        m.push({ label: '배당', value: s.dividendScore >= 10 ? '양호' : '보통', isPositive: s.dividendScore >= 10 });
      }
      m.push({ label: '밸류에이션', value: valLabel(s.signals.valuationVerdict), isPositive: s.signals.valuationVerdict !== 'overvalued' });
      return m;
    },
    reasons(s) {
      if (s.sector === 'ETF') {
        return ['시장 전체 분산 투자', '낮은 비용 구조', '장기 복리 효과', '개별 종목 리스크 제거'];
      }
      const r: string[] = [];
      if (s.isDividendAristocrat) r.push('배당 귀족주 — 안정적 배당');
      if (s.dividendScore && s.dividendScore >= 10) r.push('배당 수익률 양호');
      r.push('대형 우량주 — 시장 대표성');
      r.push('인덱스 보완 용도 추천');
      return r.slice(0, 4);
    },
  };
}

// ─── 8. 레이 달리오 (올웨더: 사이클 맞춤) ──────────

function createDalioEngine(): ScoringEngine {
  return {
    filter: (s) => s.sector !== 'ETF',
    relaxedFilter: (_s) => true,
    score(s, vixValue) {
      // 경제 사이클별 섹터 적합도 점수
      const cycleScores = getCycleSectorScores(vixValue);
      const sectorScore = cycleScores[s.sector] || 5;
      let sc = sectorScore * 5;
      // 배당 — 인컴 포트폴리오 역할
      sc += (s.dividendScore ?? 0) * 2;
      // 안정성 보너스 (이동평균선 상회 + RSI 중립)
      if (s.signals.maStatus === 'above_both' && s.signals.rsiLevel === 'neutral') sc += 10;
      // 밸류에이션 적정 이상
      if (s.signals.valuationVerdict !== 'overvalued') sc += s.valuationScore;
      return sc;
    },
    opinion() {
      return '';
    },
    metrics(s) {
      const m: LegendKeyMetric[] = [];
      m.push({ label: '추세', value: maStatusLabel(s.signals.maStatus), isPositive: s.signals.maStatus !== 'below_both' });
      m.push({ label: '밸류에이션', value: valLabel(s.signals.valuationVerdict), isPositive: s.signals.valuationVerdict !== 'overvalued' });
      if (s.dividendScore !== null) {
        m.push({ label: '배당', value: s.dividendScore >= 10 ? '양호' : '보통', isPositive: s.dividendScore >= 10 });
      }
      m.push({ label: 'RSI', value: rsiLabel(s.signals.rsiLevel), isPositive: s.signals.rsiLevel === 'neutral' });
      return m;
    },
    reasons(s) {
      const r: string[] = [];
      r.push(`현재 경제 사이클에 적합한 ${SECTOR_KO[s.sector] || s.sector} 섹터`);
      if (s.signals.maStatus === 'above_both') r.push('안정적 상승 추세');
      if (s.dividendScore && s.dividendScore >= 10) r.push('인컴 포트폴리오 기여');
      if (s.signals.valuationVerdict === 'undervalued') r.push('밸류에이션 매력');
      r.push('올웨더 포트폴리오 적합');
      return r.slice(0, 4);
    },
  };
}

function getCycleSectorScores(vixValue: number): Record<string, number> {
  if (vixValue >= 28) {
    // 수축기 — 방어적 섹터 우선
    return {
      'Consumer Staples': 10, 'Healthcare': 9, 'Utilities': 9,
      'Communications': 5, 'Financials': 3, 'Real Estate': 3,
      'Technology': 4, 'Consumer Discretionary': 3, 'Industrials': 3,
      'Materials': 3, 'Energy': 5,
    };
  }
  if (vixValue >= 20) {
    // 후기 사이클 — 혼합
    return {
      'Energy': 8, 'Healthcare': 7, 'Consumer Staples': 7,
      'Materials': 7, 'Financials': 5, 'Industrials': 6,
      'Technology': 5, 'Consumer Discretionary': 4, 'Utilities': 6,
      'Communications': 5,
    };
  }
  if (vixValue <= 14) {
    // 회복/확장 초기 — 성장 섹터
    return {
      'Financials': 9, 'Industrials': 8, 'Consumer Discretionary': 8,
      'Technology': 8, 'Materials': 7, 'Energy': 6,
      'Real Estate': 7, 'Healthcare': 5, 'Consumer Staples': 4,
      'Utilities': 4, 'Communications': 6,
    };
  }
  // 안정적 확장기 — 기술+소비
  return {
    'Technology': 9, 'Consumer Discretionary': 8, 'Financials': 7,
    'Industrials': 7, 'Communications': 7, 'Materials': 6,
    'Energy': 5, 'Healthcare': 6, 'Consumer Staples': 4,
    'Utilities': 3, 'Real Estate': 5,
  };
}

function getCycleLabel(vixValue: number): string {
  if (vixValue >= 28) return '수축기 (극도 공포)';
  if (vixValue >= 20) return '후기 사이클 (불안 증가)';
  if (vixValue <= 14) return '회복/확장 초기 (낙관)';
  return '확장기 (안정)';
}

// 달리오 전용: 동적 opinion 생성
function generateDalioOpinion(s: ScreeningResult, vixValue: number): string {
  const cycle = getCycleLabel(vixValue);
  const parts: string[] = [];
  parts.push(`현재 ${cycle} 국면에서 ${SECTOR_KO[s.sector] || s.sector} 섹터는 올웨더 전략에 부합합니다.`);
  if (s.signals.maStatus === 'above_both') {
    parts.push(`${s.name}은(는) 안정적 상승 추세를 유지하고 있어 포트폴리오 핵심 자산으로 적합합니다.`);
  }
  if (s.dividendScore && s.dividendScore >= 10) {
    parts.push('배당 수익이 인컴 포트폴리오 역할을 합니다.');
  }
  parts.push('다양한 경제 환경에 대비하기 위해 상관관계가 낮은 자산에 분산하세요.');
  return parts.join(' ');
}

// ─── 스코어링 엔진 매핑 ──────────────────────────────

const ENGINES: Record<string, ScoringEngine> = {
  buffett: createBuffettEngine(),
  graham: createGrahamEngine(),
  lynch: createLynchEngine(),
  livermore: createLivermoreEngine(),
  templeton: createTempletonEngine(),
  simons: createSimonsEngine(),
  bogle: createBogleEngine(),
  dalio: createDalioEngine(),
};

// ─── 시장 진단 생성 ──────────────────────────────────

function generateMarketView(
  legendId: string,
  market: DailyScreeningReport['marketSummary'],
): { view: string; advice: string } {
  const vix = market.vix.value;
  const sentiment = market.sentimentVerdict;
  const isFearful = vix > 22 || ['extreme_fear', 'fear'].includes(sentiment);
  const isGreedy = vix < 15 || ['extreme_greed', 'greed'].includes(sentiment);

  const views: Record<string, () => { view: string; advice: string }> = {
    buffett: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 시장에 공포가 퍼져 있습니다. 다른 사람들이 두려워할 때 탐욕을 부리세요.`,
        advice: '우량 기업의 펀더멘탈이 건전하다면, 시장의 공포를 이용해 합리적 가격에 매수하세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 시장이 지나치게 낙관적입니다. 다른 사람들이 탐욕스러울 때 두려워하세요.`,
        advice: '현금 비중을 높이고, 시장이 비쌀 때 무리하게 매수하지 마세요. 인내가 곧 투자입니다.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 시장은 비교적 안정적입니다. 좋은 기업을 합리적 가격에 찾을 수 있습니다.`,
        advice: '서두르지 마세요. 가치 있는 기업이 적정 가격에 올 때까지 기다리는 것도 투자입니다.',
      };
    },
    graham: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 시장의 공포가 안전마진이 확보된 종목을 만들어내고 있습니다.`,
        advice: '내재가치 대비 30% 이상 할인된 종목을 찾아 분산 투자하세요. 기업의 수치를 냉정하게 분석하세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 시장이 과열되어 안전마진을 찾기 어렵습니다.`,
        advice: '포트폴리오의 채권 비중을 높이세요. 저평가 종목이 나타날 때까지 현금을 보존하세요.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 선별적으로 안전마진이 있는 종목을 발굴할 수 있습니다.`,
        advice: 'PE와 PBR, 유동비율을 꼼꼼히 확인하세요. 숫자가 이야기를 해줍니다.',
      };
    },
    lynch: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 시장의 조정은 좋은 성장주를 할인 가격에 살 기회입니다.`,
        advice: '일상에서 자주 접하는 기업 중 성장률 대비 주가가 저렴한 종목을 찾으세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 시장이 뜨겁습니다. 성장주의 밸류에이션을 더 꼼꼼히 확인하세요.`,
        advice: 'PEG 비율을 반드시 확인하세요. 성장률이 높더라도 가격이 그보다 더 높으면 좋은 투자가 아닙니다.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 적정 수준입니다. 성장률 대비 합리적 가격의 종목을 찾기 좋은 환경입니다.`,
        advice: '당신의 집 앞을 지나가는 것에 투자하세요. 이해하기 쉬운 사업이 가장 좋은 투자입니다.',
      };
    },
    livermore: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 변동성이 높습니다. 추세가 확인될 때까지 관망하세요.`,
        advice: '포지션을 줄이고 현금을 확보하세요. 시장이 방향을 정하면 그때 움직이세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 강한 상승장입니다. 추세를 따라가되 이익 확정도 고려하세요.`,
        advice: '승리하는 포지션은 유지하고, 손실 포지션은 즉시 정리하세요. 큰 돈은 기다림에서 옵니다.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 시장이 안정적입니다. 모멘텀이 살아있는 종목을 주시하세요.`,
        advice: '추세가 친구입니다. 상승 추세가 확인된 종목에 올라타고, 반드시 손절 라인을 설정하세요.',
      };
    },
    templeton: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 비관주의가 고조되고 있습니다. 바로 지금이 제가 기다리던 순간입니다!`,
        advice: '극도의 비관 속에서 가장 좋은 매수 기회가 탄생합니다. 담대하게 행동하세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 시장이 지나치게 낙관적입니다. 역발상 매수 기회가 줄어들고 있습니다.`,
        advice: '현금을 모아두세요. 시장이 다시 공포에 빠질 때를 대비하세요.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 시장은 안정적이지만, 개별 종목 중 과도하게 외면받은 종목이 있습니다.`,
        advice: '시장 전체가 아닌, 개별 종목의 비관론을 찾으세요. 그곳에 기회가 숨어 있습니다.',
      };
    },
    simons: () => {
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 변동성 확대는 퀀트 전략의 알파를 증가시킵니다.`,
        advice: '극단적 가격 움직임에서 평균회귀 기회를 포착하세요. 감정이 아닌 데이터를 따르세요.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 낮은 변동성은 시그널을 약화시키지만, 극단값은 여전히 존재합니다.`,
        advice: '과매수/과매도 극단에서 발생하는 통계적 이상 신호에 집중하세요.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 시장에 다양한 통계적 패턴이 감지되고 있습니다.`,
        advice: '패턴을 찾고, 데이터가 말해주는 것을 들으세요. 수학은 자연의 언어입니다.',
      };
    },
    bogle: () => ({
      view: `VIX ${vix.toFixed(1)} — 시장의 단기 변동은 장기 투자자에게 큰 의미가 없습니다.`,
      advice: '시장 타이밍을 맞추려 하지 마세요. 매달 인덱스 펀드에 꾸준히 적립하는 것이 가장 확실한 부의 축적 방법입니다.',
    }),
    dalio: () => {
      const cycle = getCycleLabel(vix);
      if (isFearful) return {
        view: `VIX ${vix.toFixed(1)} — 현재 ${cycle}입니다. 방어적 자산으로 포트폴리오를 재조정하세요.`,
        advice: '필수소비재, 헬스케어, 유틸리티 비중을 높이고, 성장주 비중을 줄이세요. 위기는 피할 수 없지만 대비할 수 있습니다.',
      };
      if (isGreedy) return {
        view: `VIX ${vix.toFixed(1)} — 현재 ${cycle}입니다. 성장주에 기회가 있지만 과열에 유의하세요.`,
        advice: '기술주와 금융주 비중을 높이되, 채권과 원자재로 꼭 분산하세요. 분산투자는 유일한 무료 점심입니다.',
      };
      return {
        view: `VIX ${vix.toFixed(1)} — 현재 ${cycle}입니다. 균형 잡힌 포트폴리오를 유지하세요.`,
        advice: '어떤 경제 환경에서도 견딜 수 있도록 주식, 채권, 원자재, 현금에 골고루 분산하세요.',
      };
    },
  };

  return (views[legendId] || views.buffett)();
}

// ─── 중복 방지 로직 ──────────────────────────────────

function preventOverlap(
  allPicks: Record<string, { ticker: string; score: number; stock: ScreeningResult }[]>,
  legendOrder: string[],
): Record<string, { ticker: string; score: number; stock: ScreeningResult }[]> {
  const tickerCount: Record<string, number> = {};
  const result: Record<string, { ticker: string; score: number; stock: ScreeningResult }[]> = {};

  for (const legendId of legendOrder) {
    const candidates = allPicks[legendId] || [];
    const selected: typeof candidates = [];

    for (const pick of candidates) {
      if (selected.length >= TOP_PICKS_COUNT) break;
      const count = tickerCount[pick.ticker] || 0;
      if (count < MAX_OVERLAP) {
        selected.push(pick);
        tickerCount[pick.ticker] = count + 1;
      }
    }
    result[legendId] = selected;
  }

  return result;
}

// ─── 컨센서스 빌더 ───────────────────────────────────

function buildConsensus(
  recommendations: LegendRecommendation[],
): ConsensusStock[] {
  const tickerMap = new Map<string, ConsensusStock>();

  for (const rec of recommendations) {
    for (const pick of rec.topPicks) {
      if (!tickerMap.has(pick.ticker)) {
        tickerMap.set(pick.ticker, {
          ticker: pick.ticker,
          name: pick.name,
          sector: pick.sector,
          recommendedBy: [],
          count: 0,
        });
      }
      const entry = tickerMap.get(pick.ticker)!;
      entry.recommendedBy.push({
        legendId: rec.legendId,
        legendName: rec.legendName,
        legendIcon: rec.legendIcon,
        score: pick.score,
      });
      entry.count = entry.recommendedBy.length;
    }
  }

  return Array.from(tickerMap.values())
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count);
}

// ─── 메인 GET 핸들러 ─────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const legendId = searchParams.get('legend');

    // 1. 기존 스크리닝 데이터 활용 (캐시됨, 4시간 TTL)
    const screeningReport = await runDailyScreening(false);
    const allStocks = screeningReport.allResults;
    const vixValue = screeningReport.marketSummary.vix.value || 18;

    // 2. 각 레전드별 점수 계산 + 상위 8개 후보 선정
    const allCandidates: Record<string, { ticker: string; score: number; stock: ScreeningResult }[]> = {};

    for (const strategy of LEGEND_STRATEGIES) {
      const engine = ENGINES[strategy.id];
      if (!engine) continue;

      // 1차: 엄격 필터
      let candidates = allStocks.filter(s => engine.filter(s));

      // 2차: 후보 부족 시 완화 필터
      if (candidates.length < TOP_PICKS_COUNT) {
        candidates = allStocks.filter(s => engine.relaxedFilter(s));
      }

      // 점수 계산 + 정렬
      const scored = candidates.map(stock => ({
        ticker: stock.ticker,
        score: engine.score(stock, vixValue),
        stock,
      })).sort((a, b) => b.score - a.score);

      // 상위 8개 후보 (오버랩 방지 후 5개 선정)
      allCandidates[strategy.id] = scored.slice(0, 8);
    }

    // 3. 중복 방지 — 가장 고유한 레전드부터 처리
    // 순서: bogle(ETF 고유) → livermore(모멘텀) → templeton(역발상) → simons(퀀트) → graham → lynch → buffett → dalio
    const legendOrder = ['bogle', 'livermore', 'templeton', 'simons', 'graham', 'lynch', 'buffett', 'dalio'];
    const finalPicks = preventOverlap(allCandidates, legendOrder);

    // 4. 응답 생성
    const recommendations: LegendRecommendation[] = [];

    for (const strategy of LEGEND_STRATEGIES) {
      const engine = ENGINES[strategy.id];
      if (!engine) continue;

      const picks = finalPicks[strategy.id] || [];
      const maxScore = picks.length > 0 ? picks[0].score : 1;
      const { view, advice } = generateMarketView(strategy.id, screeningReport.marketSummary);

      const topPicks: LegendPick[] = picks.map((pick, idx) => {
        const s = pick.stock;
        let opinion = engine.opinion(s);
        // 달리오 특별 처리
        if (strategy.id === 'dalio' && !opinion) {
          opinion = generateDalioOpinion(s, vixValue);
        }
        return {
          rank: idx + 1,
          ticker: s.ticker,
          name: s.name || STOCK_NAMES[s.ticker] || s.ticker,
          sector: SECTOR_KO[s.sector] || s.sector,
          currentPrice: s.currentPrice,
          changePercent: s.changePercent,
          score: Math.round((pick.score / maxScore) * 100),
          legendOpinion: opinion,
          keyMetrics: engine.metrics(s),
          reasons: engine.reasons(s),
        };
      });

      recommendations.push({
        legendId: strategy.id,
        legendName: strategy.name,
        legendNameEn: strategy.nameEn,
        legendNickname: strategy.nickname,
        legendIcon: LEGEND_ICONS[strategy.id] || '🏆',
        legendColor: LEGEND_COLORS[strategy.id] || '#D4F94E',
        philosophy: strategy.philosophy,
        famousQuote: strategy.famousQuotes[Math.floor(Math.random() * strategy.famousQuotes.length)],
        marketView: view,
        investmentAdvice: advice,
        topPicks,
        portfolioStyle: PORTFOLIO_STYLE_KO[strategy.portfolioStyle] || strategy.portfolioStyle,
        holdingPeriod: HOLDING_PERIOD_KO[strategy.holdingPeriod] || strategy.holdingPeriod,
        riskProfile: strategy.riskProfile,
      });
    }

    // 5. 컨센서스 생성
    const consensus = buildConsensus(recommendations);

    // 특정 레전드만 요청한 경우
    if (legendId) {
      const filtered = recommendations.find(r => r.legendId === legendId);
      if (!filtered) {
        return NextResponse.json({ error: '해당 레전드를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(filtered);
    }

    return NextResponse.json({
      legends: recommendations,
      consensus,
      totalLegends: recommendations.length,
      marketSummary: {
        vix: screeningReport.marketSummary.vix,
        sentiment: screeningReport.marketSummary.sentimentVerdict,
        sp500Change: screeningReport.marketSummary.sp500.change,
      },
      updatedAt: screeningReport.updatedAt,
    });

  } catch (error: unknown) {
    console.error('Legend recommendations error:', error);
    const message = error instanceof Error ? error.message : '추천 생성 중 오류가 발생했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
