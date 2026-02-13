'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Type Definitions ────────────────────────────────

type Verdict = 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
type DataSource = 'live' | 'fallback';

interface ScreenerResult {
  ticker: string;
  chart: {
    scores: { total: number; ma: number; deviation: number; rsi: number; pattern: number; breadth?: number };
    signals: { maStatus: string; deviationPct: number; rsiLevel: string; pattern: string };
    verdict: string;
  };
  valuation: {
    scores: { total: number; pe: number; fairPrice: number; peg: number; marketPe: number };
    currentPrice: number;
    peRatio: number;
    marketPE: number;
    fairPrice: number;
    fairPriceRange?: { low: number; mid: number; high: number };
    upsideDownside: number;
    peg: number;
    verdict: string;
  };
  sentiment: {
    totalScore: number;
    verdict: string;
    vix: { current: number; score: number };
    putCallRatio: { current: number; score: number };
    aaii: { bullish: number; bearish: number; spread: number; score: number };
    marginDebt: { yoy: number; score: number };
    hySpread: { current: number; score: number };
  };
  dividend?: {
    status: string;
    scores: { yield: number; safety: number; growth: number; streak: number };
    data: {
      dividendYield: number;
      payoutRatio: number;
      consecutiveYears: number;
      annualDividend: number;
      growthRate: number;
    };
    totalScore: number;
  };
  dataSources?: {
    vix: DataSource;
    putCallRatio: DataSource;
    aaii: DataSource;
    marginDebt: DataSource;
    hySpread: DataSource;
  };
  totalScore: number;
  finalVerdict: Verdict;
  actionGuide: string;
}

interface MarketQuote {
  label: string;
  ticker: string;
  price: number;
  change: number;
  changePct: number;
}

interface MarketData {
  sp500: MarketQuote;
  nasdaq: MarketQuote;
  vix: MarketQuote;
  treasury10y: MarketQuote;
  timestamp: string;
}

// ─── Constants ───────────────────────────────────────

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string; emoji: string }> = {
  very_bullish: { bg: 'bg-green-600', text: 'text-white', label: '매수 관점 매우 유리', emoji: '🟢' },
  bullish: { bg: 'bg-green-400', text: 'text-white', label: '매수 관점 유리', emoji: '🟡' },
  neutral: { bg: 'bg-yellow-400', text: 'text-black', label: '중립', emoji: '⚪' },
  bearish: { bg: 'bg-orange-400', text: 'text-white', label: '매도 관점 유리', emoji: '🟠' },
  very_bearish: { bg: 'bg-red-600', text: 'text-white', label: '매도 관점 매우 유리', emoji: '🔴' },
};

const QUICK_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'KO', 'JNJ'];

// ─── Helper Components ──────────────────────────────

function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

function DataSourceBadge({ source }: { source?: DataSource }) {
  if (!source) return null;
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        source === 'live'
          ? 'bg-green-800/60 text-green-300'
          : 'bg-yellow-800/60 text-yellow-300'
      }`}
    >
      {source === 'live' ? '실시간' : '추정'}
    </span>
  );
}

function ScoreBar({
  label,
  score,
  max,
  color,
  source,
}: {
  label: string;
  score: number;
  max: number;
  color: string;
  source?: DataSource;
}) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center text-sm mb-1 gap-2">
        <span className="font-medium text-gray-300 flex items-center gap-1.5">
          {label}
          {source && <DataSourceBadge source={source} />}
        </span>
        <span className="font-bold text-white shrink-0">
          {score}/{max}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GaugeCircle({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = Math.min((score / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct > 70 ? '#22c55e' : pct > 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="-mt-[78px] text-center">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-xs text-gray-400">/ {max}</div>
      </div>
      <div className="mt-6 text-sm font-medium text-gray-300">{label}</div>
    </div>
  );
}

// ─── Market Header ──────────────────────────────────

function MarketCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
      <SkeletonPulse className="h-3 w-14 mb-2" />
      <SkeletonPulse className="h-6 w-20 mb-1" />
      <SkeletonPulse className="h-3 w-16" />
    </div>
  );
}

function MarketCard({ data }: { data: MarketQuote }) {
  const isUp = data.change >= 0;
  const isVIX = data.label === 'VIX';
  // VIX 상승 = 공포 (빨간), 다른 지표 상승 = 호재 (초록)
  const colorClass = isVIX
    ? isUp
      ? 'text-red-400'
      : 'text-green-400'
    : isUp
    ? 'text-green-400'
    : 'text-red-400';

  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 hover:bg-gray-800/80 transition-colors">
      <div className="text-xs text-gray-400 font-medium mb-1">{data.label}</div>
      <div className="text-lg sm:text-xl font-bold text-white">
        {data.label === 'US 10Y'
          ? `${data.price.toFixed(2)}%`
          : data.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs sm:text-sm font-medium ${colorClass}`}>
        {isUp ? '+' : ''}
        {data.change.toFixed(2)} ({isUp ? '+' : ''}
        {data.changePct.toFixed(2)}%)
      </div>
    </div>
  );
}

