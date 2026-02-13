/**
 * 시장 현황 API
 * S&P500, NASDAQ, VIX, US 10Y 국채금리를 한번에 반환
 */

import { NextResponse } from 'next/server';
import { fetchMarketOverview } from '@/lib/data/yahoo-finance';
import { getCached, setCache, TTL } from '@/lib/cache';
import { MarketOverview } from '@/types';

const CACHE_KEY = 'market:overview:api';

export async function GET() {
  try {
    // 캐시 체크 (5분)
    const cached = getCached<MarketOverview>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const data = await fetchMarketOverview();
    setCache(CACHE_KEY, data, TTL.REALTIME);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '시장 데이터 수집에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
