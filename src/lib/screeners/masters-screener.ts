/**
 * 투자 대가 전략 엔진 (Masters Strategy Screener)
 * 
 * 8대 투자 대가의 핵심 전략을 알고리즘화하여,
 * 종목 분석 시 "이 대가라면 어떻게 판단할까?"를 제공합니다.
 * 
 * 1. 워런 버핏 (Warren Buffett) — 가치투자의 제왕
 * 2. 벤자민 그레이엄 (Benjamin Graham) — 안전마진의 아버지
 * 3. 피터 린치 (Peter Lynch) — PEG의 달인
 * 4. 제시 리버모어 (Jesse Livermore) — 추세추종의 전설
 * 5. 존 템플턴 (John Templeton) — 역발상의 선구자
 * 6. 짐 사이먼스 (Jim Simons) — 퀀트의 신
 * 7. 잭 보글 (Jack Bogle) — 인덱스의 아버지
 * 8. 레이 달리오 (Ray Dalio) — 올웨더의 설계자
 * 
 * ⚠️ 본 도구는 투자 조언이 아닌 시장 분석 정보를 제공합니다.
 * 모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
 */

import {
  MasterVerdict,
  MastersResult,
  MastersData,
  ChartData,
  FinancialData,
  SentimentResult,
  DividendRawData,
} from '@/types';

// ─── 입력 타입 ───────────────────────────────────────

export interface MastersInput {
  ticker: string;
  mastersData: MastersData;
  chartData: ChartData;
  financialData: FinancialData;
  sentiment?: SentimentResult;
  dividendData?: DividendRawData | null;
}

// ─── 유틸리티 ────────────────────────────────────────

function clampScore(score: number): number {
  return Math.min(10, Math.max(0, Math.round(score * 100) / 100));
}

function getVerdict(score: number): 'buy' | 'hold' | 'avoid' {
  if (score >= 7) return 'buy';
  if (score >= 4) return 'hold';
  return 'avoid';
}

