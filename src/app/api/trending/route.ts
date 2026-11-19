import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTrendingMovies, isTmdbConfigured } from '@/lib/tmdb';

const TrendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export async function GET(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB servisi yapılandırılmamış. Lütfen sunucu ortam değişkenlerini kontrol edin.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = TrendingQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz limit parametresi.' }, { status: 400 });
  }

  try {
    const results = await getTrendingMovies(parsed.data.limit);
    return NextResponse.json(
      { results, count: results.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[API /trending] Hata:', error);
    return NextResponse.json(
      { error: 'Trend filmler şu an alınamıyor. Lütfen tekrar deneyin.' },
      { status: 502 }
    );
  }
}
