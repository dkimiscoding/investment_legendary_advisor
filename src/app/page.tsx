'use client';

import { useState } from 'react';

type Verdict = 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';

interface ScreenerResult {
  ticker: string;
  chart: {
    scores: { total: number; ma: number; deviation: number; rsi: number; pattern: number; breadth?: number };
    signals: any;
    verdict: string;
  };
  valuation: {
    scores: { total: number };
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
  totalScore: number;
  finalVerdict: Verdict;
  actionGuide: string;
}

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string; emoji: string }> = {
  very_bullish: { bg: 'bg-green-600', text: 'text-white', label: '매수 관점 매우 유리', emoji: '🟢' },
  bullish: { bg: 'bg-green-400', text: 'text-white', label: '매수 관점 유리', emoji: '🟡' },
  neutral: { bg: 'bg-yellow-400', text: 'text-black', label: '중립', emoji: '⚪' },
  bearish: { bg: 'bg-orange-400', text: 'text-white', label: '매도 관점 유리', emoji: '🟠' },
  very_bearish: { bg: 'bg-red-600', text: 'text-white', label: '매도 관점 매우 유리', emoji: '🔴' },
};

function ScoreBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = (score / max) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-300">{label}</span>
        <span className="font-bold text-white">{score}/{max}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div className={`${color} h-3 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GaugeCircle({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = (score / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct > 70 ? '#22c55e' : pct > 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#374151" strokeWidth="10" />
        <circle cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="-mt-[78px] text-center">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-xs text-gray-400">/ {max}</div>
      </div>
      <div className="mt-6 text-sm font-medium text-gray-300">{label}</div>
    </div>
  );
}

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/screener/combined/${ticker.toUpperCase()}`);
      if (!res.ok) throw new Error('분석 실패');
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  const v = result ? VERDICT_STYLES[result.finalVerdict] : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 소몽의 투자분석 판독기</h1>
            <p className="text-sm text-gray-400">3종 판독기 기반 미국주식 분석 도구</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="티커 입력 (예: AAPL, MSFT, NVDA)"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg"
          />
          <button
            onClick={analyze}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition-colors"
          >
            {loading ? '분석중...' : '분석'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-6 text-red-300">
            ❌ {error}
          </div>
        )}

        {result && v && (
          <>
            {/* Verdict Banner */}
            <div className={`${v.bg} ${v.text} rounded-xl p-6 mb-8`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{v.emoji} {result.ticker} — {v.label}</div>
                  <div className="mt-2 text-lg opacity-90">{result.actionGuide}</div>
                </div>
                <div className="text-5xl font-bold">{result.totalScore}<span className="text-2xl">/60</span></div>
              </div>
            </div>

            {/* 3 Gauges */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <GaugeCircle score={result.chart.scores.total} max={20} label="📈 차트 판독기" />
              </div>
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <GaugeCircle score={result.valuation.scores.total} max={20} label="💰 주가 판독기" />
              </div>
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <GaugeCircle score={result.sentiment.totalScore} max={20} label="🔄 역발상 판독기" />
              </div>
            </div>

            {/* Details - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chart Detail */}
              <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">📈 차트 판독기 상세</h3>
                <ScoreBar label="이동평균선" score={result.chart.scores.ma} max={5} color="bg-blue-500" />
                <ScoreBar label="이격도" score={result.chart.scores.deviation} max={5} color="bg-cyan-500" />
                <ScoreBar label="RSI" score={result.chart.scores.rsi} max={5} color="bg-purple-500" />
                <ScoreBar label="패턴" score={result.chart.scores.pattern} max={5} color="bg-pink-500" />
                <ScoreBar label="시장 폭 (MA 상회 비율)" score={result.chart.scores.breadth || 0} max={5} color="bg-emerald-500" />
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
                  <p>MA 상태: <span className="font-bold">{result.chart.signals.maStatus}</span></p>
                  <p>이격도: <span className="font-bold">{result.chart.signals.deviationPct}%</span></p>
                  <p>RSI: <span className="font-bold">{result.chart.signals.rsiLevel}</span></p>
                </div>
              </div>

              {/* Valuation Detail */}
              <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">💰 주가 판독기 상세</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-gray-800 rounded">
                    <span className="text-gray-400">적정주가 범위</span>
                    <span className="font-bold text-green-400">
                      ${result.valuation.fairPriceRange?.low || result.valuation.fairPrice} ~ ${result.valuation.fairPriceRange?.high || result.valuation.fairPrice}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-800 rounded">
                    <span className="text-gray-400">적정주가 (중간)</span>
                    <span className="font-bold text-green-400">
                      ${result.valuation.fairPriceRange?.mid || result.valuation.fairPrice}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-800 rounded">
                    <span className="text-gray-400">상승여력</span>
                    <span className={`font-bold ${result.valuation.upsideDownside > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.valuation.upsideDownside > 0 ? '+' : ''}{result.valuation.upsideDownside}%
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-800 rounded">
                    <span className="text-gray-400">PEG</span>
                    <span className="font-bold">{result.valuation.peg}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-800 rounded">
                    <span className="text-gray-400">판정</span>
                    <span className="font-bold">{result.valuation.verdict}</span>
                  </div>
                </div>
              </div>

              {/* Sentiment Detail */}
              <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">🔄 역발상 판독기 상세</h3>
                <ScoreBar label="VIX (공포지수)" score={result.sentiment.vix.score} max={5} color="bg-red-500" />
                <ScoreBar label="Put/Call Ratio" score={result.sentiment.putCallRatio.score} max={5} color="bg-orange-500" />
                <ScoreBar label="AAII 심리" score={result.sentiment.aaii.score} max={5} color="bg-yellow-500" />
                <ScoreBar label="신용잔고(Margin)" score={result.sentiment.marginDebt.score} max={5} color="bg-amber-500" />
                <ScoreBar label="하이일드 스프레드" score={result.sentiment.hySpread.score} max={5} color="bg-rose-500" />
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm space-y-1">
                  <p>VIX: <span className="font-bold">{result.sentiment.vix.current}</span></p>
                  <p>P/C Ratio: <span className="font-bold">{result.sentiment.putCallRatio.current}</span></p>
                  <p>AAII Spread: <span className="font-bold">{result.sentiment.aaii.spread}</span></p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2">종목을 검색해 보세요</h2>
            <p>미국 주식 티커를 입력하면 3종 판독기가 자동으로 분석합니다</p>
            <div className="flex gap-2 justify-center mt-6">
              {['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN'].map(t => (
                <button key={t} onClick={() => { setTicker(t); }}
                  className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 text-sm">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer Footer */}
      <footer className="mt-12 border-t border-gray-800 pt-6 pb-8 text-center text-xs text-gray-500">
        <p className="mb-2">⚠️ 본 서비스는 투자 자문이 아닌 정보 제공 목적의 분석 도구입니다.</p>
        <p className="mb-2">투자 판단의 모든 책임은 투자자 본인에게 있으며, 본 서비스의 분석 결과를 투자 권유로 해석해서는 안 됩니다.</p>
        <p>소몽의 미국주식 마스터클래스 방법론을 기반으로 한 교육/학습 목적의 도구입니다.</p>
      </footer>
    </main>
  );
}
