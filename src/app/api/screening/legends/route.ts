import { NextRequest, NextResponse } from 'next/server';
import { LEGEND_STRATEGIES, calculateLegendScore } from '@/lib/data/legend-strategies';
import { getAllTickers, STOCK_NAMES, getSector } from '@/lib/data/stock-universe';
import { runDailyScreening } from '@/lib/screeners/auto-screener';

export const maxDuration = 300;

interface LegendRecommendation {
  legendId: string;
  legendName: string;
  legendNickname: string;
  philosophy: string;
  famousQuotes: string[];
  topPicks: {
    ticker: string;
    name: string;
    sector: string;
    score: number;
    matchReasons: string[];
  }[];
  portfolio: {
    style: string;
    holdingPeriod: string;
    riskProfile: string;
    recommendedAllocation: {
      category: string;
      percentage: number;
      tickers: string[];
    }[];
  };
  currentMarketCommentary: string;
}

/**
 * 레전드별 매치 이유 생성
 */
function generateMatchReasons(
  legendId: string,
  result: any
): string[] {
  const reasons: string[] = [];
  
  switch (legendId) {
    case 'buffett':
      if (result.valuation?.scores?.total > 15) reasons.push('ROE 우수 - 경쟁 우위');
      if (result.dividend?.totalScore > 15) reasons.push('안정적 배당');
      if (result.valuation?.upsideDownside > 0) reasons.push('합리적 밸류에이션');
      break;
      
    case 'graham':
      if (result.valuation?.scores?.total > 15) reasons.push('저평가 - 안전마진 확보');
      if (result.valuation?.peRatio < 15) reasons.push('PER 15 이하');
      break;
      
    case 'lynch':
      if (result.valuation?.peg < 1) reasons.push('PEG < 1 - 성장 대비 저평가');
      if (result.chart?.scores?.total > 20) reasons.push('강한 기술적 모멘텀');
      break;
      
    case 'livermore':
      if (result.chart?.scores?.total > 20) reasons.push('강한 상승 추세');
      if (result.sentiment?.totalScore > 20) reasons.push('시장 심리 개선');
      break;
      
    case 'templeton':
      if (result.valuation?.upsideDownside > 20) reasons.push('깊은 저평가 - 역발상 매수');
      break;
      
    case 'bogle':
      if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'].includes(result.ticker)) {
        reasons.push('시가총액 상위 - 시장 대표주');
      }
      if (result.valuation?.scores?.total > 10) reasons.push('적정 수준의 밸류에이션');
      break;
      
    case 'dalio':
      if (result.dividend?.totalScore > 10) reasons.push('인플레이션 대응 배당');
      if (['Consumer Staples', 'Utilities', 'Healthcare'].includes(getSector(result.ticker))) {
        reasons.push('방어적 섹터 - 경기 민감도 낮음');
      }
      break;
  }
  
  return reasons.slice(0, 3);
}

/**
 * 레전드별 포트폴리오 구성
 */
function generatePortfolioAllocation(
  strategy: any,
  topPicks: any[]
): any {
  const allocations: any[] = [];
  
  switch (strategy.id) {
    case 'buffett':
      allocations.push(
        { category: '대형 우량주', percentage: 40, tickers: topPicks.slice(0, 5).map((s: any) => s.ticker) },
        { category: '배당 성장주', percentage: 30, tickers: topPicks.slice(5, 8).map((s: any) => s.ticker) },
        { category: '현금/채권', percentage: 30, tickers: [] }
      );
      break;
      
    case 'graham':
      allocations.push(
        { category: 'NCAV 주식', percentage: 30, tickers: topPicks.slice(0, 10).map((s: any) => s.ticker) },
        { category: '고배당주', percentage: 30, tickers: [] },
        { category: '투자등급 채권', percentage: 40, tickers: [] }
      );
      break;
      
    case 'lynch':
      allocations.push(
        { category: '성장주', percentage: 50, tickers: topPicks.slice(0, 7).map((s: any) => s.ticker) },
        { category: '가치주', percentage: 30, tickers: topPicks.slice(7, 10).map((s: any) => s.ticker) },
        { category: '현금', percentage: 20, tickers: [] }
      );
      break;
      
    case 'livermore':
      allocations.push(
        { category: '모멘텀 리더', percentage: 60, tickers: topPicks.slice(0, 5).map((s: any) => s.ticker) },
        { category: '대기 현금', percentage: 40, tickers: [] }
      );
      break;
      
    case 'templeton':
      allocations.push(
        { category: '글로벌 저평가주', percentage: 50, tickers: topPicks.slice(0, 8).map((s: any) => s.ticker) },
        { category: '신흥국 주식', percentage: 20, tickers: [] },
        { category: '채권/현금', percentage: 30, tickers: [] }
      );
      break;
      
    case 'simons':
      allocations.push(
        { category: '퀀트 알고리즘', percentage: 80, tickers: topPicks.map((s: any) => s.ticker) },
        { category: '헤지 포지션', percentage: 20, tickers: [] }
      );
      break;
      
    case 'bogle':
      allocations.push(
        { category: 'S&P 500 ETF', percentage: 60, tickers: ['VOO', 'SPY'] },
        { category: '총시장 ETF', percentage: 25, tickers: ['VTI'] },
        { category: '국제 ETF', percentage: 15, tickers: ['VXUS'] }
      );
      break;
      
    case 'dalio':
      allocations.push(
        { category: '주식', percentage: 30, tickers: topPicks.slice(0, 6).map((s: any) => s.ticker) },
        { category: '채권', percentage: 40, tickers: [] },
        { category: '원자재', percentage: 15, tickers: [] },
        { category: '현금', percentage: 15, tickers: [] }
      );
      break;
  }
  
  return {
    style: strategy.portfolioStyle,
    holdingPeriod: strategy.holdingPeriod,
    riskProfile: strategy.riskProfile,
    recommendedAllocation: allocations,
  };
}

