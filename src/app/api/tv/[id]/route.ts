import { NextResponse } from 'next/server';
import { getTvDetailById, isTmdbConfigured } from '@/lib/tmdb';

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
    return NextResponse.json({ error: 'Geçersiz dizi kimliği.' }, { status: 400 });
  }

  try {
    const show = await getTvDetailById(Number(id));
    if (!show) {
      return NextResponse.json({ error: 'Dizi bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(
      { movie: show, tv: show },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[API /tv/[id]] Hata:', error);
    return NextResponse.json(
      { error: 'Dizi detayları alınırken bir sorun oluştu.' },
      { status: 502 }
    );
  }
}
