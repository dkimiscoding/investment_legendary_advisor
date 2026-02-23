'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── 타입 정의 ───────────────────────────────────────

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

interface LegendsResponse {
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

// ─── 상수 ────────────────────────────────────────────

const LEGEND_COLORS: Record<string, string> = {
  buffett: '#D4F94E', graham: '#60A5FA', lynch: '#F472B6', livermore: '#F87171',
  templeton: '#A78BFA', simons: '#34D399', bogle: '#94A3B8', dalio: '#FB923C',
};

const RISK_PROFILE_KO: Record<string, { label: string; color: string }> = {
  conservative: { label: '보수적', color: '#22C55E' },
  moderate: { label: '중립적', color: '#EAB308' },
  aggressive: { label: '공격적', color: '#EF4444' },
};

const SENTIMENT_KO: Record<string, string> = {
  extreme_fear: '극도의 공포',
  fear: '공포',
  neutral: '중립',
  greed: '탐욕',
  extreme_greed: '극도의 탐욕',
};

const VIX_LEVEL_KO: Record<string, string> = {
  low: '안정',
  moderate: '보통',
  elevated: '경계',
  high: '공포',
  extreme: '극도 공포',
};

// ─── 메인 컴포넌트 ──────────────────────────────────

export default function LegendsPage() {
  const [data, setData] = useState<LegendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('buffett');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/screening/legends');
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다');
      const json: LegendsResponse = await res.json();
      setData(json);
      if (json.legends.length > 0 && !json.legends.find(l => l.legendId === activeTab)) {
        setActiveTab(json.legends[0].legendId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2A2A2A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🏆</div>
          <p className="text-lg text-gray-400 mb-2">투자 레전드들의 전략을 분석중...</p>
          <p className="text-sm text-gray-500">8명의 전설적 투자자가 현재 시장을 분석하고 있습니다</p>
          <div className="mt-6 flex justify-center gap-2">
            {['🦉', '📚', '🔍', '📈', '🌍', '🤖', '⚖️', '🌦️'].map((icon, i) => (
              <span
                key={i}
                className="text-2xl animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2A2A2A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-[#D4F94E] text-[#1A1A1A] font-black rounded-none border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeLegend = data.legends.find(l => l.legendId === activeTab);

  return (
    <div className="min-h-screen bg-[#2A2A2A] text-white">
      {/* Header */}
      <header className="border-b-2 border-[#1A1A1A] px-4 sm:px-6 py-4 bg-[#3A3A3A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← 홈
            </Link>
            <button
              onClick={fetchData}
              className="text-xs px-3 py-1.5 bg-[#2A2A2A] text-gray-400 hover:text-[#D4F94E] border-2 border-[#1A1A1A] rounded-none shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#1A1A1A] transition-all"
            >
              🔄 새로고침
            </button>
          </div>
          <h1 className="text-2xl font-black text-[#D4F94E] drop-shadow-[2px_2px_0px_#1A1A1A]">
            🏆 투자 레전드 전략
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            8명의 전설적 투자자들이 현재 시장에서 추천하는 종목
          </p>

          {/* Market Summary Bar */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="px-2 py-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-none">
              VIX <span className="font-bold text-[#D4F94E]">{data.marketSummary.vix.value.toFixed(1)}</span>
              <span className="text-gray-500 ml-1">({VIX_LEVEL_KO[data.marketSummary.vix.level] || data.marketSummary.vix.level})</span>
            </span>
            <span className="px-2 py-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-none">
              심리 <span className="font-bold text-[#D4F94E]">{SENTIMENT_KO[data.marketSummary.sentiment] || data.marketSummary.sentiment}</span>
            </span>
            <span className="px-2 py-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-none">
              S&P500{' '}
              <span className={`font-bold ${data.marketSummary.sp500Change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.marketSummary.sp500Change >= 0 ? '+' : ''}{data.marketSummary.sp500Change.toFixed(2)}%
              </span>
            </span>
            <span className="px-2 py-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-none text-gray-500">
              {new Date(data.updatedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 기준
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Legend Tabs */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-2">
            {data.legends.map((legend) => {
              const isActive = activeTab === legend.legendId;
              const color = LEGEND_COLORS[legend.legendId] || '#D4F94E';
              return (
                <button
                  key={legend.legendId}
                  onClick={() => setActiveTab(legend.legendId)}
                  className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-none transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-[#1A1A1A] font-black shadow-[4px_4px_0px_0px_#1A1A1A] translate-x-[-2px] translate-y-[-2px]'
                      : 'bg-[#3A3A3A] text-gray-300 border-[#1A1A1A] hover:bg-[#2A2A2A] shadow-[2px_2px_0px_0px_#1A1A1A]'
                  }`}
                  style={{
                    backgroundColor: isActive ? color : undefined,
                    borderColor: isActive ? '#1A1A1A' : undefined,
                  }}
                >
                  <span className="text-xl">{legend.legendIcon}</span>
                  <span className="text-sm">{legend.legendName}</span>
                </button>
              );
            })}
            {/* Consensus Tab */}
            <button
              onClick={() => setActiveTab('consensus')}
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-none transition-all whitespace-nowrap ${
                activeTab === 'consensus'
                  ? 'bg-[#D4F94E] text-[#1A1A1A] font-black border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] translate-x-[-2px] translate-y-[-2px]'
                  : 'bg-[#3A3A3A] text-gray-300 border-[#1A1A1A] hover:bg-[#2A2A2A] shadow-[2px_2px_0px_0px_#1A1A1A]'
              }`}
            >
              <span className="text-xl">📊</span>
              <span className="text-sm">컨센서스</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'consensus' ? (
          <ConsensusSection consensus={data.consensus} />
        ) : activeLegend ? (
          <LegendDetail legend={activeLegend} />
        ) : null}
      </main>
    </div>
  );
}

// ─── Legend Detail 컴포넌트 ──────────────────────────

function LegendDetail({ legend }: { legend: LegendRecommendation }) {
  const color = LEGEND_COLORS[legend.legendId] || '#D4F94E';
  const risk = RISK_PROFILE_KO[legend.riskProfile];

  return (
    <div className="space-y-6">
      {/* Card 1: Legend Identity */}
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_#1A1A1A] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="text-6xl">{legend.legendIcon}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-black" style={{ color }}>
              {legend.legendName}
            </h2>
            <p className="text-sm text-gray-400">{legend.legendNameEn}</p>
            <p className="text-sm mt-0.5" style={{ color: `${color}99` }}>
              {legend.legendNickname}
            </p>

            {/* Famous Quote */}
            <div className="mt-4 pl-4 border-l-4" style={{ borderColor: color }}>
              <p className="text-sm text-gray-300 italic">
                &ldquo;{legend.famousQuote}&rdquo;
              </p>
            </div>

            {/* Philosophy */}
            <p className="mt-4 text-sm text-gray-300 leading-relaxed">
              {legend.philosophy}
            </p>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="text-xs px-2.5 py-1 border-2 border-[#1A1A1A] rounded-none font-bold"
                style={{ backgroundColor: `${color}20`, color }}
              >
                📋 {legend.portfolioStyle}
              </span>
              <span className="text-xs px-2.5 py-1 bg-[#2A2A2A] border-2 border-[#1A1A1A] rounded-none text-gray-300">
                ⏱️ {legend.holdingPeriod}
              </span>
              {risk && (
                <span
                  className="text-xs px-2.5 py-1 border-2 border-[#1A1A1A] rounded-none font-bold"
                  style={{ backgroundColor: `${risk.color}20`, color: risk.color }}
                >
                  ⚡ {risk.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Market View */}
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_#1A1A1A] p-6">
        <h3 className="text-lg font-black mb-3" style={{ color }}>
          💬 현재 시장 진단
        </h3>
        <p className="text-sm text-gray-200 leading-relaxed mb-4">
          {legend.marketView}
        </p>
        <div className="bg-[#2A2A2A] border-2 border-[#1A1A1A] rounded-none p-4">
          <h4 className="text-xs font-bold text-[#D4F94E] mb-2">📌 투자 조언</h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            {legend.investmentAdvice}
          </p>
        </div>
      </div>

      {/* Card 3: TOP 5 Picks */}
      <div>
        <h3 className="text-lg font-black mb-4" style={{ color }}>
          ⭐ {legend.legendName}의 TOP 5 추천 종목
        </h3>
        <div className="space-y-4">
          {legend.topPicks.map((pick) => (
            <PickCard key={pick.ticker} pick={pick} color={color} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pick Card 컴포넌트 ─────────────────────────────

function PickCard({ pick, color }: { pick: LegendPick; color: string }) {
  return (
    <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_#1A1A1A] p-5">
      {/* Top Row: Rank + Ticker + Price */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div
            className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-none font-black text-lg text-[#1A1A1A]"
            style={{ backgroundColor: color }}
          >
            {pick.rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/?ticker=${pick.ticker}`}
                className="font-black text-lg text-white hover:underline transition-colors"
                style={{ textDecorationColor: color }}
              >
                {pick.ticker}
              </Link>
              <span className="text-xs px-1.5 py-0.5 bg-[#2A2A2A] border border-[#1A1A1A] rounded-none text-gray-400">
                {pick.sector}
              </span>
            </div>
            <p className="text-sm text-gray-400">{pick.name}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-white">
            ${pick.currentPrice.toFixed(2)}
          </div>
          <div className={`text-sm font-bold ${pick.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pick.changePercent >= 0 ? '+' : ''}{pick.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">적합도</span>
          <span className="font-bold" style={{ color }}>{pick.score}점</span>
        </div>
        <div className="w-full h-2.5 bg-[#1A1A1A] rounded-none overflow-hidden">
          <div
            className="h-full rounded-none transition-all duration-500"
            style={{ width: `${pick.score}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Legend Opinion */}
      {pick.legendOpinion && (
        <div className="mb-4 bg-[#2A2A2A] border-2 border-[#1A1A1A] rounded-none p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0 mt-0.5">💬</span>
            <p className="text-sm text-gray-300 italic leading-relaxed">
              &ldquo;{pick.legendOpinion}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {pick.keyMetrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pick.keyMetrics.map((metric, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 border-2 border-[#1A1A1A] rounded-none font-bold"
              style={{
                backgroundColor: metric.isPositive ? '#22C55E15' : '#EF444415',
                color: metric.isPositive ? '#22C55E' : '#EF4444',
              }}
            >
              {metric.label}: {metric.value}
            </span>
          ))}
        </div>
      )}

      {/* Reasons */}
      {pick.reasons.length > 0 && (
        <div className="space-y-1">
          {pick.reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span style={{ color }}>✓</span>
              <span className="text-gray-300">{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consensus 컴포넌트 ─────────────────────────────

function ConsensusSection({ consensus }: { consensus: ConsensusStock[] }) {
  if (consensus.length === 0) {
    return (
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_#1A1A1A] p-8 text-center">
        <div className="text-5xl mb-4">🤝</div>
        <p className="text-gray-400">현재 2명 이상의 레전드가 공통으로 추천하는 종목이 없습니다.</p>
        <p className="text-xs text-gray-500 mt-2">각 레전드의 전략이 매우 차별화되어 있다는 의미입니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_#1A1A1A] p-6">
        <h3 className="text-lg font-black text-[#D4F94E] mb-2">
          📊 레전드 컨센서스
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          2명 이상의 투자 레전드가 공통으로 추천하는 종목입니다. 서로 다른 투자 철학에서도 공통으로 포착된 기회를 의미합니다.
        </p>

        <div className="space-y-4">
          {consensus.map((stock) => (
            <div
              key={stock.ticker}
              className="bg-[#2A2A2A] border-2 border-[#1A1A1A] rounded-none p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/?ticker=${stock.ticker}`}
                      className="font-black text-lg text-white hover:text-[#D4F94E] transition-colors"
                    >
                      {stock.ticker}
                    </Link>
                    <span className="text-xs px-1.5 py-0.5 bg-[#3A3A3A] border border-[#1A1A1A] rounded-none text-gray-400">
                      {stock.sector}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{stock.name}</p>
                </div>
                <div
                  className="shrink-0 px-3 py-1.5 bg-[#D4F94E] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-none font-black text-sm shadow-[2px_2px_0px_0px_#1A1A1A]"
                >
                  {stock.count}명의 레전드 추천
                </div>
              </div>

              {/* Which legends recommended */}
              <div className="flex flex-wrap gap-3">
                {stock.recommendedBy.map((rec) => {
                  const legendColor = LEGEND_COLORS[rec.legendId] || '#D4F94E';
                  return (
                    <div
                      key={rec.legendId}
                      className="flex items-center gap-2 px-3 py-2 bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none"
                    >
                      <span className="text-lg">{rec.legendIcon}</span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: legendColor }}>
                          {rec.legendName}
                        </p>
                        <p className="text-xs text-gray-400">
                          적합도 {rec.score}점
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
