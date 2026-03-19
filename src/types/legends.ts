export interface LegendKeyMetric {
  label: string;
  value: string;
  isPositive: boolean;
}

export interface LegendPick {
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

export interface LegendRecommendation {
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

export interface ConsensusRecommendation {
  legendId: string;
  legendName: string;
  legendIcon: string;
  score: number;
}

export interface ConsensusStock {
  ticker: string;
  name: string;
  sector: string;
  recommendedBy: ConsensusRecommendation[];
  count: number;
}

export interface LegendsResponse {
  legends: LegendRecommendation[];
  consensus: ConsensusStock[];
  totalLegends: number;
  marketSummary: {
    vix: { value: number; level: string };
    sentiment: string;
    sp500Change: number;
  };
  updatedAt: string;
}
