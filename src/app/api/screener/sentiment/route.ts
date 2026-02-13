import { NextResponse } from 'next/server';
import { fetchSentimentData } from '@/lib/data/sentiment-data';
import { calculateSentimentScore } from '@/lib/screeners/sentiment-screener';

export async function GET() {
  try {
    const data = await fetchSentimentData();
    const result = calculateSentimentScore(data);
    return NextResponse.json({
      ...result,
      dataSources: data.sources,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '센티먼트 데이터 수집에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
