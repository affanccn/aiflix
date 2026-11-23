import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTrendingMovies, getTrendingTvShows, isTmdbConfigured } from '@/lib/tmdb';

const TrendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  type: z.enum(['movie', 'tv', 'all']).default('movie'),
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
    type: searchParams.get('type') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz trend sorgu parametresi.' }, { status: 400 });
  }

  try {
    const { limit, type } = parsed.data;
    let results;
    if (type === 'tv') {
      results = await getTrendingTvShows(limit);
    } else if (type === 'all') {
      const half = Math.ceil(limit / 2);
      const [movies, tv] = await Promise.all([
        getTrendingMovies(half),
        getTrendingTvShows(limit - half),
      ]);
      results = [];
      for (let i = 0; i < Math.max(movies.length, tv.length) && results.length < limit; i++) {
        if (movies[i]) results.push(movies[i]);
        if (tv[i] && results.length < limit) results.push(tv[i]);
      }
    } else {
      results = await getTrendingMovies(limit);
    }

    return NextResponse.json(
      { results, count: results.length, type },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[API /trending] Hata:', error);
    return NextResponse.json(
      { error: 'Trend yapımlar şu an alınamıyor. Lütfen tekrar deneyin.' },
      { status: 502 }
    );
  }
}
