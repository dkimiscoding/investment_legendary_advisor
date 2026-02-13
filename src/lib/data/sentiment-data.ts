/**
 * 센티먼트 데이터 수집
 * AAII, CBOE, FRED 등 실제 소스에서 수집 후 인메모리 캐시 적용.
 * 각 데이터 소스별 'live' | 'fallback' 표시.
 */

import { SentimentData, DataSource } from '@/types';
import { getCached, setCache, TTL } from '../cache';

// ─── 타입 정의 ────────────────────────────────────────

interface AAIIResult {
  bullish: number;
  bearish: number;
  source: DataSource;
}

interface PutCallResult {
  value: number;
  source: DataSource;
}

interface MarginDebtResult {
  yoy: number;
  source: DataSource;
}

interface HYSpreadResult {
  value: number;
  source: DataSource;
}

interface VIXResult {
  value: number;
  source: DataSource;
}

// ─── AAII Sentiment Survey ────────────────────────────

const AAII_CACHE_KEY = 'sentiment:aaii';

async function fetchAAII(): Promise<AAIIResult> {
  const cached = getCached<AAIIResult>(AAII_CACHE_KEY);
  if (cached) return cached;

  // 1차: AAII 웹사이트 스크래핑 시도 (주간 업데이트)
  try {
    const res = await fetch('https://www.aaii.com/sentimentsurvey/sent_results', {
      next: { revalidate: 86400 },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (res.ok) {
      const text = await res.text();
      const bullMatch = text.match(/Bullish[^0-9]*?(\d+\.?\d*)\s*%?/i);
      const bearMatch = text.match(/Bearish[^0-9]*?(\d+\.?\d*)\s*%?/i);
      if (bullMatch && bearMatch) {
        const result: AAIIResult = {
          bullish: parseFloat(bullMatch[1]),
          bearish: parseFloat(bearMatch[1]),
          source: 'live',
        };
        setCache(AAII_CACHE_KEY, result, TTL.SENTIMENT);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Sentiment] AAII website fetch failed:', err);
  }

  // 2차: AAII 대안 URL 시도
  try {
    const res = await fetch('https://www.aaii.com/sentimentsurvey', {
      next: { revalidate: 86400 },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (res.ok) {
      const text = await res.text();
      const bullMatch = text.match(/Bullish[^0-9]*?(\d+\.?\d*)\s*%?/i);
      const bearMatch = text.match(/Bearish[^0-9]*?(\d+\.?\d*)\s*%?/i);
      if (bullMatch && bearMatch) {
        const result: AAIIResult = {
          bullish: parseFloat(bullMatch[1]),
          bearish: parseFloat(bearMatch[1]),
          source: 'live',
        };
        setCache(AAII_CACHE_KEY, result, TTL.SENTIMENT);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Sentiment] AAII alternative fetch failed:', err);
  }

  // Fallback: 장기 평균 기반 기본값
  console.info('[Sentiment] AAII: using fallback (historical average)');
  const fallback: AAIIResult = { bullish: 37.5, bearish: 31.0, source: 'fallback' };
  setCache(AAII_CACHE_KEY, fallback, TTL.REALTIME); // fallback은 짧은 TTL로 빨리 재시도
  return fallback;
}

// ─── Put/Call Ratio ───────────────────────────────────

const PC_CACHE_KEY = 'sentiment:putcall';

async function fetchPutCallRatio(): Promise<PutCallResult> {
  const cached = getCached<PutCallResult>(PC_CACHE_KEY);
  if (cached) return cached;

  // 1차: CBOE 마켓 통계 페이지
  try {
    const res = await fetch(
      'https://www.cboe.com/us/options/market_statistics/daily/',
      {
        next: { revalidate: 3600 },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      }
    );
    if (res.ok) {
      const text = await res.text();
      // Total Put/Call Ratio 파싱 시도
      const match = text.match(
        /(?:Total\s+)?Put\/Call\s+Ratio[^0-9]*?(\d+\.?\d*)/i
      );
      if (match) {
        const result: PutCallResult = {
          value: parseFloat(match[1]),
          source: 'live',
        };
        setCache(PC_CACHE_KEY, result, TTL.SENTIMENT);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Sentiment] CBOE P/C ratio fetch failed:', err);
  }

  // 2차: CBOE 일별 P/C CSV 시도
  try {
    const res = await fetch(
      'https://www.cboe.com/market_statistics/daily/',
      {
        next: { revalidate: 3600 },
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/(?:TOTAL)\s+[\d,]+\s+[\d,]+\s+(\d+\.?\d*)/i);
      if (match) {
        const result: PutCallResult = {
          value: parseFloat(match[1]),
          source: 'live',
        };
        setCache(PC_CACHE_KEY, result, TTL.SENTIMENT);
        return result;
      }
    }
  } catch (err) {
    console.warn('[Sentiment] CBOE alternative P/C fetch failed:', err);
  }

  // 3차: VIX 기반 추정 (VIX > 30 → P/C ~1.0+, VIX < 15 → P/C ~0.6)
  // VIX를 가져와서 간접 추정
  try {
    const { fetchVIX } = await import('./yahoo-finance');
    const vix = await fetchVIX();
    // 선형 보간: VIX 10 → 0.6, VIX 30 → 1.1
    const estimated = Math.min(1.5, Math.max(0.5, 0.6 + (vix - 10) * 0.025));
    const result: PutCallResult = {
      value: Math.round(estimated * 100) / 100,
      source: 'fallback',
    };
    setCache(PC_CACHE_KEY, result, TTL.REALTIME);
    return result;
  } catch {}

  // 최종 fallback
  console.info('[Sentiment] Put/Call: using fallback (neutral estimate)');
  const fallback: PutCallResult = { value: 0.85, source: 'fallback' };
  setCache(PC_CACHE_KEY, fallback, TTL.REALTIME);
  return fallback;
}

// ─── Margin Debt (FRED) ──────────────────────────────

const MARGIN_CACHE_KEY = 'sentiment:margin';

async function fetchMarginDebt(): Promise<MarginDebtResult> {
  const cached = getCached<MarginDebtResult>(MARGIN_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.info('[Sentiment] Margin Debt: FRED_API_KEY not set, using fallback');
    const fallback: MarginDebtResult = { yoy: 0, source: 'fallback' };
    setCache(MARGIN_CACHE_KEY, fallback, TTL.SENTIMENT);
    return fallback;
  }

  try {
    // BOGZ1FL663067003Q: Margin accounts at broker-dealers (quarterly)
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=BOGZ1FL663067003Q&sort_order=desc&limit=8&api_key=${apiKey}&file_type=json`,
      { next: { revalidate: 86400 * 7 } }
    );
    if (res.ok) {
      const data = await res.json();
      const obs = data.observations;
      if (obs?.length >= 5) {
        const latest = parseFloat(obs[0].value);
        const yearAgo = parseFloat(obs[4].value); // ~4분기 전
        if (latest && yearAgo && !isNaN(latest) && !isNaN(yearAgo)) {
          const yoy = ((latest - yearAgo) / yearAgo) * 100;
          const result: MarginDebtResult = {
            yoy: Math.round(yoy * 100) / 100,
            source: 'live',
          };
          setCache(MARGIN_CACHE_KEY, result, TTL.WEEKLY);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('[Sentiment] FRED margin debt fetch failed:', err);
  }

  // Fallback: FINRA margin debt 대안 (monthly)
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=MDOTHM&sort_order=desc&limit=24&api_key=${apiKey}&file_type=json`,
      { next: { revalidate: 86400 * 7 } }
    );
    if (res.ok) {
      const data = await res.json();
      const obs = data.observations?.filter(
        (o: { value: string }) => o.value !== '.'
      );
      if (obs?.length >= 13) {
        const latest = parseFloat(obs[0].value);
        const yearAgo = parseFloat(obs[12].value); // ~12개월 전
        if (latest && yearAgo && !isNaN(latest) && !isNaN(yearAgo)) {
          const yoy = ((latest - yearAgo) / yearAgo) * 100;
          const result: MarginDebtResult = {
            yoy: Math.round(yoy * 100) / 100,
            source: 'live',
          };
          setCache(MARGIN_CACHE_KEY, result, TTL.WEEKLY);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('[Sentiment] FRED MDOTHM fetch failed:', err);
  }

  console.info('[Sentiment] Margin Debt: using fallback');
  const fallback: MarginDebtResult = { yoy: 0, source: 'fallback' };
  setCache(MARGIN_CACHE_KEY, fallback, TTL.SENTIMENT);
  return fallback;
}

// ─── High Yield Spread (FRED) ────────────────────────

const HY_CACHE_KEY = 'sentiment:hyspread';

async function fetchHYSpread(): Promise<HYSpreadResult> {
  const cached = getCached<HYSpreadResult>(HY_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.FRED_API_KEY;

  if (apiKey) {
    try {
      // ICE BofA US High Yield Option-Adjusted Spread
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&sort_order=desc&limit=1&api_key=${apiKey}&file_type=json`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        const value = parseFloat(data.observations?.[0]?.value);
        if (value && !isNaN(value)) {
          const result: HYSpreadResult = { value, source: 'live' };
          setCache(HY_CACHE_KEY, result, TTL.SENTIMENT);
          return result;
        }
      }
    } catch (err) {
      console.warn('[Sentiment] FRED HY Spread fetch failed:', err);
    }
  }

  console.info('[Sentiment] HY Spread: using fallback');
  const fallback: HYSpreadResult = { value: 3.5, source: 'fallback' };
  setCache(HY_CACHE_KEY, fallback, TTL.REALTIME);
  return fallback;
}

// ─── VIX ─────────────────────────────────────────────

const VIX_CACHE_KEY = 'sentiment:vix';

async function fetchVIXForSentiment(): Promise<VIXResult> {
  const cached = getCached<VIXResult>(VIX_CACHE_KEY);
  if (cached) return cached;

  try {
    const { fetchVIX } = await import('./yahoo-finance');
    const vix = await fetchVIX();
    const result: VIXResult = { value: vix, source: 'live' };
    setCache(VIX_CACHE_KEY, result, TTL.REALTIME);
    return result;
  } catch (err) {
    console.warn('[Sentiment] VIX fetch failed:', err);
  }

  const fallback: VIXResult = { value: 20, source: 'fallback' };
  setCache(VIX_CACHE_KEY, fallback, TTL.REALTIME);
  return fallback;
}

// ─── 통합 수집 ───────────────────────────────────────

/**
 * 센티먼트 데이터 통합 수집
 * 모든 소스를 병렬로 수집하고, 각 데이터의 출처(live/fallback)를 기록한다.
 */
export async function fetchSentimentData(): Promise<SentimentData> {
  const [vixResult, pcResult, aaiiResult, marginResult, hyResult] =
    await Promise.all([
      fetchVIXForSentiment(),
      fetchPutCallRatio(),
      fetchAAII(),
      fetchMarginDebt(),
      fetchHYSpread(),
    ]);

  const data: SentimentData = {
    vix: vixResult.value,
    putCallRatio: pcResult.value,
    aaiiBullish: aaiiResult.bullish,
    aaiiBearish: aaiiResult.bearish,
    marginDebtYoY: marginResult.yoy,
    hySpread: hyResult.value,
    sources: {
      vix: vixResult.source,
      putCallRatio: pcResult.source,
      aaii: aaiiResult.source,
      marginDebt: marginResult.source,
      hySpread: hyResult.source,
    },
  };

  // 디버그: 소스 상태 로깅
  const liveCount = Object.values(data.sources!).filter((s) => s === 'live').length;
  const totalCount = Object.values(data.sources!).length;
  console.info(
    `[Sentiment] Data collected: ${liveCount}/${totalCount} live sources`,
    data.sources
  );

  return data;
}