function avgGrowthRate(rates: number[]): number {
  if (rates.length === 0) return 0;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

// ─── 1. 워런 버핏 (Warren Buffett) ──────────────────

function analyzeBuffett(input: MastersInput): MasterVerdict {
  const { mastersData, financialData, dividendData } = input;
  const reasons: string[] = [];
  let conditions = 0;

  // 1. ROE > 15%
  if (mastersData.roe > 15) {
    conditions++;
    reasons.push(`ROE ${mastersData.roe.toFixed(1)}% > 15% ✓`);
  } else {
    reasons.push(`ROE ${mastersData.roe.toFixed(1)}% < 15% ✗`);
  }

  // 2. 부채비율 < 50%
  if (mastersData.debtToEquity > 0 && mastersData.debtToEquity < 50) {
    conditions++;
    reasons.push(`부채비율 ${mastersData.debtToEquity.toFixed(1)}% < 50% ✓`);
  } else if (mastersData.debtToEquity === 0) {
    reasons.push(`부채비율 데이터 없음`);
  } else {
    reasons.push(`부채비율 ${mastersData.debtToEquity.toFixed(1)}% ≥ 50% ✗`);
  }

  // 3. EPS 성장률 > 10%
  const epsGrowth = avgGrowthRate(financialData.epsGrowthRates);
  if (epsGrowth > 10) {
    conditions++;
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% > 10% ✓`);
  } else {
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% ≤ 10% ✗`);
  }

  // 4. PEG < 1.5
  const peg = financialData.peRatio > 0 && epsGrowth > 0
    ? financialData.peRatio / epsGrowth
    : 999;
  if (peg < 1.5 && peg > 0) {
    conditions++;
    reasons.push(`PEG ${peg.toFixed(2)} < 1.5 ✓`);
  } else {
    reasons.push(`PEG ${peg > 100 ? 'N/A' : peg.toFixed(2)} ≥ 1.5 ✗`);
  }

  // 5. 배당 이력 > 10년
  const divYears = dividendData?.consecutiveYears ?? 0;
  if (divYears > 10) {
    conditions++;
    reasons.push(`배당 ${divYears}년 연속 > 10년 ✓`);
  } else if (divYears > 0) {
    reasons.push(`배당 ${divYears}년 연속 ≤ 10년 ✗`);
  } else {
    reasons.push(`배당 이력 없음 ✗`);
  }

  const score = clampScore(conditions * 2);

  return {
    master: '워런 버핏 (Warren Buffett)',
    strategy: '경제적 해자 + 저평가 + 장기 보유',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 2. 벤자민 그레이엄 (Benjamin Graham) ───────────

function analyzeGraham(input: MastersInput): MasterVerdict {
  const { mastersData, financialData, dividendData } = input;
  const reasons: string[] = [];
  let conditions = 0;

  // 1. PE < 15
  const pe = financialData.peRatio;
  if (pe > 0 && pe < 15) {
    conditions++;
    reasons.push(`PE ${pe.toFixed(1)} < 15 ✓`);
  } else {
    reasons.push(`PE ${pe > 0 ? pe.toFixed(1) : 'N/A'} ≥ 15 ✗`);
  }

  // 2. PBR < 1.5
  if (mastersData.pbr > 0 && mastersData.pbr < 1.5) {
    conditions++;
    reasons.push(`PBR ${mastersData.pbr.toFixed(2)} < 1.5 ✓`);
  } else {
    reasons.push(`PBR ${mastersData.pbr > 0 ? mastersData.pbr.toFixed(2) : 'N/A'} ≥ 1.5 ✗`);
  }

  // 3. PE × PBR < 22.5 (그레이엄 넘버)
  const grahamNumber = pe * mastersData.pbr;
  if (pe > 0 && mastersData.pbr > 0 && grahamNumber < 22.5) {
    conditions++;
    reasons.push(`PE×PBR ${grahamNumber.toFixed(1)} < 22.5 ✓`);
  } else {
    reasons.push(`PE×PBR ${pe > 0 && mastersData.pbr > 0 ? grahamNumber.toFixed(1) : 'N/A'} ≥ 22.5 ✗`);
  }

  // 4. 유동비율 > 2.0
  if (mastersData.currentRatio > 2.0) {
    conditions++;
    reasons.push(`유동비율 ${mastersData.currentRatio.toFixed(2)} > 2.0 ✓`);
  } else {
    reasons.push(`유동비율 ${mastersData.currentRatio > 0 ? mastersData.currentRatio.toFixed(2) : 'N/A'} ≤ 2.0 ✗`);
  }

  // 5. 배당 지급 이력 > 20년
  const divYears = dividendData?.consecutiveYears ?? 0;
  if (divYears > 20) {
    conditions++;
    reasons.push(`배당 ${divYears}년 > 20년 ✓`);
  } else {
    reasons.push(`배당 ${divYears}년 ≤ 20년 ✗`);
  }

  // 6. EPS 성장 > 0 (최근)
  const epsGrowth = avgGrowthRate(financialData.epsGrowthRates);
  if (epsGrowth > 0) {
    conditions++;
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% > 0 ✓`);
  } else {
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% ≤ 0 ✗`);
  }

  const score = clampScore(conditions * 1.67);

  return {
    master: '벤자민 그레이엄 (Benjamin Graham)',
    strategy: '안전마진: 내재가치 대비 2/3 이하 매수',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 3. 피터 린치 (Peter Lynch) ─────────────────────

function classifyLynchCategory(input: MastersInput): string {
  const { mastersData, financialData, dividendData } = input;
  const epsGrowth = avgGrowthRate(financialData.epsGrowthRates);

  // Cyclical sectors
  const cyclicalSectors = ['Energy', 'Materials', 'Industrials', 'Real Estate'];
  if (cyclicalSectors.includes(mastersData.sector)) return 'Cyclical (경기순환주)';

  // Asset play: PBR < 1
  if (mastersData.pbr > 0 && mastersData.pbr < 1.0) return 'Asset Play (자산주)';

  // Turnaround: negative EPS
  if (financialData.currentEPS < 0) return 'Turnaround (턴어라운드)';

  // Fast grower: revenue growth > 20%
  if (mastersData.revenueGrowth > 20) return 'Fast Grower (고성장주)';

  // Slow grower: low growth + dividends
  const hasDividend = dividendData && dividendData.dividendYield > 0;
  if (epsGrowth < 5 && hasDividend) return 'Slow Grower (저성장 배당주)';

  // Default: Stalwart
  return 'Stalwart (우량 성장주)';
}

function analyzeLynch(input: MastersInput): MasterVerdict {
  const { mastersData, financialData } = input;
  const reasons: string[] = [];

  // PEG 기반 점수
  const epsGrowth = avgGrowthRate(financialData.epsGrowthRates);
  const peg = financialData.peRatio > 0 && epsGrowth > 0
    ? financialData.peRatio / epsGrowth
    : 999;

  let score: number;
  if (peg <= 0 || peg > 100) {
    score = 1;
    reasons.push(`PEG 계산 불가 (PE: ${financialData.peRatio.toFixed(1)}, 성장률: ${epsGrowth.toFixed(1)}%)`);
  } else if (peg < 1.0) {
    score = 10;
    reasons.push(`PEG ${peg.toFixed(2)} < 1.0 — 성장 대비 극도 저평가 ✓✓`);
  } else if (peg < 1.5) {
    score = 7;
    reasons.push(`PEG ${peg.toFixed(2)} — 적정 가격대 ✓`);
  } else if (peg < 2.0) {
    score = 4;
    reasons.push(`PEG ${peg.toFixed(2)} — 약간 비쌈 △`);
  } else {
    score = 1;
    reasons.push(`PEG ${peg.toFixed(2)} > 2.0 — 비쌈 ✗`);
  }

  // 매출 성장률 > 20% → +2 보너스
  if (mastersData.revenueGrowth > 20) {
    score = clampScore(score + 2);
    reasons.push(`매출 성장률 ${mastersData.revenueGrowth.toFixed(1)}% > 20% 보너스 ✓`);
  } else if (mastersData.revenueGrowth > 0) {
    reasons.push(`매출 성장률 ${mastersData.revenueGrowth.toFixed(1)}%`);
  }

  // 린치 카테고리 분류
  const category = classifyLynchCategory(input);
  reasons.push(`린치 분류: ${category}`);

  score = clampScore(score);

  return {
    master: '피터 린치 (Peter Lynch)',
    strategy: 'PEG: 성장률 대비 저렴한 주식 발굴',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 4. 제시 리버모어 (Jesse Livermore) ─────────────

function analyzeLivermore(input: MastersInput): MasterVerdict {
  const { mastersData, chartData } = input;
  const reasons: string[] = [];
  let conditions = 0;

  // 1. 주가 > 200일 이동평균선 (상승 추세)
  if (chartData.close > chartData.ma200) {
    conditions++;
    reasons.push(`주가 > 200MA (${chartData.close.toFixed(0)} > ${chartData.ma200.toFixed(0)}) ✓`);
  } else {
    reasons.push(`주가 < 200MA (${chartData.close.toFixed(0)} < ${chartData.ma200.toFixed(0)}) ✗`);
  }

  // 2. 주가 > 50일 이동평균선 (단기 강세)
  if (chartData.close > chartData.ma50) {
    conditions++;
    reasons.push(`주가 > 50MA ✓`);
  } else {
    reasons.push(`주가 < 50MA ✗`);
  }

  // 3. RSI 50-70 (모멘텀 살아있음)
  if (chartData.rsi14 >= 50 && chartData.rsi14 <= 70) {
    conditions++;
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} (50-70 모멘텀 구간) ✓`);
  } else {
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} (모멘텀 구간 이탈) ✗`);
  }

  // 4. 52주 신고가 근접 (10% 이내)
  if (mastersData.week52High > 0) {
    const distFromHigh = ((mastersData.week52High - chartData.close) / mastersData.week52High) * 100;
    if (distFromHigh <= 10) {
      conditions++;
      reasons.push(`52주 신고가 ${distFromHigh.toFixed(1)}% 이내 ✓`);
    } else {
      reasons.push(`52주 신고가 ${distFromHigh.toFixed(1)}% 이격 ✗`);
    }
  }

  // 5. 거래량 증가 추세 (10일 평균 > 3개월 평균)
  if (mastersData.avgVolume10d > 0 && mastersData.avgVolume3m > 0) {
    const volRatio = mastersData.avgVolume10d / mastersData.avgVolume3m;
    if (volRatio > 1.0) {
      conditions++;
      reasons.push(`거래량 증가 (10일/${(3)}개월 = ${volRatio.toFixed(2)}) ✓`);
    } else {
      reasons.push(`거래량 감소 (10일/3개월 = ${volRatio.toFixed(2)}) ✗`);
    }
  }

  const score = clampScore(conditions * 2);

  return {
    master: '제시 리버모어 (Jesse Livermore)',
    strategy: '추세추종: 추세를 따르고 손절은 빠르게',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 5. 존 템플턴 (John Templeton) ─────────────────

function analyzeTempleton(input: MastersInput): MasterVerdict {
  const { mastersData, chartData, financialData, dividendData } = input;
  const reasons: string[] = [];
  let conditions = 0;

  // 1. PE가 역사적 저평가 수준 (PE < 12를 프록시로 사용)
  const pe = financialData.peRatio;
  if (pe > 0 && pe < 12) {
    conditions++;
    reasons.push(`PE ${pe.toFixed(1)} < 12 (역사적 저평가 수준) ✓`);
  } else if (pe > 0 && pe < 15) {
    reasons.push(`PE ${pe.toFixed(1)} — 보통 수준`);
  } else {
    reasons.push(`PE ${pe > 0 ? pe.toFixed(1) : 'N/A'} — 저평가 아님 ✗`);
  }

  // 2. RSI < 30 (과매도)
  if (chartData.rsi14 < 30) {
    conditions++;
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} < 30 (과매도) ✓`);
  } else {
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} — 과매도 아님 ✗`);
  }

  // 3. 52주 최저가 근접 (20% 이내)
  if (mastersData.week52Low > 0) {
    const distFromLow = ((chartData.close - mastersData.week52Low) / mastersData.week52Low) * 100;
    if (distFromLow <= 20) {
      conditions++;
      reasons.push(`52주 최저가 ${distFromLow.toFixed(1)}% 이내 ✓`);
    } else {
      reasons.push(`52주 최저가 ${distFromLow.toFixed(1)}% 이격 ✗`);
    }
  }

  // 4. 시장 전체가 비관적 (역발상 — 센티먼트 기반)
  // RSI < 40 + PE가 시장 PE보다 낮음을 프록시로 사용
  if (chartData.rsi14 < 40 && pe > 0 && pe < financialData.marketPE * 0.8) {
    conditions++;
    reasons.push(`시장 대비 비관적 구간 (PE ${pe.toFixed(1)} < 시장 ${financialData.marketPE.toFixed(1)}×0.8) ✓`);
  } else {
    reasons.push(`비관적 역발상 조건 미충족 ✗`);
  }

  // 5. 배당수익률이 5년 평균 대비 높음
  if (dividendData && dividendData.dividendYield > 0 && dividendData.fiveYearAvgYield > 0) {
    if (dividendData.dividendYield > dividendData.fiveYearAvgYield) {
      conditions++;
      reasons.push(`배당수익률 ${dividendData.dividendYield.toFixed(2)}% > 5년 평균 ${dividendData.fiveYearAvgYield.toFixed(2)}% ✓`);
    } else {
      reasons.push(`배당수익률 ${dividendData.dividendYield.toFixed(2)}% ≤ 5년 평균 ✗`);
    }
  } else {
    reasons.push(`배당 데이터 없음`);
  }

  const score = clampScore(conditions * 2);

  return {
    master: '존 템플턴 (John Templeton)',
    strategy: '역발상: 최대 비관의 시점에서 매수',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 6. 짐 사이먼스 (Jim Simons) ───────────────────

function analyzeSimons(input: MastersInput): MasterVerdict {
  const { mastersData, chartData } = input;
  const reasons: string[] = [];
  let signalStrength = 0;

  // 1. 이격도 극단값 (200MA 대비 ±15% 이상)
  const deviation200 = chartData.ma200 > 0
    ? ((chartData.close - chartData.ma200) / chartData.ma200) * 100
    : 0;
  if (Math.abs(deviation200) >= 15) {
    signalStrength += 2;
    reasons.push(`이격도 ${deviation200 > 0 ? '+' : ''}${deviation200.toFixed(1)}% (극단값 ±15%+) ✓`);
  } else if (Math.abs(deviation200) >= 10) {
    signalStrength += 1;
    reasons.push(`이격도 ${deviation200 > 0 ? '+' : ''}${deviation200.toFixed(1)}% (준극단값)`);
  } else {
    reasons.push(`이격도 ${deviation200 > 0 ? '+' : ''}${deviation200.toFixed(1)}% (정상 범위)`);
  }

  // 2. RSI 극단값 (30 이하 or 70 이상)
  if (chartData.rsi14 <= 30) {
    signalStrength += 2;
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} ≤ 30 (과매도 극단) ✓`);
  } else if (chartData.rsi14 >= 70) {
    signalStrength += 2;
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} ≥ 70 (과매수 극단) ✓`);
  } else if (chartData.rsi14 <= 35 || chartData.rsi14 >= 65) {
    signalStrength += 1;
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} (준극단값)`);
  } else {
    reasons.push(`RSI ${chartData.rsi14.toFixed(1)} (중립)`);
  }

  // 3. 변동성 대비 수익률 (샤프 비율 개념)
  // 최근 60일 가격으로 일일 수익률의 표준편차 계산
  if (chartData.prices.length >= 20) {
    const returns: number[] = [];
    for (let i = 1; i < chartData.prices.length; i++) {
      returns.push((chartData.prices[i] - chartData.prices[i - 1]) / chartData.prices[i - 1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedReturn = avgReturn * 252;
    const annualizedVol = stdDev * Math.sqrt(252);
    const sharpeProxy = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;

    if (Math.abs(sharpeProxy) > 2) {
      signalStrength += 2;
      reasons.push(`샤프 비율 추정 ${sharpeProxy.toFixed(2)} (강한 통계적 신호) ✓`);
    } else if (Math.abs(sharpeProxy) > 1) {
      signalStrength += 1;
      reasons.push(`샤프 비율 추정 ${sharpeProxy.toFixed(2)} (약한 신호)`);
    } else {
      reasons.push(`샤프 비율 추정 ${sharpeProxy.toFixed(2)} (신호 없음)`);
    }
  }

  // 4. 가격-거래량 다이버전스
  if (chartData.prices.length >= 20 && mastersData.avgVolume10d > 0 && mastersData.avgVolume3m > 0) {
    const priceChange = (chartData.prices[chartData.prices.length - 1] - chartData.prices[chartData.prices.length - 10]) /
      chartData.prices[chartData.prices.length - 10] * 100;
    const volRatio = mastersData.avgVolume10d / mastersData.avgVolume3m;

    // 가격 상승 + 거래량 감소 OR 가격 하락 + 거래량 증가 → 다이버전스
    if ((priceChange > 3 && volRatio < 0.8) || (priceChange < -3 && volRatio > 1.2)) {
      signalStrength += 2;
      reasons.push(`가격-거래량 다이버전스 (가격 ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%, 거래량비 ${volRatio.toFixed(2)}) ✓`);
    } else {
      reasons.push(`가격-거래량 정상 (가격 ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%, 거래량비 ${volRatio.toFixed(2)})`);
    }
  }

  // 5. 평균 회귀 신호 (50MA 이격도 극단값)
  const deviation50 = chartData.ma50 > 0
    ? ((chartData.close - chartData.ma50) / chartData.ma50) * 100
    : 0;
  if (Math.abs(deviation50) >= 10) {
    signalStrength += 2;
    reasons.push(`50MA 이격 ${deviation50 > 0 ? '+' : ''}${deviation50.toFixed(1)}% (평균 회귀 신호) ✓`);
  } else {
    reasons.push(`50MA 이격 ${deviation50 > 0 ? '+' : ''}${deviation50.toFixed(1)}% (정상)`);
  }

  const score = clampScore(signalStrength);

  return {
    master: '짐 사이먼스 (Jim Simons)',
    strategy: '퀀트: 통계적 이상 신호 포착',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 7. 잭 보글 (Jack Bogle) ───────────────────────

function analyzeBogle(input: MastersInput): MasterVerdict {
  const { mastersData, financialData } = input;
  const reasons: string[] = [];

  // 보글은 항상 인덱스를 추천!
  reasons.push(`💡 잭 보글: "이 종목 대신 VOO/SPY를 사세요"`);

  // 인덱스 대비 매력도 평가 (높을수록 개별 종목이 매력적)
  let attractiveness = 3; // 기본 중립 (인덱스가 더 나음)

  // 1. PE 비교: 시장 PE보다 낮으면 가산
  const pe = financialData.peRatio;
  if (pe > 0 && financialData.marketPE > 0) {
    const peRatio = pe / financialData.marketPE;
    if (peRatio < 0.7) {
      attractiveness += 2;
      reasons.push(`PE ${pe.toFixed(1)} — 시장(${financialData.marketPE.toFixed(1)})의 ${(peRatio * 100).toFixed(0)}%로 저평가 ✓`);
    } else if (peRatio < 1.0) {
      attractiveness += 1;
      reasons.push(`PE ${pe.toFixed(1)} — 시장 대비 약간 저렴`);
    } else {
      attractiveness -= 1;
      reasons.push(`PE ${pe.toFixed(1)} — 시장보다 비쌈 ✗`);
    }
  }

  // 2. 초과 수익 가능성: EPS 성장률이 높으면 가산
  const epsGrowth = avgGrowthRate(financialData.epsGrowthRates);
  if (epsGrowth > 20) {
    attractiveness += 2;
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% — 높은 초과수익 잠재력 ✓`);
  } else if (epsGrowth > 10) {
    attractiveness += 1;
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% — 적정 수준`);
  } else {
    reasons.push(`EPS 성장률 ${epsGrowth.toFixed(1)}% — 인덱스와 차별화 부족 ✗`);
  }

  // 3. 리스크 분석: 베타가 높으면 감산 (인덱스 대비 더 위험)
  if (mastersData.beta > 1.5) {
    attractiveness -= 2;
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 인덱스 대비 고위험 ✗`);
  } else if (mastersData.beta > 1.2) {
    attractiveness -= 1;
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 약간 높은 변동성`);
  } else if (mastersData.beta < 0.8) {
    attractiveness += 1;
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 낮은 변동성 ✓`);
  }

  // 4. ETF는 보글이 좋아함
  const indexETFs = ['VOO', 'SPY', 'QQQ', 'SCHD', 'VTI', 'VT', 'VXUS'];
  if (indexETFs.includes(input.ticker)) {
    attractiveness = 10;
    reasons.length = 0; // 리셋
    reasons.push(`🎯 잭 보글: "바로 이것입니다!" — 인덱스 ETF 적극 추천`);
  }

  // 레버리지 ETF는 보글이 싫어함
  const leveragedETFs = ['SOXL', 'TQQQ', 'UPRO', 'SPXL', 'QLD'];
  if (leveragedETFs.includes(input.ticker)) {
    attractiveness = 1;
    reasons.length = 0;
    reasons.push(`⚠️ 잭 보글: "레버리지 ETF는 투자가 아닙니다" — 장기 투자에 부적합`);
  }

  const score = clampScore(attractiveness);

  return {
    master: '잭 보글 (Jack Bogle)',
    strategy: '인덱스: 개별 종목보다 시장 전체에 투자',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 8. 레이 달리오 (Ray Dalio) ────────────────────

// 경제 사이클별 섹터 적합도
const CYCLE_SECTOR_MAP: Record<string, Record<string, number>> = {
  expansion: {
    'Technology': 9, 'Consumer Discretionary': 8, 'Financials': 8,
    'Industrials': 7, 'Materials': 6, 'Energy': 5,
    'Healthcare': 5, 'Consumer Staples': 4, 'Utilities': 3,
    'Real Estate': 6, 'Communication Services': 7, 'ETF': 7,
    'Other': 5,
  },
  lateCycle: {
    'Energy': 8, 'Materials': 7, 'Healthcare': 7,
    'Consumer Staples': 7, 'Financials': 5, 'Industrials': 6,
    'Technology': 5, 'Consumer Discretionary': 4, 'Utilities': 6,
    'Real Estate': 5, 'Communication Services': 5, 'ETF': 6,
    'Other': 5,
  },
  contraction: {
    'Consumer Staples': 9, 'Healthcare': 8, 'Utilities': 8,
    'Communication Services': 5, 'Financials': 3, 'Real Estate': 3,
    'Technology': 4, 'Consumer Discretionary': 3, 'Industrials': 3,
    'Materials': 3, 'Energy': 4, 'ETF': 6,
    'Other': 4,
  },
  recovery: {
    'Financials': 9, 'Industrials': 8, 'Consumer Discretionary': 8,
    'Technology': 7, 'Materials': 7, 'Energy': 6,
    'Real Estate': 7, 'Healthcare': 5, 'Consumer Staples': 4,
    'Utilities': 4, 'Communication Services': 6, 'ETF': 7,
    'Other': 5,
  },
};

function getEconomicCycle(sentiment?: SentimentResult): { cycle: string; label: string } {
  if (!sentiment) return { cycle: 'expansion', label: '확장기 (기본 추정)' };

  const vix = sentiment.vix.current;
  const sentimentVerdict = sentiment.verdict;

  // VIX 기반 경제 사이클 추정
  if (vix >= 30 || sentimentVerdict === 'extreme_fear') {
    return { cycle: 'contraction', label: '수축기 (극도 공포)' };
  }
  if (vix >= 22 || sentimentVerdict === 'fear') {
    return { cycle: 'lateCycle', label: '후기 사이클 (공포 증가)' };
  }
  if (vix <= 14 || sentimentVerdict === 'extreme_greed') {
    return { cycle: 'recovery', label: '회복/확장기 (낙관)' };
  }
  return { cycle: 'expansion', label: '확장기 (안정)' };
}

function getPortfolioRole(mastersData: MastersData, dividendData?: DividendRawData | null): string {
  const sector = mastersData.sector;
  const hasDividend = dividendData && dividendData.dividendYield > 2;
  const highBeta = mastersData.beta > 1.2;

  if (sector === 'Energy' || sector === 'Materials') return '인플레 헤지';
  if (hasDividend && !highBeta) return '인컴 (배당 수익)';
  if (sector === 'Consumer Staples' || sector === 'Healthcare' || sector === 'Utilities') return '방어';
  return '성장';
}

function analyzeDalio(input: MastersInput): MasterVerdict {
  const { mastersData, sentiment, dividendData } = input;
  const reasons: string[] = [];

  // 1. 현재 경제 사이클 판단
  const { cycle, label } = getEconomicCycle(sentiment);
  reasons.push(`현재 사이클: ${label}`);

  // 2. 섹터 적합도 평가
  const sectorMap = CYCLE_SECTOR_MAP[cycle] ?? CYCLE_SECTOR_MAP.expansion;
  const sectorScore = sectorMap[mastersData.sector] ?? 5;
  reasons.push(`${mastersData.sector} 섹터 적합도: ${sectorScore}/10`);

  // 3. 포트폴리오 역할
  const role = getPortfolioRole(mastersData, dividendData);
  reasons.push(`포트폴리오 역할: ${role}`);

  // 4. 상관관계 (베타) 분석
  let betaAdjustment = 0;
  if (mastersData.beta < 0.5) {
    betaAdjustment = 2; // 낮은 상관관계 = 분산 효과 ↑
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 분산 투자 효과 우수 ✓`);
  } else if (mastersData.beta < 0.8) {
    betaAdjustment = 1;
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 적정 상관관계`);
  } else if (mastersData.beta > 1.5) {
    betaAdjustment = -1;
    reasons.push(`베타 ${mastersData.beta.toFixed(2)} — 높은 시장 민감도 ✗`);
  } else {
    reasons.push(`베타 ${mastersData.beta.toFixed(2)}`);
  }

  // 사이클 적합도 기반 최종 점수
  const score = clampScore(sectorScore + betaAdjustment);

  return {
    master: '레이 달리오 (Ray Dalio)',
    strategy: '올웨더: 경제 사이클 + 자산 배분',
    verdict: getVerdict(score),
    reason: reasons.join(' | '),
    score,
  };
}

