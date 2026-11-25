import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCineBotRecommendations } from '@/lib/gemini';
import { isTmdbConfigured } from '@/lib/tmdb';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyRequestUser } from '@/lib/firebase/admin';
import { GENRE_SLUG_TO_ID } from '@/lib/genres';
import { sanitizePrompt } from '@/lib/security';

const CineBotRequestSchema = z.object({
  query: z.string().trim().min(2, 'En az 2 karakter girin.').max(240, 'En fazla 240 karakter girebilirsiniz.'),
  mode: z.enum(['movie', 'vibe']).default('movie'),
  mediaType: z.enum(['all', 'movie', 'tv']).default('all'),
  genre: z
    .string()
    .default('all')
    .refine((g) => g in GENRE_SLUG_TO_ID, 'Geçersiz film/dizi türü.'),
  count: z.coerce.number().int().min(1).max(6).default(6),
});

export async function POST(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB servisi yapılandırılmamış. Sunucu ayarlarını kontrol edin.' },
      { status: 503 }
    );
  }

  // Firebase Admin ID token doğrulaması (giriş yapan kullanıcı daha yüksek kota alır)
  const verifiedUser = await verifyRequestUser(request.headers.get('authorization'));
  const identifier = verifiedUser ? `uid:${verifiedUser.uid}` : `ip:${getClientIp(request)}`;

  const rateResult = checkRateLimit({
    namespace: 'cinebot',
    identifier,
    limit: verifiedUser ? 12 : 6,
    windowMs: 60_000,
  });

  const rateHeaders = buildRateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: `CineBot istek sınırına ulaştınız. Lütfen ${rateResult.retryAfterSeconds} saniye sonra tekrar deneyin.${verifiedUser ? '' : ' (Giriş yaparak daha yüksek kota elde edebilirsiniz.)'}`,
      },
      { status: 429, headers: rateHeaders }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Geçersiz JSON istek gövdesi.' },
      { status: 400, headers: rateHeaders }
    );
  }

  // Geriye dönük uyumluluk: movieName / numberOfSuggestions / ai mode alanlarını da kabul et
  const normalizedInput = {
    query: sanitizePrompt(
      String(body.query ?? body.movieName ?? body.movie ?? ''),
      240
    ),
    mode: body.mode === 'ai' || body.mode === 'vibe' ? 'vibe' : 'movie',
    mediaType:
      body.mediaType === 'movie' || body.mediaType === 'tv' || body.mediaType === 'all'
        ? body.mediaType
        : 'all',
    genre: typeof body.genre === 'string' ? body.genre : 'all',
    count: body.count ?? body.numberOfSuggestions ?? body.limit ?? 6,
  };

  const parsed = CineBotRequestSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || 'Geçersiz öneri parametreleri.',
      },
      { status: 400, headers: rateHeaders }
    );
  }

  try {
    const result = await generateCineBotRecommendations(parsed.data);
    if (result.suggestions.length === 0) {
      return NextResponse.json(
        { error: 'Bu kriterlere uygun doğrulanmış film veya dizi önerisi bulunamadı. Farklı bir ifade deneyin.' },
        { status: 404, headers: rateHeaders }
      );
    }

    return NextResponse.json(result, {
      headers: {
        ...rateHeaders,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[API /cinebot] Öneri hatası:', error);
    return NextResponse.json(
      { error: 'Öneriler hazırlanırken bir sunucu hatası oluştu. Lütfen tekrar deneyin.' },
      { status: 500, headers: rateHeaders }
    );
  }
}
