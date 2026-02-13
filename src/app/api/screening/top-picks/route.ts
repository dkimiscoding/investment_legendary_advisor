/**
 * 카테고리별 추천 종목 API
 * GET /api/screening/top-picks?category=fearBuys&count=5
 *
 * category: fearBuys | undervalued | dividendAttractive | momentumLeaders
 * count: 반환할 종목 수 (기본 5, 최대 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopPicks } from '@/lib/screeners/auto-screener';

const VALID_CATEGORIES = ['fearBuys', 'undervalued', 'dividendAttractive', 'momentumLeaders'] as const;
type Category = typeof VALID_CATEGORIES[number];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as Category | null;
    const countParam = parseInt(searchParams.get('count') || '5', 10);
    const count = Math.min(Math.max(countParam, 1), 20);

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: `유효하지 않은 카테고리입니다. 가능한 값: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const picks = await getTopPicks(category || undefined, count);

    return NextResponse.json({
      category: category || 'all',
      count: picks.length,
      picks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '추천 종목 조회에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
