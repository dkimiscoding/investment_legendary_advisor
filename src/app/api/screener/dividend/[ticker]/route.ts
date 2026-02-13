import { NextRequest, NextResponse } from 'next/server';
import { fetchDividendData } from '@/lib/data/yahoo-finance';
import { calculateDividendScore } from '@/lib/screeners/dividend-screener';
import { sanitizeTicker } from '@/lib/validate-ticker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: raw } = await params;
    const ticker = sanitizeTicker(raw);
    if (!ticker) {
      return NextResponse.json({ error: '유효하지 않은 티커입니다' }, { status: 400 });
    }
    const dividendData = await fetchDividendData(ticker);
    if (!dividendData) {
      return NextResponse.json({ error: '배당 데이터가 없습니다 (무배당 종목일 수 있음)' }, { status: 404 });
    }
    const result = calculateDividendScore(dividendData);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '배당 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
