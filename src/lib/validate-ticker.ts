/**
 * 티커 심볼 검증 유틸리티
 * 허용: 영문 대소문자, 숫자, 점(.), 하이픈(-), 캐럿(^) — 최대 10자
 * 예: AAPL, BRK.B, ^GSPC, RDDT
 */

const TICKER_REGEX = /^[A-Za-z0-9.\-^]{1,10}$/;

export function isValidTicker(ticker: string): boolean {
  return TICKER_REGEX.test(ticker);
}

export function sanitizeTicker(ticker: string): string | null {
  const trimmed = ticker.trim().toUpperCase();
  return isValidTicker(trimmed) ? trimmed : null;
}