/**
 * 현재 시장 상황 코멘터리
 */
function generateMarketCommentary(legendId: string): string {
  const commentaries: Record<string, string> = {
    buffett: '현재 시장에서 우량 기업의 밸류에이션이 합리적 수준을 보이고 있습니다. 특히 기술주 대비 전통적 가치주가 매력적이며, 배당 성장주에 주목할 시기입니다.',
    graham: '시장 변동성으로 인해 일부 저평가 종목이 발굴되고 있습니다. NCAV 기준으로 자산가치 대비 할인율이 큰 종목들을 중심으로 분산투자할 기회입니다.',
    lynch: '성장주의 조정으로 PEG 비율이 개선된 종목들이 증가하고 있습니다. 특히 AI/클라우드 관련 기업들이 장기 성장 잠재력 대비 합리적인 가격을 형성하고 있습니다.',
    livermore: '시장이 주요 지지선 근처에서 방어하는 모습을 보이고 있습니다. 모멘텀이 개선되는 종목들이 있으며, 추세 확인 후 진입하는 전략이 적합합니다.',
    templeton: '글로벌 불확실성으로 인해 일부 우량주가 과도하게 할인되어 있습니다. 특히 헬스케어와 에너지 섹터에서 장기적 가치 대비 저평가된 종목들이 보입니다.',
    simons: '단기 변동성이 확대되고 있어 평균회귀 전략의 기회가 증가하고 있습니다. 거래량 급증과 변동성 돌파 패턴이 나타나는 종목들이 있습니다.',
    bogle: '시장의 장기 상승 추세는 유효하며, 단기 변동성은 장기 투자자에게 매수 기회를 제공합니다. 인덱스 펀드로 꾸준한 적립을 권장합니다.',
    dalio: '인플레이션과 금리 환경이 변동하고 있어 올웨더 포트폴리오의 중요성이 커지고 있습니다. 상관관계가 낮은 자산 클래스 간 분산이 필수적입니다.',
  };
  
  return commentaries[legendId] || '현재 시장 상황을 분석 중입니다.';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const legendId = searchParams.get('legend');
    
    // 기존 스크리닝 데이터 활용
    const screeningReport = await runDailyScreening(false);
    
    const recommendations: LegendRecommendation[] = [];
    
    for (const strategy of LEGEND_STRATEGIES) {
      // 스크리닝 결과에서 레전드별 점수 계산
      const scoredStocks = screeningReport.allResults.map((result: any) => {
        // 레전드별 점수 계산
        const score = calculateLegendScore(strategy.id, {
          valuationScore: result.valuation?.scores?.total || 50,
          qualityScore: (result.valuation?.scores?.pe || 50) + (result.valuation?.scores?.peg || 50) / 2,
          growthScore: result.chart?.scores?.total || 50,
          momentumScore: result.sentiment?.totalScore || 50,
          dividendScore: result.dividend?.totalScore || 50,
          stabilityScore: 100 - (result.sentiment?.vix?.score || 50),
        });
        
        // 매치 이유 생성
        const matchReasons = generateMatchReasons(strategy.id, result);
        
        return {
          ticker: result.ticker,
          name: STOCK_NAMES[result.ticker] || result.ticker,
          sector: getSector(result.ticker),
          score,
          matchReasons,
        };
      }).sort((a, b) => b.score - a.score);
      
      // 상위 10개 종목 선정
      const topPicks = scoredStocks.slice(0, 10);
      
      // 포트폴리오 구성
      const portfolio = generatePortfolioAllocation(strategy, topPicks);
      
      // 시장 코멘터리
      const commentary = generateMarketCommentary(strategy.id);
      
      recommendations.push({
        legendId: strategy.id,
        legendName: strategy.name,
        legendNickname: strategy.nickname,
        philosophy: strategy.philosophy,
        famousQuotes: strategy.famousQuotes,
        topPicks: topPicks as any,
        portfolio,
        currentMarketCommentary: commentary,
      });
    }
    
    // 특정 레전드만 요청한 경우
    if (legendId) {
      const filtered = recommendations.find(r => r.legendId === legendId);
      if (!filtered) {
        return NextResponse.json(
          { error: '해당 레전드를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
      return NextResponse.json(filtered);
    }
    
    return NextResponse.json({
      legends: recommendations,
      totalLegends: recommendations.length,
      updatedAt: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Legend recommendations error:', error);
    return NextResponse.json(
      { error: error.message || '추천 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
