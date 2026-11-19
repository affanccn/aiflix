import { NextResponse } from 'next/server';
import { getMovieDetailById, isTmdbConfigured } from '@/lib/tmdb';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB servisi yapılandırılmamış.' },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!/^\d{1,10}$/.test(id)) {
    return NextResponse.json({ error: 'Geçersiz film kimliği.' }, { status: 400 });
  }

  const movieId = Number(id);
  try {
    const movie = await getMovieDetailById(movieId);
    if (!movie) {
      return NextResponse.json({ error: 'Film bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(
      { movie },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error(`[API /movie/${id}] Hata:`, error);
    return NextResponse.json(
      { error: 'Film detayları alınırken bir sorun oluştu.' },
      { status: 502 }
    );
  }
}
