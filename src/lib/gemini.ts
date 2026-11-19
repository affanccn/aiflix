import { z } from 'zod';
import type { CineBotRecommendation, CineBotResponse, MovieSummary } from '@/types';
import { findAndEnrichTmdbMovie, getSmartTmdbRecommendations } from '@/lib/tmdb';
import { GENRE_ID_TO_NAME, GENRE_SLUG_TO_ID } from '@/lib/genres';
import { sanitizePrompt } from '@/lib/security';

export const GeminiRecommendationItemSchema = z.object({
  title: z.string().min(1).max(160),
  originalTitle: z.string().min(1).max(160),
  year: z.number().int().min(1900).max(2035),
  aiReason: z.string().min(10).max(400),
});

export const GeminiResponseSchema = z.object({
  recommendations: z.array(GeminiRecommendationItemSchema).min(1).max(12),
});

const GEMINI_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'Filmin Türkçe adı' },
          originalTitle: { type: 'STRING', description: 'Filmin orijinal İngilizce/resmi adı' },
          year: { type: 'INTEGER', description: 'Vizyon yılı (örn. 2014)' },
          aiReason: {
            type: 'STRING',
            description: 'Kullanıcının isteğine göre bu filmin neden önerildiğini açıklayan 1-2 cümlelik doğal Türkçe açıklama',
          },
        },
        required: ['title', 'originalTitle', 'year', 'aiReason'],
      },
    },
  },
  required: ['recommendations'],
};

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

async function queryGeminiStructured(params: {
  query: string;
  mode: 'movie' | 'vibe';
  count: number;
  genreLabel: string | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  // TMDB eşleşmeyen filmler eleneceği için +2 fazla aday iste
  const requestCount = Math.min(params.count + 2, 10);

  const modeInstruction =
    params.mode === 'movie'
      ? `Kullanıcı "${params.query}" filmine benzer filmler arıyor. Bu filmin kendisini önerme; tema, yönetmenlik, atmosfer ve hikâye derinliği açısından en yakın ${requestCount} GERÇEK sinema filmini öner.`
      : `Kullanıcı şu ruh hali/temada film arıyor: "${params.query}". Bu hissi ve atmosferi en iyi veren ${requestCount} GERÇEK sinema filmini öner.`;

  const genreInstruction = params.genreLabel
    ? `Öncelikli tür kısıtı: ${params.genreLabel}.`
    : 'Tür kısıtı yok, en güçlü eşleşmeleri seç.';

  const prompt = [
    'Sen deneyimli bir Türk sinema eleştirmeni ve CineBot yapay zeka asistanısın.',
    modeInstruction,
    genreInstruction,
    'Sadece TMDB veritabanında gerçekten var olan, vizyona girmiş veya resmen duyurulmuş filmleri öner. Asla uydurma film yazma.',
    'Her film için aiReason alanını spoiler vermeden, doğal ve akıcı Türkçe ile 1-2 cümle yaz.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1600,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[CineBot] Gemini HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const json = JSON.parse(rawText);
    const validated = GeminiResponseSchema.safeParse(json);
    if (!validated.success) {
      console.warn('[CineBot] Gemini çıktısı Zod doğrulamasından geçemedi:', validated.error.issues);
      return null;
    }

    return validated.data.recommendations;
  } catch (error) {
    console.warn('[CineBot] Gemini çağrısı atlandı:', error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCineBotRecommendations(params: {
  query: string;
  mode: 'movie' | 'vibe';
  genre: string;
  count: number;
}): Promise<CineBotResponse> {
  const cleanQuery = sanitizePrompt(params.query, 240);
  const genreId = GENRE_SLUG_TO_ID[params.genre] ?? null;
  const genreLabel = genreId ? GENRE_ID_TO_NAME[genreId] ?? null : null;
  const count = Math.min(Math.max(params.count, 1), 8);

  let originalMovie: MovieSummary | null = null;
  if (params.mode === 'movie') {
    originalMovie = await findAndEnrichTmdbMovie(cleanQuery);
  }

  // 1. Gemini Structured JSON + TMDB eşleştirme
  const geminiItems = await queryGeminiStructured({
    query: cleanQuery,
    mode: params.mode,
    count,
    genreLabel,
  });

  if (geminiItems && geminiItems.length > 0) {
    const matched = await Promise.all(
      geminiItems.map(async (item): Promise<CineBotRecommendation | null> => {
        const enriched = await findAndEnrichTmdbMovie(item.title, item.originalTitle, item.year);
        // TMDB'de eşleşmeyen veya afişsiz uydurma filmleri ele!
        if (!enriched || !enriched.id) return null;
        if (originalMovie && enriched.id === originalMovie.id) return null;
        return {
          ...enriched,
          aiReason: item.aiReason,
        };
      })
    );

    const seen = new Set<number>();
    const uniqueSuggestions: CineBotRecommendation[] = [];
    for (const movie of matched) {
      if (!movie || seen.has(movie.id)) continue;
      seen.add(movie.id);
      uniqueSuggestions.push(movie);
      if (uniqueSuggestions.length >= count) break;
    }

    if (uniqueSuggestions.length > 0) {
      return {
        query: cleanQuery,
        mode: params.mode,
        engine: 'gemini',
        originalMovie,
        suggestions: uniqueSuggestions,
        count: uniqueSuggestions.length,
      };
    }
  }

  // 2. Fallback: TMDB Akıllı Algoritma
  const fallback = await getSmartTmdbRecommendations({
    query: cleanQuery,
    count,
    genreId,
    genreLabel,
  });

  return {
    query: cleanQuery,
    mode: params.mode,
    engine: 'tmdb_smart',
    originalMovie: originalMovie ?? fallback.originalMovie,
    suggestions: fallback.suggestions,
    count: fallback.suggestions.length,
  };
}
