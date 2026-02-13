/**
 * 센티먼트 데이터 수집
 * AAII, CBOE, FRED 등 실제 소스에서 수집 후 인메모리 캐시 적용.
 * 각 데이터 소스별 'live' | 'fallback' 표시.
 */

import { SentimentData, DataSource } from '@/types';
import { getCached, setCache, TTL } from '../cache';
import { createLogger } from '../logger';

const log = createLogger('Sentiment');

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
        log.info(`AAII 데이터 수집 성공 (Bull: ${result.bullish}%, Bear: ${result.bearish}%)`);
        return result;
      }
    }
  } catch (err) {
    log.warn('AAII 웹사이트 수집 실패:', err);
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
        log.info(`AAII 대안 URL 수집 성공`);
        return result;
      }
    }
  } catch (err) {
    log.warn('AAII 대안 URL 수집 실패:', err);
  }

  // Fallback: 장기 평균 기반 기본값
  log.info('AAII: 폴백 데이터 사용 (장기 평균)');
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
      const match = text.match(
        /(?:Total\s+)?Put\/Call\s+Ratio[^0-9]*?(\d+\.?\d*)/i
      );
      if (match) {
        const result: PutCallResult = {
          value: parseFloat(match[1]),
          source: 'live',
        };
        setCache(PC_CACHE_KEY, result, TTL.SENTIMENT);
        log.info(`Put/Call Ratio 수집 성공: ${result.value}`);
        return result;
      }
    }
  } catch (err) {
    log.warn('CBOE P/C Ratio 수집 실패:', err);
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
    log.warn('CBOE 대안 P/C Ratio 수집 실패:', err);
  }

  // 3차: VIX 기반 추정
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
    log.info(`Put/Call Ratio: VIX(${vix}) 기반 추정값 사용 (${result.value})`);
    return result;
  } catch {
    // 최종 폴백
  }

  // 최종 fallback
  log.info('Put/Call Ratio: 폴백 데이터 사용 (중립 추정)');
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
    log.info('Margin Debt: FRED_API_KEY 미설정, 폴백 사용');
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
          log.info(`Margin Debt YoY 수집 성공: ${result.yoy}%`);
          return result;
        }
      }
    }
  } catch (err) {
    log.warn('FRED Margin Debt 수집 실패:', err);
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
          log.info(`Margin Debt (MDOTHM) 수집 성공: ${result.yoy}%`);
          return result;
        }
      }
    }
  } catch (err) {
    log.warn('FRED MDOTHM 수집 실패:', err);
  }

  log.info('Margin Debt: 폴백 사용');
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
          log.info(`HY Spread 수집 성공: ${value}%`);
          return result;
        }
      }
    } catch (err) {
      log.warn('FRED HY Spread 수집 실패:', err);
    }
  }

  log.info('HY Spread: 폴백 사용');
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
    log.warn('VIX 수집 실패:', err);
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

  const sources = {
    vix: vixResult.source,
    putCallRatio: pcResult.source,
    aaii: aaiiResult.source,
    marginDebt: marginResult.source,
    hySpread: hyResult.source,
  };

  const liveCount = Object.values(sources).filter((s) => s === 'live').length;
  const totalCount = Object.values(sources).length;
  log.info(`센티먼트 데이터 수집 완료: ${liveCount}/${totalCount} 라이브 소스`);

  return {
    vix: vixResult.value,
    putCallRatio: pcResult.value,
    aaiiBullish: aaiiResult.bullish,
    aaiiBearish: aaiiResult.bearish,
    marginDebtYoY: marginResult.yoy,
    hySpread: hyResult.value,
    sources,
  };
}
