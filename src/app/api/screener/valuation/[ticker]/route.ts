import { NextRequest, NextResponse } from 'next/server';
import { fetchFinancialData } from '@/lib/data/yahoo-finance';
import { calculateValuationScore } from '@/lib/screeners/valuation-screener';
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
    const financialData = await fetchFinancialData(ticker);
    const result = calculateValuationScore(financialData);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '주가 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
