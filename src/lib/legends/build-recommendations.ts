import { LEGEND_STRATEGIES } from '@/lib/data/legend-strategies';
import { STOCK_NAMES } from '@/lib/data/stock-universe';
import { LEGEND_ENGINES } from '@/lib/legends/engines';
import {
  HOLDING_PERIOD_KO,
  LEGEND_COLORS,
  LEGEND_ICONS,
  PORTFOLIO_STYLE_KO,
  SECTOR_KO,
} from '@/lib/legends/shared';
import type {
  ConsensusStock,
  DailyScreeningReport,
  LegendRecommendation,
  LegendPick,
  LegendsResponse,
  ScreeningResult,
} from '@/types';

const TOP_PICKS_COUNT = 5;
const MAX_OVERLAP = 2;

function getCycleLabel(vixValue: number): string {
  if (vixValue >= 28) return '수축기 (극도 공포)';
  if (vixValue >= 20) return '후기 사이클 (불안 증가)';
  if (vixValue <= 14) return '회복/확장 초기 (낙관)';
  return '확장기 (안정)';
}

function generateDalioOpinion(stock: ScreeningResult, vixValue: number): string {
  const cycle = getCycleLabel(vixValue);
  const parts: string[] = [];

  parts.push(`현재 ${cycle} 국면에서 ${SECTOR_KO[stock.sector] || stock.sector} 섹터는 올웨더 전략에 부합합니다.`);

  if (stock.signals.maStatus === 'above_both') {
    parts.push(`${stock.name}은(는) 안정적 상승 추세를 유지하고 있어 포트폴리오 핵심 자산으로 적합합니다.`);
  }

  if (stock.dividendScore && stock.dividendScore >= 10) {
    parts.push('배당 수익이 인컴 포트폴리오 역할을 합니다.');
  }

  parts.push('다양한 경제 환경에 대비하기 위해 상관관계가 낮은 자산에 분산하세요.');

  return parts.join(' ');
}

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

function buildConsensus(recommendations: LegendRecommendation[]): ConsensusStock[] {
  const tickerMap = new Map<string, ConsensusStock>();

  for (const recommendation of recommendations) {
    for (const pick of recommendation.topPicks) {
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
        legendId: recommendation.legendId,
        legendName: recommendation.legendName,
        legendIcon: recommendation.legendIcon,
        score: pick.score,
      });
      entry.count = entry.recommendedBy.length;
    }
  }

  return Array.from(tickerMap.values())
    .filter((stock) => stock.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export function buildLegendRecommendations(input: { report: DailyScreeningReport }): LegendsResponse {
  const { report } = input;
  const allStocks = report.allResults;
  const vixValue = report.marketSummary.vix.value || 18;

  const allCandidates: Record<string, { ticker: string; score: number; stock: ScreeningResult }[]> = {};

  for (const strategy of LEGEND_STRATEGIES) {
    const engine = LEGEND_ENGINES[strategy.id];
    if (!engine) continue;

    let candidates = allStocks.filter((stock) => engine.filter(stock));
    if (candidates.length < TOP_PICKS_COUNT) {
      candidates = allStocks.filter((stock) => engine.relaxedFilter(stock));
    }

    allCandidates[strategy.id] = candidates
      .map((stock) => ({
        ticker: stock.ticker,
        score: engine.score(stock, vixValue),
        stock,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  const legendOrder = ['bogle', 'livermore', 'templeton', 'simons', 'graham', 'lynch', 'buffett', 'dalio'];
  const finalPicks = preventOverlap(allCandidates, legendOrder);

  const legends: LegendRecommendation[] = [];

  for (const strategy of LEGEND_STRATEGIES) {
    const engine = LEGEND_ENGINES[strategy.id];
    if (!engine) continue;

    const picks = finalPicks[strategy.id] || [];
    const maxScore = picks.length > 0 ? picks[0].score : 1;
    const { view, advice } = generateMarketView(strategy.id, report.marketSummary);

    const topPicks: LegendPick[] = picks.map((pick, index) => {
      const stock = pick.stock;
      const opinion = strategy.id === 'dalio'
        ? generateDalioOpinion(stock, vixValue)
        : engine.opinion(stock);

      return {
        rank: index + 1,
        ticker: stock.ticker,
        name: stock.name || STOCK_NAMES[stock.ticker] || stock.ticker,
        sector: SECTOR_KO[stock.sector] || stock.sector,
        currentPrice: stock.currentPrice,
        changePercent: stock.changePercent,
        score: Math.round((pick.score / maxScore) * 100),
        legendOpinion: opinion,
        keyMetrics: engine.metrics(stock),
        reasons: engine.reasons(stock),
      };
    });

    legends.push({
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

  return {
    legends,
    consensus: buildConsensus(legends),
    totalLegends: legends.length,
    marketSummary: {
      vix: report.marketSummary.vix,
      sentiment: report.marketSummary.sentimentVerdict,
      sp500Change: report.marketSummary.sp500.change,
    },
    updatedAt: report.updatedAt,
  };
}
