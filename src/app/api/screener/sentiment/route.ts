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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}
