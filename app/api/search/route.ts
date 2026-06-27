import { NextResponse } from 'next/server';
import { globalSearch } from '@/queries/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ menu: [], orders: [], expenses: [] });
  }

  try {
    const data = await globalSearch(query);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }
}