// ─── 메인: 8대 대가 통합 분석 ────────────────────────

export function analyzeMasters(input: MastersInput): MastersResult {
  const verdicts: MasterVerdict[] = [
    analyzeBuffett(input),
    analyzeGraham(input),
    analyzeLynch(input),
    analyzeLivermore(input),
    analyzeTempleton(input),
    analyzeSimons(input),
    analyzeBogle(input),
    analyzeDalio(input),
  ];

  // 컨센서스 집계
  const consensus = {
    buy: verdicts.filter(v => v.verdict === 'buy').length,
    hold: verdicts.filter(v => v.verdict === 'hold').length,
    avoid: verdicts.filter(v => v.verdict === 'avoid').length,
  };

  // bestFit: 가장 높은 점수를 준 대가
  const bestFitVerdict = verdicts.reduce((a, b) => a.score >= b.score ? a : b);

  // overallScore: 8명 평균 → 0-100 스케일
  const totalPoints = verdicts.reduce((sum, v) => sum + v.score, 0);
  const overallScore = Math.round((totalPoints / 80) * 100);

  return {
    ticker: input.ticker,
    verdicts,
    consensus,
    bestFit: bestFitVerdict.master,
    overallScore,
  };
}

// ─── 요약 텍스트 생성 ────────────────────────────────

export function generateMastersSummary(result: MastersResult): string {
  const lines: string[] = [];
  lines.push(`🎓 투자 대가 분석 (종합 ${result.overallScore}/100)`);
  lines.push(`컨센서스: 매수 ${result.consensus.buy}명 | 보류 ${result.consensus.hold}명 | 회피 ${result.consensus.avoid}명`);
  lines.push(`최적 전략: ${result.bestFit}`);

  const summaryParts: string[] = [];
  for (const v of result.verdicts) {
    const icon = v.verdict === 'buy' ? '✅' : v.verdict === 'hold' ? '⚠️' : '❌';
    const shortName = v.master.split(' (')[0]; // "워런 버핏" 부분만
    summaryParts.push(`${shortName} ${icon}${v.score}점`);
  }
  lines.push(summaryParts.join(' | '));

  return lines.join('\n');
}
