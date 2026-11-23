import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isTmdbConfigured, searchTmdbMedia } from '@/lib/tmdb';
import { GENRE_SLUG_TO_ID, TV_GENRE_SLUG_TO_ID } from '@/lib/genres';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyRequestUser } from '@/lib/firebase/admin';
import { sanitizePrompt } from '@/lib/security';

const SearchParamsSchema = z.object({
  q: z.string().max(120).optional().default(''),
  type: z.enum(['all', 'movie', 'tv']).optional().default('all'),
  genre: z.string().max(30).optional().default('all'),
  year: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = Number(v);
      return Number.isInteger(n) && n >= 1900 && n <= 2035 ? n : null;
    }),
  page: z.coerce.number().int().min(1).max(20).default(1),
});

export async function GET(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'Film ve dizi arama servisi şu an yapılandırılmamış.' },
      { status: 503 }
    );
  }

  const verifiedUser = await verifyRequestUser(request.headers.get('authorization'));
  const identifier = verifiedUser ? `uid:${verifiedUser.uid}` : `ip:${getClientIp(request)}`;
  const rateResult = checkRateLimit({
    namespace: 'search',
    identifier,
    limit: verifiedUser ? 30 : 15,
    windowMs: 60_000,
  });

  const rateHeaders = buildRateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: `Çok fazla arama isteği gönderdiniz. Lütfen ${rateResult.retryAfterSeconds} saniye sonra tekrar deneyin.`,
      },
      { status: 429, headers: rateHeaders }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = SearchParamsSchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    genre: searchParams.get('genre') ?? undefined,
    year: searchParams.get('year') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz arama parametreleri.' },
      { status: 400, headers: rateHeaders }
    );
  }

  const cleanQuery = sanitizePrompt(parsed.data.q, 120);
  const genreId = GENRE_SLUG_TO_ID[parsed.data.genre] ?? null;
  const tvGenreId = TV_GENRE_SLUG_TO_ID[parsed.data.genre] ?? genreId;

  try {
    const data = await searchTmdbMedia({
      query: cleanQuery,
      mediaType: parsed.data.type,
      genreId,
      tvGenreId,
      year: parsed.data.year,
      page: parsed.data.page,
    });

    return NextResponse.json(data, {
      headers: {
        ...rateHeaders,
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[API /search] Hata:', error);
    return NextResponse.json(
      { error: 'Arama sonuçları alınırken bir sorun oluştu.' },
      { status: 502, headers: rateHeaders }
    );
  }
}
