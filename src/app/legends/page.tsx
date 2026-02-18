'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Legend {
  legendId: string;
  legendName: string;
  legendNickname: string;
  philosophy: string;
  topPicks: {
    ticker: string;
    name: string;
    sector: string;
    score: number;
    matchReasons: string[];
    metrics: any;
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

const LEGEND_COLORS: Record<string, string> = {
  buffett: '#D4F94E',
  graham: '#60A5FA',
  lynch: '#F472B6',
  livermore: '#F87171',
  templeton: '#A78BFA',
  simons: '#34D399',
  bogle: '#94A3B8',
  dalio: '#FB923C',
};

const LEGEND_ICONS: Record<string, string> = {
  buffett: '🦉',
  graham: '📚',
  lynch: '🔍',
  livermore: '📈',
  templeton: '🌍',
  simons: '🤖',
  bogle: '⚖️',
  dalio: '🌦️',
};

const HOLDING_PERIOD_KO: Record<string, string> = {
  short: '단기 (1년 미만)',
  medium: '중기 (1-3년)',
  long: '장기 (3-10년)',
  indefinite: '무기한',
};

const RISK_PROFILE_KO: Record<string, { label: string; color: string }> = {
  conservative: { label: '보수적', color: '#22C55E' },
  moderate: { label: '중립적', color: '#EAB308' },
  aggressive: { label: '공격적', color: '#EF4444' },
};

export default function LegendsPage() {
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLegend, setSelectedLegend] = useState<string | null>(null);

  useEffect(() => {
    fetchLegends();
  }, []);

  const fetchLegends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/screening/legends');
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다');
      const data = await res.json();
      setLegends(data.legends);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2A2A2A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎯</div>
          <p className="text-gray-400">투자 레전드들의 전략을 분석중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2A2A2A] text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchLegends}
            className="mt-4 px-4 py-2 bg-[#D4F94E] text-[#1A1A1A] font-black rounded-none border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2A2A2A] text-white">
      {/* Header */}
      <header className="border-b-2 border-[#1A1A1A] px-4 sm:px-6 py-4 bg-[#3A3A3A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← 홈
            </Link>
          </div>
          <h1 className="text-2xl font-black text-[#D4F94E] drop-shadow-[2px_2px_0px_#1A1A1A]">
            🏆 투자 레전드 전략
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            세계 최고의 투자자들의 철학과 추천 포트폴리오
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {legends.map((legend) => (
            <button
              key={legend.legendId}
              onClick={() => setSelectedLegend(
                selectedLegend === legend.legendId ? null : legend.legendId
              )}
              className={`p-4 border-2 border-[#1A1A1A] rounded-none text-left transition-all shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] ${
                selectedLegend === legend.legendId
                  ? 'bg-[#D4F94E] text-[#1A1A1A]'
                  : 'bg-[#3A3A3A] text-white hover:bg-[#2A2A2A]'
              }`}
              style={{
                borderColor: selectedLegend === legend.legendId ? '#1A1A1A' : LEGEND_COLORS[legend.legendId],
              }}
            >
              <div className="text-3xl mb-2">{LEGEND_ICONS[legend.legendId]}</div>
              <h3 className="font-black text-lg">{legend.legendName}</h3>
              <p className="text-sm opacity-75">{legend.legendNickname}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="text-xs px-2 py-1 bg-[#1A1A1A]/20 rounded-none">
                  {RISK_PROFILE_KO[legend.portfolio.riskProfile]?.label}
                </span>
                <span className="text-xs px-2 py-1 bg-[#1A1A1A]/20 rounded-none">
                  {HOLDING_PERIOD_KO[legend.portfolio.holdingPeriod]}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Legend Detail */}
        {selectedLegend && (
          <LegendDetail
            legend={legends.find(l => l.legendId === selectedLegend)!}
            color={LEGEND_COLORS[selectedLegend]}
          />
        )}

        {/* Comparison Table */}
        {!selectedLegend && (
          <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-6">
            <h2 className="text-xl font-black text-[#D4F94E] mb-4">
              📊 레전드 전략 비교
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A]">
                    <th className="text-left py-2 px-3">레전드</th>
                    <th className="text-left py-2 px-3">핵심 철학</th>
                    <th className="text-center py-2 px-3">포트폴리오</th>
                    <th className="text-center py-2 px-3">보유기간</th>
                    <th className="text-center py-2 px-3">리스크</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {legends.map((legend) => (
                    <tr key={legend.legendId} className="hover:bg-[#2A2A2A]">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{LEGEND_ICONS[legend.legendId]}</span>
                          <div>
                            <div className="font-bold">{legend.legendName}</div>
                            <div className="text-xs text-gray-400">{legend.legendNickname}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-300">
                        {legend.philosophy.slice(0, 40)}...
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs px-2 py-1 bg-[#1A1A1A] rounded-none">
                          {legend.portfolio.style}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-300">
                        {HOLDING_PERIOD_KO[legend.portfolio.holdingPeriod]}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="text-xs px-2 py-1 rounded-none"
                          style={{
                            backgroundColor: RISK_PROFILE_KO[legend.portfolio.riskProfile]?.color,
                            color: '#1A1A1A',
                          }}
                        >
                          {RISK_PROFILE_KO[legend.portfolio.riskProfile]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LegendDetail({ legend, color }: { legend: Legend; color: string }) {
  return (
    <div className="space-y-6">
      {/* Philosophy & Commentary */}
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-6">
        <h2 className="text-xl font-black mb-4" style={{ color }}>
          {LEGEND_ICONS[legend.legendId]} {legend.legendName}의 투자 철학
        </h2>
        <p className="text-lg text-white mb-4">{legend.philosophy}</p>
        <div className="bg-[#2A2A2A] border-2 border-[#1A1A1A] p-4 rounded-none">
          <h4 className="text-sm font-bold text-[#D4F94E] mb-2">💬 현재 시장 진단</h4>
          <p className="text-sm text-gray-300">{legend.currentMarketCommentary}</p>
        </div>
      </div>

      {/* Top Picks */}
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-6">
        <h2 className="text-xl font-black mb-4" style={{ color }}>
          ⭐ 추천 종목 TOP 10
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {legend.topPicks.map((pick, idx) => (
            <div
              key={pick.ticker}
              className="bg-[#2A2A2A] border-2 border-[#1A1A1A] p-4 rounded-none hover:border-[#D4F94E] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black" style={{ color }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <Link
                      href={`/?ticker=${pick.ticker}`}
                      className="font-bold text-white hover:text-[#D4F94E] text-lg"
                    >
                      {pick.ticker}
                    </Link>
                    <p className="text-xs text-gray-400">{pick.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color }}>
                    {pick.score}점
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">{pick.sector}</p>
              <div className="space-y-1">
                {pick.matchReasons.map((reason, i) => (
                  <div key={i} className="text-xs text-[#D4F94E]">
                    ✓ {reason}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Allocation */}
      <div className="bg-[#3A3A3A] border-2 border-[#1A1A1A] rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-6">
        <h2 className="text-xl font-black mb-4" style={{ color }}>
          📈 추천 포트폴리오 구성
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#2A2A2A] border-2 border-[#1A1A1A] p-4 text-center">
            <div className="text-sm text-gray-400 mb-1">스타일</div>
            <div className="font-bold">{legend.portfolio.style}</div>
          </div>
          <div className="bg-[#2A2A2A] border-2 border-[#1A1A1A] p-4 text-center">
            <div className="text-sm text-gray-400 mb-1">보유 기간</div>
            <div className="font-bold">{HOLDING_PERIOD_KO[legend.portfolio.holdingPeriod]}</div>
          </div>
          <div className="bg-[#2A2A2A] border-2 border-[#1A1A1A] p-4 text-center">
            <div className="text-sm text-gray-400 mb-1">리스크 성향</div>
            <div
              className="font-bold"
              style={{ color: RISK_PROFILE_KO[legend.portfolio.riskProfile]?.color }}
            >
              {RISK_PROFILE_KO[legend.portfolio.riskProfile]?.label}
            </div>
          </div>
        </div>

        {/* Allocation Bars */}
        <div className="space-y-4">
          {legend.portfolio.recommendedAllocation.map((alloc) => (
            <div key={alloc.category}>
              <div className="flex justify-between text-sm mb-1">
                <span>{alloc.category}</span>
                <span className="font-bold" style={{ color }}>
                  {alloc.percentage}%
                </span>
              </div>
              <div className="w-full bg-[#1A1A1A] h-4 rounded-none overflow-hidden">
                <div
                  className="h-full rounded-none"
                  style={{
                    width: `${alloc.percentage}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {alloc.tickers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {alloc.tickers.map((ticker) => (
                    <Link
                      key={ticker}
                      href={`/?ticker=${ticker}`}
                      className="text-xs px-2 py-1 bg-[#1A1A1A] hover:bg-[#D4F94E] hover:text-[#1A1A1A] rounded-none transition-colors"
                    >
                      {ticker}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
