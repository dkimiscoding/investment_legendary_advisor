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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
