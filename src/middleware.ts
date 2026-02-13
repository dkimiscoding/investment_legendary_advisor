/**
 * Rate Limiting Middleware
 * - /api/* 경로에 IP 기반 rate limit 적용
 * - 분당 30회 (Vercel Serverless 비용 보호)
 * - Sliding window 방식 (in-memory, 인스턴스별 독립)
 */
import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 30;  // 분당 30회

interface RateEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateEntry>();

// 5분마다 만료된 항목 정리
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  for (const [key, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(key);
    }
  }
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest) {
  // API 경로만 rate limit
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  cleanup();

  const ip = getClientIP(request);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let entry = rateLimitMap.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(ip, entry);
  }

  // 윈도우 밖 타임스탬프 제거
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.timestamps[0] + WINDOW_MS - now) / 1000);
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((entry.timestamps[0] + WINDOW_MS) / 1000)),
        },
      }
    );
  }

  entry.timestamps.push(now);

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(MAX_REQUESTS - entry.timestamps.length));
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
