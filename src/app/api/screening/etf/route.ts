import { NextRequest, NextResponse } from 'next/server';
import { runETFScreening, getETFScreeningProgress, ETFScreeningReport } from '@/lib/screeners/etf-auto-screener';
import { getCached, setCache } from '@/lib/cache';

/**
 * ETF 스크리닝 API
 * 
 * 문제 해결:
 * - 배치 처리 최적화 (5개씩, 0.5초 딜레이)
 * - 개별 분석 8초 타임아웃
 * - 캐싱 우선 제공 (stale-while-revalidate 패턴)
 */

const STALE_CACHE_KEY = 'screening:etf:stale';
const STALE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const force = searchParams.get('force') === 'true';

  // 진행 상황 조회
  if (action === 'progress') {
    return NextResponse.json(getETFScreeningProgress());
  }

  // 1. 캐시된 데이터 먼저 확인 (stale 포함)
  if (!force) {
    const freshCache = getCached<ETFScreeningReport>('screening:etf');
    if (freshCache) {
      return NextResponse.json(freshCache, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-ETF-Source': 'cache',
        },
      });
    }

    // stale 캐시라도 제공 (백그라운드 갱신 시작)
    const staleCache = getCached<ETFScreeningReport>(STALE_CACHE_KEY);
    if (staleCache) {
      // 백그라운드에서 새로운 데이터 수집 시작 (await 안 함)
      runETFScreening().then(report => {
        setCache('screening:etf', report, 4 * 60 * 60 * 1000);
        setCache(STALE_CACHE_KEY, report, STALE_CACHE_TTL);
      }).catch(err => console.error('Background ETF refresh failed:', err));

      return NextResponse.json(staleCache, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-ETF-Source': 'stale-cache',
          'X-Refresh-Started': 'true',
        },
      });
    }
  }

  // 2. 새로운 스크리닝 실행
  try {
    const startTime = Date.now();
    const report = await runETFScreening();
    const duration = Date.now() - startTime;

    // stale 캐시도 업데이트
    setCache(STALE_CACHE_KEY, report, STALE_CACHE_TTL);

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        'X-ETF-Source': 'fresh',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ETF 스크리닝에 실패했습니다';
    
    // 에러 시 stale 캐시라도 반환
    const staleCache = getCached<ETFScreeningReport>(STALE_CACHE_KEY);
    if (staleCache) {
      return NextResponse.json(staleCache, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-ETF-Source': 'stale-cache-error',
          'X-Error': message,
        },
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
