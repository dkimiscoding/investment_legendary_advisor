import { NextRequest, NextResponse } from 'next/server';
import { fetchFinancialData } from '@/lib/data/yahoo-finance';
import { calculateValuationScore } from '@/lib/screeners/valuation-screener';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const financialData = await fetchFinancialData(ticker.toUpperCase());
    const result = calculateValuationScore(financialData);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '주가 분석에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
