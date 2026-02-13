/**
 * 인메모리 캐싱 레이어
 * 
 * API 호출 부하를 줄이고 응답 속도를 높이기 위한 간단한 TTL 기반 캐시.
 * Next.js 서버 프로세스 수명 동안 유지됨.
 * 
 * TTL 가이드:
 * - VIX / 실시간 시세: 5분 (300_000ms)
 * - 차트 데이터: 15분 (900_000ms)
 * - 재무 데이터: 1시간 (3_600_000ms)
 * - 센티먼트 (AAII, P/C, HY Spread): 1시간
 * - Margin Debt (FRED 분기): 7일 (604_800_000ms)
 */

const cache = new Map<string, { data: unknown; expiry: number }>();

/** TTL 프리셋 (밀리초) */
export const TTL = {
  REALTIME: 5 * 60 * 1000,        // 5분
  CHART: 15 * 60 * 1000,          // 15분
  FINANCIAL: 60 * 60 * 1000,      // 1시간
  SENTIMENT: 60 * 60 * 1000,      // 1시간
  WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7일
} as const;

/**
 * 캐시에서 값 조회. 만료되었으면 null 반환.
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * 캐시에 값 저장.
 * @param key   캐시 키
 * @param data  저장할 데이터
 * @param ttlMs TTL (밀리초, 기본 15분)
 */
export function setCache(key: string, data: unknown, ttlMs: number = TTL.CHART): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

/**
 * 캐시 키 삭제
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * 전체 캐시 초기화
 */
export function clearCache(): void {
  cache.clear();
}