function MarketHeader({
  data,
  loading,
}: {
  data: MarketData | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <MarketCard data={data.sp500} />
      <MarketCard data={data.nasdaq} />
      <MarketCard data={data.vix} />
      <MarketCard data={data.treasury10y} />
    </div>
  );
}

// ─── Skeleton Loading ───────────────────────────────

function AnalysisSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Verdict Banner Skeleton */}
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <SkeletonPulse className="h-8 w-64" />
            <SkeletonPulse className="h-5 w-96 max-w-full" />
          </div>
          <SkeletonPulse className="h-12 w-20 ml-4" />
        </div>
      </div>

      {/* 3 Gauges Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 flex flex-col items-center">
            <SkeletonPulse className="w-[120px] h-[120px] rounded-full" />
            <SkeletonPulse className="h-4 w-24 mt-6" />
          </div>
        ))}
      </div>

      {/* Detail Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6 space-y-3">
            <SkeletonPulse className="h-6 w-40" />
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-5/6" />
            <SkeletonPulse className="h-4 w-4/5" />
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comparison Components ──────────────────────────

function ComparisonTable({ results }: { results: ScreenerResult[] }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6 overflow-x-auto">
      <h3 className="text-lg font-bold mb-4">📋 종목 비교표</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-2 text-gray-400 font-medium">항목</th>
            {results.map((r) => (
              <th key={r.ticker} className="text-center py-2 px-2 text-white font-bold">
                {r.ticker}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          <tr>
            <td className="py-2 px-2 text-gray-400">📈 차트 (25)</td>
            {results.map((r) => (
              <td key={r.ticker} className="py-2 px-2 text-center font-bold text-white">
                {r.chart.scores.total}
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">💰 주가 (20)</td>
            {results.map((r) => (
              <td key={r.ticker} className="py-2 px-2 text-center font-bold text-white">
                {r.valuation.scores.total}
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">🔄 역발상 (25)</td>
            {results.map((r) => (
              <td key={r.ticker} className="py-2 px-2 text-center font-bold text-white">
                {r.sentiment.totalScore}
              </td>
            ))}
          </tr>
          {results.some((r) => r.dividend) && (
            <tr>
              <td className="py-2 px-2 text-gray-400">💎 배당 (20)</td>
              {results.map((r) => (
                <td key={r.ticker} className="py-2 px-2 text-center font-bold text-white">
                  {r.dividend?.totalScore ?? '-'}
                </td>
              ))}
            </tr>
          )}
          <tr className="bg-gray-800/50">
            <td className="py-3 px-2 text-white font-bold">총점 (70)</td>
            {results.map((r) => {
              const v = VERDICT_STYLES[r.finalVerdict];
              return (
                <td key={r.ticker} className="py-3 px-2 text-center">
                  <span className={`font-bold text-lg ${v.bg === 'bg-yellow-400' ? 'text-yellow-400' : v.text === 'text-white' ? 'text-green-400' : 'text-white'}`}>
                    {r.totalScore}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">판정</td>
            {results.map((r) => {
              const v = VERDICT_STYLES[r.finalVerdict];
              return (
                <td key={r.ticker} className="py-2 px-2 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${v.bg} ${v.text} font-medium`}>
                    {v.emoji} {v.label}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">현재가</td>
            {results.map((r) => (
              <td key={r.ticker} className="py-2 px-2 text-center text-white">
                ${r.valuation.currentPrice?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">상승여력</td>
            {results.map((r) => (
              <td
                key={r.ticker}
                className={`py-2 px-2 text-center font-bold ${
                  r.valuation.upsideDownside > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {r.valuation.upsideDownside > 0 ? '+' : ''}
                {r.valuation.upsideDownside}%
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2 px-2 text-gray-400">PEG</td>
            {results.map((r) => (
              <td key={r.ticker} className="py-2 px-2 text-center text-white">
                {r.valuation.peg}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ComparisonChart({ results }: { results: ScreenerResult[] }) {
  const categories = [
    { key: 'chart', label: '차트', max: 25, color: '#3b82f6' },
    { key: 'valuation', label: '주가', max: 20, color: '#22c55e' },
    { key: 'sentiment', label: '역발상', max: 25, color: '#f97316' },
  ] as const;

  const barWidth = 28;
  const barGap = 6;
  const groupWidth = categories.length * barWidth + (categories.length - 1) * barGap;
  const groupGap = 50;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingTop = 20;
  const paddingBottom = 60;
  const totalWidth = paddingLeft + results.length * (groupWidth + groupGap);
  const totalHeight = chartHeight + paddingTop + paddingBottom;

  const getScore = (r: ScreenerResult, key: string) => {
    if (key === 'chart') return r.chart.scores.total;
    if (key === 'valuation') return r.valuation.scores.total;
    return r.sentiment.totalScore;
  };

  // Y축 그리드 (0, 5, 10, 15, 20, 25)
  const yTicks = [0, 5, 10, 15, 20, 25];

  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-bold mb-4">📊 점수 비교 차트</h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${Math.max(totalWidth, 300)} ${totalHeight}`}
          className="w-full min-w-[300px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y축 그리드 라인 */}
          {yTicks.map((tick) => {
            const y = paddingTop + chartHeight - (tick / 25) * chartHeight;
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft - 5}
                  y1={y}
                  x2={totalWidth - 10}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray={tick > 0 ? '4,4' : '0'}
                />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#6b7280" fontSize="10">
                  {tick}
                </text>
              </g>
            );
          })}

          {/* 바 그룹 */}
          {results.map((r, groupIdx) => {
            const groupX = paddingLeft + groupIdx * (groupWidth + groupGap) + groupGap / 2;

            return (
              <g key={r.ticker}>
                {categories.map((cat, barIdx) => {
                  const score = getScore(r, cat.key);
                  const barHeight = (score / cat.max) * chartHeight;
                  const x = groupX + barIdx * (barWidth + barGap);
                  const y = paddingTop + chartHeight - barHeight;

                  return (
                    <g key={cat.key}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={cat.color}
                        rx={4}
                        opacity={0.85}
                      >
                        <animate
                          attributeName="height"
                          from="0"
                          to={barHeight}
                          dur="0.8s"
                          fill="freeze"
                        />
                        <animate
                          attributeName="y"
                          from={paddingTop + chartHeight}
                          to={y}
                          dur="0.8s"
                          fill="freeze"
                        />
                      </rect>
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {score}
                      </text>
                    </g>
                  );
                })}

                {/* 티커 이름 */}
                <text
                  x={groupX + groupWidth / 2}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  fill="#d1d5db"
                  fontSize="13"
                  fontWeight="bold"
                >
                  {r.ticker}
                </text>

                {/* 총점 */}
                <text
                  x={groupX + groupWidth / 2}
                  y={paddingTop + chartHeight + 35}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  총 {r.totalScore}/70
                </text>
              </g>
            );
          })}

          {/* 범례 */}
          {categories.map((cat, i) => {
            const lx = paddingLeft + i * 90;
            const ly = paddingTop + chartHeight + 50;
            return (
              <g key={cat.key}>
                <rect x={lx} y={ly - 8} width={12} height={12} fill={cat.color} rx={2} />
                <text x={lx + 16} y={ly + 2} fill="#9ca3af" fontSize="10">
                  {cat.label} (/{cat.max})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Single Result Detail View ──────────────────────

function SingleResultView({ result }: { result: ScreenerResult }) {
  const v = VERDICT_STYLES[result.finalVerdict];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Verdict Banner */}
      <div className={`${v.bg} ${v.text} rounded-xl p-4 sm:p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xl sm:text-3xl font-bold">
              {v.emoji} {result.ticker} — {v.label}
            </div>
            <div className="mt-2 text-sm sm:text-lg opacity-90">{result.actionGuide}</div>
          </div>
          <div className="text-3xl sm:text-5xl font-bold shrink-0">
            {result.totalScore}
            <span className="text-lg sm:text-2xl">/70</span>
          </div>
        </div>
      </div>

      {/* 3 Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 text-center">
          <GaugeCircle score={result.chart.scores.total} max={25} label="📈 차트 판독기" />
        </div>
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 text-center">
          <GaugeCircle score={result.valuation.scores.total} max={20} label="💰 주가 판독기" />
        </div>
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 text-center">
          <GaugeCircle score={result.sentiment.totalScore} max={25} label="🔄 역발상 판독기" />
        </div>
      </div>

      {/* Details - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Chart Detail */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold mb-4">📈 차트 판독기 상세</h3>
          <ScoreBar label="이동평균선" score={result.chart.scores.ma} max={5} color="bg-blue-500" />
          <ScoreBar label="이격도" score={result.chart.scores.deviation} max={5} color="bg-cyan-500" />
          <ScoreBar label="RSI" score={result.chart.scores.rsi} max={5} color="bg-purple-500" />
          <ScoreBar label="패턴" score={result.chart.scores.pattern} max={5} color="bg-pink-500" />
          <ScoreBar
            label="시장 폭 (MA 상회 비율)"
            score={result.chart.scores.breadth || 0}
            max={5}
            color="bg-emerald-500"
          />
          <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm space-y-1">
            <p>
              MA 상태: <span className="font-bold">{result.chart.signals.maStatus}</span>
            </p>
            <p>
              이격도: <span className="font-bold">{result.chart.signals.deviationPct}%</span>
            </p>
            <p>
              RSI: <span className="font-bold">{result.chart.signals.rsiLevel}</span>
            </p>
          </div>
        </div>

        {/* Valuation Detail */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold mb-4">💰 주가 판독기 상세</h3>
          <ScoreBar label="PER (vs 시장)" score={result.valuation.scores.pe} max={5} color="bg-blue-500" />
          <ScoreBar label="적정주가 대비" score={result.valuation.scores.fairPrice} max={5} color="bg-green-500" />
          <ScoreBar label="PEG" score={result.valuation.scores.peg} max={5} color="bg-purple-500" />
          <ScoreBar label="시장 PER 수준" score={result.valuation.scores.marketPe} max={5} color="bg-cyan-500" />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between p-2.5 bg-gray-800 rounded">
              <span className="text-gray-400">적정주가 범위</span>
              <span className="font-bold text-green-400">
                ${result.valuation.fairPriceRange?.low || result.valuation.fairPrice} ~ $
                {result.valuation.fairPriceRange?.high || result.valuation.fairPrice}
              </span>
            </div>
            <div className="flex justify-between p-2.5 bg-gray-800 rounded">
              <span className="text-gray-400">현재가 / 적정가</span>
              <span className="font-bold text-white">
                ${result.valuation.currentPrice?.toLocaleString()} / ${result.valuation.fairPriceRange?.mid || result.valuation.fairPrice}
              </span>
            </div>
            <div className="flex justify-between p-2.5 bg-gray-800 rounded">
              <span className="text-gray-400">상승여력</span>
              <span
                className={`font-bold ${
                  result.valuation.upsideDownside > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {result.valuation.upsideDownside > 0 ? '+' : ''}
                {result.valuation.upsideDownside}%
              </span>
            </div>
            <div className="flex justify-between p-2.5 bg-gray-800 rounded">
              <span className="text-gray-400">PEG</span>
              <span className="font-bold text-white">{result.valuation.peg}</span>
            </div>
          </div>
        </div>

        {/* Sentiment Detail */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold mb-4">🔄 역발상 판독기 상세</h3>
          <ScoreBar
            label="VIX (공포지수)"
            score={result.sentiment.vix.score}
            max={5}
            color="bg-red-500"
            source={result.dataSources?.vix}
          />
          <ScoreBar
            label="Put/Call Ratio"
            score={result.sentiment.putCallRatio.score}
            max={5}
            color="bg-orange-500"
            source={result.dataSources?.putCallRatio}
          />
          <ScoreBar
            label="AAII 심리"
            score={result.sentiment.aaii.score}
            max={5}
            color="bg-yellow-500"
            source={result.dataSources?.aaii}
          />
          <ScoreBar
            label="신용잔고(Margin)"
            score={result.sentiment.marginDebt.score}
            max={5}
            color="bg-amber-500"
            source={result.dataSources?.marginDebt}
          />
          <ScoreBar
            label="하이일드 스프레드"
            score={result.sentiment.hySpread.score}
            max={5}
            color="bg-rose-500"
            source={result.dataSources?.hySpread}
          />
          <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm space-y-1">
            <p>
              VIX: <span className="font-bold">{result.sentiment.vix.current}</span>
            </p>
            <p>
              P/C Ratio: <span className="font-bold">{result.sentiment.putCallRatio.current}</span>
            </p>
            <p>
              AAII Spread: <span className="font-bold">{result.sentiment.aaii.spread.toFixed(1)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Dividend Card */}
      {result.dividend && (
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center flex-wrap gap-2">
            💎 배당 분석
            {result.dividend.status === 'king' && (
              <span className="text-yellow-400 text-base">👑 배당 왕족주</span>
            )}
            {result.dividend.status === 'aristocrat' && (
              <span className="text-blue-400 text-base">🏅 배당 귀족주</span>
            )}
            {result.dividend.status === 'achiever' && (
              <span className="text-purple-400 text-base">⭐ 배당 성취주</span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              <ScoreBar
                label="배당수익률 (vs 평균)"
                score={result.dividend.scores.yield}
                max={5}
                color="bg-green-500"
              />
              <ScoreBar
                label="배당 안전성"
                score={result.dividend.scores.safety}
                max={5}
                color="bg-blue-500"
              />
            </div>
            <div>
              <ScoreBar
                label="배당 성장률"
                score={result.dividend.scores.growth}
                max={5}
                color="bg-purple-500"
              />
              <ScoreBar
                label="연속 증액"
                score={result.dividend.scores.streak}
                max={5}
                color="bg-yellow-500"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-center">
              <div className="text-gray-400 mb-1">배당수익률</div>
              <div className="font-bold text-green-400 text-lg">
                {result.dividend.data.dividendYield.toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-center">
              <div className="text-gray-400 mb-1">배당성향</div>
              <div className="font-bold text-white text-lg">
                {result.dividend.data.payoutRatio.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-center">
              <div className="text-gray-400 mb-1">연속 증액</div>
              <div className="font-bold text-yellow-400 text-lg">
                {result.dividend.data.consecutiveYears > 0
                  ? `${result.dividend.data.consecutiveYears}년`
                  : '-'}
              </div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-sm text-center">
              <div className="text-gray-400 mb-1">배당 성장률</div>
              <div className="font-bold text-purple-400 text-lg">
                {result.dividend.data.growthRate > 0
                  ? `${result.dividend.data.growthRate.toFixed(1)}%`
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('compare');

  // 히스토리 로드 (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('analysis-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // localStorage 접근 불가 시 무시
    }

    // URL query param에서 ticker 자동 분석 (?ticker=AAPL)
    const params = new URLSearchParams(window.location.search);
    const urlTicker = params.get('ticker');
    if (urlTicker) {
      const t = urlTicker.toUpperCase();
      setTicker(t);
      // 약간의 딜레이 후 분석 시작 (state 세팅 후)
      setTimeout(() => analyze(t), 100);
      // URL에서 query param 제거 (깔끔한 URL 유지)
      window.history.replaceState({}, '', '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 시장 데이터 로드 (5분마다 갱신)
  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market');
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch {
      // 실패 시 무시
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  // 분석 실행
  async function analyze(inputTickers?: string) {
    const raw = inputTickers || ticker;
    const tickers = raw
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5);

    if (tickers.length === 0) return;

    setLoading(true);
    setError('');
    setResults([]);
    setActiveTab(tickers.length > 1 ? 'compare' : tickers[0]);

    try {
      const promises = tickers.map((t) =>
        fetch(`/api/screener/combined/${t}`).then((r) => {
          if (!r.ok) throw new Error(`${t} 분석 실패`);
          return r.json();
        })
      );
      const data: ScreenerResult[] = await Promise.all(promises);
      setResults(data);

      // 히스토리 업데이트
      const newHistory = [...new Set([...tickers, ...history])].slice(0, 10);
      setHistory(newHistory);
      try {
        localStorage.setItem('analysis-history', JSON.stringify(newHistory));
      } catch {
        // localStorage 접근 불가 시 무시
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '오류가 발생했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // 히스토리에서 종목 제거
  function removeFromHistory(t: string) {
    const newHistory = history.filter((h) => h !== t);
    setHistory(newHistory);
    try {
      localStorage.setItem('analysis-history', JSON.stringify(newHistory));
    } catch {
      // ignore
    }
  }

  const isMulti = results.length > 1;
  const activeResult = results.find((r) => r.ticker === activeTab);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">📊 소몽의 투자분석 판독기</h1>
            <p className="text-xs sm:text-sm text-gray-400">3종 판독기 기반 미국주식 분석 도구</p>
          </div>
          {marketData && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
              <span>마지막 업데이트:</span>
              <span>{new Date(marketData.timestamp).toLocaleTimeString('ko-KR')}</span>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-2 bg-gray-900/50">
        <div className="max-w-6xl mx-auto flex gap-4 text-sm">
          <span className="text-blue-400 font-medium border-b-2 border-blue-400 py-1">
            📊 종목 분석
          </span>
          <Link href="/discover" className="text-gray-400 hover:text-white transition-colors py-1">
            🔍 추천 종목
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Market Header */}
        <MarketHeader data={marketData} loading={marketLoading} />

        {/* Search */}
        <div className="flex gap-2 sm:gap-3 mb-3">
          <input
            type="text"
            placeholder="티커 입력 (예: AAPL 또는 AAPL, MSFT, NVDA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            className="flex-1 px-3 sm:px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base sm:text-lg"
          />
          <button
            onClick={() => analyze()}
            disabled={loading}
            className="px-5 sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-base sm:text-lg transition-colors shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="hidden sm:inline">분석중</span>
              </span>
            ) : (
              '분석'
            )}
          </button>
        </div>

        {/* Multi-ticker hint */}
        <p className="text-xs text-gray-500 mb-4">
          💡 쉼표(,)로 구분하면 최대 5개 종목을 동시 비교할 수 있습니다
        </p>

        {/* History */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-gray-500 self-center mr-1">최근:</span>
            {history.map((t) => (
              <div key={t} className="group flex items-center">
                <button
                  onClick={() => {
                    setTicker(t);
                    analyze(t);
                  }}
                  className="px-3 py-1.5 bg-gray-800 rounded-l-lg hover:bg-gray-700 text-gray-300 text-sm transition-colors"
                >
                  {t}
                </button>
                <button
                  onClick={() => removeFromHistory(t)}
                  className="px-1.5 py-1.5 bg-gray-800 rounded-r-lg hover:bg-red-900/50 text-gray-500 hover:text-red-400 text-xs transition-colors border-l border-gray-700"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Tickers (empty state only) */}
        {results.length === 0 && !loading && !error && history.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-gray-500 self-center mr-1">추천:</span>
            {QUICK_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTicker(t);
                  analyze(t);
                }}
                className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 text-sm transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-6 text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && <AnalysisSkeleton />}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {/* Multi-ticker tabs */}
            {isMulti && (
              <>
                {/* Tab bar */}
                <div className="flex gap-1 overflow-x-auto border-b border-gray-800 pb-0">
                  <button
                    onClick={() => setActiveTab('compare')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors shrink-0 ${
                      activeTab === 'compare'
                        ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    📊 비교
                  </button>
                  {results.map((r) => {
                    const v = VERDICT_STYLES[r.finalVerdict];
                    return (
                      <button
                        key={r.ticker}
                        onClick={() => setActiveTab(r.ticker)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors shrink-0 ${
                          activeTab === r.ticker
                            ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                        }`}
                      >
                        {v.emoji} {r.ticker}
                        <span className="ml-1.5 text-xs opacity-70">{r.totalScore}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Compare tab */}
                {activeTab === 'compare' && (
                  <div className="space-y-6">
                    <ComparisonTable results={results} />
                    <ComparisonChart results={results} />
                  </div>
                )}

                {/* Individual tab */}
                {activeResult && <SingleResultView result={activeResult} />}
              </>
            )}

            {/* Single result */}
            {!isMulti && results[0] && <SingleResultView result={results[0]} />}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-16 sm:py-20 text-gray-500">
            <div className="text-5xl sm:text-6xl mb-4">📊</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">종목을 검색해 보세요</h2>
            <p className="text-sm sm:text-base">미국 주식 티커를 입력하면 3종 판독기가 자동으로 분석합니다</p>
            <p className="text-xs text-gray-600 mt-2">
              여러 종목을 쉼표로 구분하면 비교 분석도 가능합니다
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer Footer */}
      <footer className="mt-12 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500 px-4">
        <p className="mb-2">
          ⚠️ 본 서비스는 투자 자문이 아닌 정보 제공 목적의 분석 도구입니다.
        </p>
        <p className="mb-2">
          투자 판단의 모든 책임은 투자자 본인에게 있으며, 본 서비스의 분석 결과를 투자 권유로
          해석해서는 안 됩니다.
        </p>
        <p>소몽의 미국주식 마스터클래스 방법론을 기반으로 한 교육/학습 목적의 도구입니다.</p>
      </footer>
    </main>
  );
}
