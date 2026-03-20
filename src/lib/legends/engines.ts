import {
  SECTOR_KO,
  maStatusLabel,
  rsiLabel,
  valLabel,
} from '@/lib/legends/shared';
import type { LegendKeyMetric, ScreeningResult } from '@/types';

// ─── Scoring Engine Interface ─────────────────────────

export interface ScoringEngine {
  filter(stock: ScreeningResult): boolean;
  relaxedFilter(stock: ScreeningResult): boolean;
  score(stock: ScreeningResult, vixValue: number): number;
  opinion(stock: ScreeningResult): string;
  metrics(stock: ScreeningResult): LegendKeyMetric[];
  reasons(stock: ScreeningResult): string[];
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
    filter: () => true, // 퀀트는 모든 것을 봄
    relaxedFilter: () => true,
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
    filter: () => true,
    relaxedFilter: () => true,
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
    relaxedFilter: () => true,
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

// ─── 스코어링 엔진 매핑 ──────────────────────────────

export const LEGEND_ENGINES: Record<string, ScoringEngine> = {
  buffett: createBuffettEngine(),
  graham: createGrahamEngine(),
  lynch: createLynchEngine(),
  livermore: createLivermoreEngine(),
  templeton: createTempletonEngine(),
  simons: createSimonsEngine(),
  bogle: createBogleEngine(),
  dalio: createDalioEngine(),
};
