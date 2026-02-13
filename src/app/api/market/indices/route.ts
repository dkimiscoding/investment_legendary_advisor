import { NextResponse } from 'next/server';
import { fetchMarketIndices } from '@/lib/data/yahoo-finance';

export async function GET() {
  try {
    const indices = await fetchMarketIndices();
    return NextResponse.json(indices);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '지수 데이터 수집에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
