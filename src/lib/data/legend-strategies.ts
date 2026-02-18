/**
 * 투자 레전드(대가)들의 전략 정의
 *
 * 워런 버핏, 벤자민 그레이엄, 피터 린치, 제시 리버모어,
 * 존 템플턴, 짐 사이먼스, 잭 보글, 레이 달리오
 */

export interface LegendStrategy {
  id: string;
  name: string;
  nameEn: string;
  nickname: string;
  philosophy: string;
  keyMetrics: string[];
  criteria: {
    minMarketCap?: number;
    maxPE?: number;
    maxPB?: number;
    minROE?: number;
    minDividendYield?: number;
    maxDebtToEquity?: number;
    minEpsGrowth?: number;
    maxVolatility?: number;
    momentumPeriod?: string;
    sectorPreference?: string[];
    sectorAvoid?: string[];
  };
  scoringWeights: {
    valuation: number;
    quality: number;
    growth: number;
    momentum: number;
    dividend: number;
    stability: number;
  };
  description: string;
  famousQuotes: string[];
  portfolioStyle: 'concentrated' | 'diversified' | 'quantitative' | 'index' | 'all-weather';
  holdingPeriod: 'short' | 'medium' | 'long' | 'indefinite';
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export const LEGEND_STRATEGIES: LegendStrategy[] = [
  {
    id: 'buffett',
    name: '워런 버핏',
    nameEn: 'Warren Buffett',
    nickname: '오마하의 현인',
    philosophy: '내가 이해할 수 있는 사업(원) + 경쟁 우위(모) + 합리적 가격(가)',
    keyMetrics: ['ROE 15% 이상', '부채비율 50% 이하', 'PER 20 이하', '배당성향 30-60%'],
    criteria: {
      minROE: 15,
      maxDebtToEquity: 0.5,
      maxPE: 20,
      minMarketCap: 10e9, // $10B 이상
      sectorAvoid: ['Biotechnology', 'Cryptocurrency'],
    },
    scoringWeights: {
      valuation: 25,
      quality: 35,
      growth: 15,
      momentum: 5,
      dividend: 15,
      stability: 5,
    },
    description: '경쟁 우위(해자)가 있는 우량 기업을 합리적 가격에 장기 보유. 내가 이해할 수 있는 사업만 투자하며, ROE와 배당을 중시합니다.',
    famousQuotes: [
      '가격은 당신이 지불하는 것이고, 가치는 당신이 받는 것이다.',
      '위험은 당신이 무엇을 하는지 모를 때 발생한다.',
      '시장은 단기적으로는 투표기, 장기적으로는 저울이다.',
    ],
    portfolioStyle: 'concentrated',
    holdingPeriod: 'indefinite',
    riskProfile: 'moderate',
  },
  {
    id: 'graham',
    name: '벤자민 그레이엄',
    nameEn: 'Benjamin Graham',
    nickname: '가치투자의 아버지',
    philosophy: '안전마진(Margin of Safety) - 내재가격 대비 30-50% 할인된 가격에 매수',
    keyMetrics: ['PER 15 이하', 'PBR 1.5 이하', '부채비율 1.0 이하', '유동비율 2.0 이상'],
    criteria: {
      maxPE: 15,
      maxPB: 1.5,
      maxDebtToEquity: 1.0,
      minDividendYield: 0.02, // 2% 이상
    },
    scoringWeights: {
      valuation: 40,
      quality: 20,
      growth: 10,
      momentum: 5,
      dividend: 15,
      stability: 10,
    },
    description: 'NCAV(Net Current Asset Value) 전략. 내재가격 대비 크게 할인된 종목을 찾아 분산투자. 안전마진을 최우선으로 합니다.',
    famousQuotes: [
      '단기적으로 시장은 투표기이고, 장기적으로는 저울이다.',
      '투자의 가장 중요한 세 글자는 "안전마진"이다.',
      '똑똤한 투자자는 기다림의 예술을 알아야 한다.',
    ],
    portfolioStyle: 'diversified',
    holdingPeriod: 'long',
    riskProfile: 'conservative',
  },
  {
    id: 'lynch',
    name: '피터 린치',
    nameEn: 'Peter Lynch',
    nickname: '펀드매니저의 전설',
    philosophy: '당신의 집 앞을 지나가는 것에 투자하라. 일상에서 발견하는 기업에 집중.',
    keyMetrics: ['PEG < 1.0', '수익성장률 20% 이상', 'PER < 성장률', '재고 turnover 향상'],
    criteria: {
      maxPE: 25,
      minEpsGrowth: 0.20, // 20% 이상
      sectorPreference: ['Consumer Discretionary', 'Technology', 'Healthcare'],
    },
    scoringWeights: {
      valuation: 20,
      quality: 15,
      growth: 35,
      momentum: 20,
      dividend: 5,
      stability: 5,
    },
    description: '일상에서 발견하는 10배 주(Ten Bagger) 찾기. 성장률 대비 저평가된 종목(PEG<1)을 선호하며, 이해하기 쉬운 사업에 투자합니다.',
    famousQuotes: [
      '당신의 집 앞을 지나가는 것에 투자하라.',
      'PEG이 1보다 작으면 좋다.',
      '주식을 소유하지 않고는 부자가 될 수 없다.',
    ],
    portfolioStyle: 'diversified',
    holdingPeriod: 'medium',
    riskProfile: 'moderate',
  },
  {
    id: 'livermore',
    name: '제시 리버모어',
    nameEn: 'Jesse Livermore',
    nickname: '월스트리트의 대곰',
    philosophy: '추세가 당신의 친구다. 시장 흐름에 순응하되, 손절은 철저히.',
    keyMetrics: ['모멘텀 상위 20%', '거래량 급증', '신고가 돌파', 'RSI 50-70 구간'],
    criteria: {
      momentumPeriod: '3m',
      maxVolatility: 0.40,
      sectorPreference: ['Technology', 'Energy', 'Materials'],
    },
    scoringWeights: {
      valuation: 5,
      quality: 10,
      growth: 15,
      momentum: 50,
      dividend: 0,
      stability: 20,
    },
    description: '기술적 분석의 대가. 추세 추종 전략으로 시장 방향에 순응하며, 손절매를 철저히 지킵니다. 단기-중기 모멘텀을 최우선으로 합니다.',
    famousQuotes: [
      '시장은 항상 옳다.',
      '손실은 사실이고, 이익은 불확실하다.',
      '큰 돈은 기다림에서 온다.',
    ],
    portfolioStyle: 'concentrated',
    holdingPeriod: 'short',
    riskProfile: 'aggressive',
  },
  {
    id: 'templeton',
    name: '존 템플턴',
    nameEn: 'John Templeton',
    nickname: '세계적인 역발상 투자자',
    philosophy: '극도의 비관주의에서 매수, 극도의 낙관주의에서 매도',
    keyMetrics: ['PBR 1.0 이하', 'PER 10 이하', '부채비율 낮음', '글로벌 다각화'],
    criteria: {
      maxPE: 10,
      maxPB: 1.0,
      maxDebtToEquity: 0.3,
    },
    scoringWeights: {
      valuation: 35,
      quality: 20,
      growth: 15,
      momentum: 5,
      dividend: 20,
      stability: 5,
    },
    description: '전 세계의 저평가된 종목을 찾는 역발상 투자. 위기 상황에서 담대하게 매수하며, 장기적인 가치 회복을 기다립니다.',
    famousQuotes: [
      '비관주의가 최고조일 때 매수하라.',
      '다양성은 안전을 가져온다.',
      '가장 좋은 투자는 공포심이 극에 달했을 때다.',
    ],
    portfolioStyle: 'diversified',
    holdingPeriod: 'long',
    riskProfile: 'moderate',
  },
  {
    id: 'simons',
    name: '짐 사이먼스',
    nameEn: 'Jim Simons',
    nickname: '퀀트의 제왕',
    philosophy: '수학과 알고리즘으로 시장의 비효율성을 찾아내어 단타 매매',
    keyMetrics: ['볼린저 밴드 돌파', '평균회귀 패턴', '거래량 이상 신호', '상관관계 저해당'],
    criteria: {
      momentumPeriod: '1m',
      maxVolatility: 0.50,
    },
    scoringWeights: {
      valuation: 10,
      quality: 10,
      growth: 20,
      momentum: 40,
      dividend: 0,
      stability: 20,
    },
    description: '르네상스 테크놀로지의 창시자. 수학적 모델로 단기 시장 비효율성을 포착. 개인투자자에게는 적용 어려우나 모멘텀과 변동성 관리에 시사점을 줍니다.',
    famousQuotes: [
      '패턴을 찾아라.',
      '수학은 자연의 언어다.',
      '데이터가 말해주는 것을 들어라.',
    ],
    portfolioStyle: 'quantitative',
    holdingPeriod: 'short',
    riskProfile: 'aggressive',
  },
  {
    id: 'bogle',
    name: '잭 보글',
    nameEn: 'John Bogle',
    nickname: '인덱스 투자의 아버지',
    philosophy: '시장을 이길 수 없다. 낮은 비용으로 시장 전체를 따라가라.',
    keyMetrics: ['시가총액 가중', '총비용률 0.1% 이하', '장기 보유', '분산투자'],
    criteria: {
      minMarketCap: 1e9, // $1B 이상
      sectorPreference: ['ETF', 'Index Fund'],
    },
    scoringWeights: {
      valuation: 15,
      quality: 25,
      growth: 15,
      momentum: 10,
      dividend: 20,
      stability: 15,
    },
    description: 'Vanguard 창시자. 인덱스 펀드로 시장 전체를 추종하며, 낮은 비용과 장기 복리 효과를 강조. 대형주 중심의 안정적 포트폴리오를 선호합니다.',
    famousQuotes: [
      '평균을 이기려 하지 말고, 평균을 받아들여라.',
      '비용이 수익을 잡아먹는다.',
      '시장 타이밍보다 시간을 시장에 머무는 것이 중요하다.',
    ],
    portfolioStyle: 'index',
    holdingPeriod: 'indefinite',
    riskProfile: 'conservative',
  },
  {
    id: 'dalio',
    name: '레이 달리오',
    nameEn: 'Ray Dalio',
    nickname: '거시경제의 거장',
    philosophy: '올웨더(All Weather) 전략 - 경제 환경에 관계없이 견고한 포트폴리오',
    keyMetrics: ['상관관계 -0.2~0.2', '변동성 10% 이하', '인플레이션 대응력', '성장/가치 균형'],
    criteria: {
      maxVolatility: 0.15,
      sectorPreference: ['Consumer Staples', 'Utilities', 'Technology', 'Energy'],
    },
    scoringWeights: {
      valuation: 15,
      quality: 20,
      growth: 15,
      momentum: 10,
      dividend: 20,
      stability: 20,
    },
    description: 'Bridgewater 창시자. 올웨더 전략으로 성장/인플레이션/긴축/침체 4가지 경제 환경에 대응. 상관관계가 낮은 자산 분산을 강조합니다.',
    famousQuotes: [
      '위기는 피할 수 없다. 대비하라.',
      '분산투자는 유일한 무료 점심이다.',
      '진실은 공개된 것과 숨겨진 것의 합이다.',
    ],
    portfolioStyle: 'all-weather',
    holdingPeriod: 'long',
    riskProfile: 'moderate',
  },
];

/**
 * 레전드별 추천 종목 필터링
 */
export function getLegendRecommendedTickers(
  legendId: string,
  stockData: Record<string, any>
): string[] {
  const strategy = LEGEND_STRATEGIES.find(s => s.id === legendId);
  if (!strategy) return [];

  const tickers = Object.keys(stockData);
  
  return tickers.filter(ticker => {
    const data = stockData[ticker];
    if (!data) return false;

    const { criteria } = strategy;

    // 기본 필터링
    if (criteria.minMarketCap && data.marketCap < criteria.minMarketCap) return false;
    if (criteria.maxPE && data.pe && data.pe > criteria.maxPE) return false;
    if (criteria.maxPB && data.pb && data.pb > criteria.maxPB) return false;
    if (criteria.minROE && data.roe && data.roe < criteria.minROE) return false;
    if (criteria.minDividendYield && data.dividendYield && data.dividendYield < criteria.minDividendYield) return false;
    if (criteria.maxDebtToEquity && data.debtToEquity && data.debtToEquity > criteria.maxDebtToEquity) return false;
    if (criteria.minEpsGrowth && data.epsGrowth && data.epsGrowth < criteria.minEpsGrowth) return false;
    if (criteria.maxVolatility && data.volatility && data.volatility > criteria.maxVolatility) return false;

    // 섹터 필터링
    if (criteria.sectorAvoid && data.sector && criteria.sectorAvoid.includes(data.sector)) return false;

    return true;
  });
}

/**
 * 레전드별 점수 계산
 */
export function calculateLegendScore(
  legendId: string,
  stockMetrics: any
): number {
  const strategy = LEGEND_STRATEGIES.find(s => s.id === legendId);
  if (!strategy) return 0;

  const { scoringWeights } = strategy;
  
  // 각 지표별 점수 계산 (0-100)
  const valuationScore = stockMetrics.valuationScore || 50;
  const qualityScore = stockMetrics.qualityScore || 50;
  const growthScore = stockMetrics.growthScore || 50;
  const momentumScore = stockMetrics.momentumScore || 50;
  const dividendScore = stockMetrics.dividendScore || 50;
  const stabilityScore = stockMetrics.stabilityScore || 50;

  // 가중 평균 계산
  const totalWeight = Object.values(scoringWeights).reduce((a, b) => a + b, 0);
  
  const weightedScore = (
    valuationScore * scoringWeights.valuation +
    qualityScore * scoringWeights.quality +
    growthScore * scoringWeights.growth +
    momentumScore * scoringWeights.momentum +
    dividendScore * scoringWeights.dividend +
    stabilityScore * scoringWeights.stability
  ) / totalWeight;

  return Math.round(weightedScore);
}

/**
 * 레전드별 포트폴리오 스타일 설명
 */
export function getPortfolioStyleDescription(style: string): string {
  const descriptions: Record<string, string> = {
    concentrated: '집중 투자형 - 확신이 드는 5-10개 종목에 집중',
    diversified: '분산 투자형 - 20-50개 종목으로 리스크 분산',
    quantitative: '퀀트형 - 알고리즘 기반 단기 매매',
    index: '인덱스형 - 시장 전체 추종',
    'all-weather': '올웨더형 - 경제 환경에 무관하게 견고한 구성',
  };
  return descriptions[style] || style;
}

/**
 * 리스크 프로필 설명
 */
export function getRiskProfileDescription(risk: string): string {
  const descriptions: Record<string, string> = {
    conservative: '보수적 - 자본 보존 우선, 낮은 변동성',
    moderate: '중립적 - 수익과 안정의 균형',
    aggressive: '공격적 - 높은 수익 추구, 높은 변동성 감수',
  };
  return descriptions[risk] || risk;
}
