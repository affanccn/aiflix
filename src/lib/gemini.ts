import { z } from 'zod';
import type { CineBotResponse } from '@/types';
import {
  discoverMoviesBySignals,
  findRichTmdbMovie,
  getRichMovieMetadata,
  type RichMovieMetadata,
} from '@/lib/tmdb';
import { GENRE_ID_TO_NAME, GENRE_SLUG_TO_ID } from '@/lib/genres';
import { sanitizePrompt } from '@/lib/security';
import {
  computeMovieSimilarity,
  computeVibeSimilarity,
  extractVibeIntent,
  finalizeRecommendations,
  selectDiverseRecommendations,
  type CandidateSignals,
  type ScoredCandidate,
} from '@/lib/recommendation-engine';

export const GeminiRecommendationItemSchema = z.object({
  title: z.string().min(1).max(160),
  originalTitle: z.string().min(1).max(160),
  year: z.number().int().min(1900).max(2035),
  semanticMatch: z.number().min(40).max(98).optional().default(80),
  sharedThemes: z.array(z.string().min(2).max(60)).max(4).optional().default([]),
  aiReason: z.string().min(20).max(460),
});

export const GeminiResponseSchema = z.object({
  recommendations: z.array(GeminiRecommendationItemSchema).min(1).max(14),
});

type GeminiRecommendationItem = z.infer<typeof GeminiRecommendationItemSchema>;

const GEMINI_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'Filmin Türkçe veya yaygın adı' },
          originalTitle: { type: 'STRING', description: 'Filmin resmi orijinal adı' },
          year: { type: 'INTEGER', description: 'Vizyon yılı (örn. 2016)' },
          semanticMatch: {
            type: 'INTEGER',
            description:
              'Konu, tema, atmosfer, anlatım tarzı ve yaratıcı benzerlik açısından 50 ile 96 arası gerçekçi benzerlik puanı (IMDb puanından bağımsız)',
          },
          sharedThemes: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Seçilen film veya istekle somut ortak 2-3 kısa Türkçe tema etiketi',
          },
          aiReason: {
            type: 'STRING',
            description:
              'Bu filme özgü, diğer filmlerle aynı kalıbı tekrarlamayan, somut konu/tema/atmosfer/anlatım benzerliğini açıklayan 1-2 cümlelik doğal ve doğru Türkçe gerekçe',
          },
        },
        required: ['title', 'originalTitle', 'year', 'semanticMatch', 'sharedThemes', 'aiReason'],
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
  seedMovie: RichMovieMetadata | null;
}): Promise<GeminiRecommendationItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const candidateModels = Array.from(
    new Set([configuredModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])
  );

  // Çeşitlilik + TMDB doğrulama filtrelemesi sonrası 6 güçlü film seçebilmek için 10 aday iste
  const requestCount = Math.min(Math.max(params.count + 4, 9), 11);

  const seedContextBlock = params.seedMovie
    ? [
        'REFERANS FİLMİN DOĞRULANMIŞ TMDB BİLGİLERİ:',
        `- Adı: ${params.seedMovie.summary.title} (${params.seedMovie.summary.originalTitle}, ${params.seedMovie.summary.year || 'bilinmiyor'})`,
        `- Yönetmen: ${params.seedMovie.directorNames.join(', ') || 'bilinmiyor'}`,
        `- Başlıca Oyuncular: ${params.seedMovie.castNames.slice(0, 5).join(', ') || 'bilinmiyor'}`,
        `- Türler: ${params.seedMovie.genres.join(', ') || 'bilinmiyor'}`,
        `- Anahtar Temalar: ${params.seedMovie.keywordNames.slice(0, 10).join(', ') || 'bilinmiyor'}`,
        `- Özet: ${params.seedMovie.overviewText.slice(0, 360) || 'yok'}`,
      ].join('\n')
    : '';

  const modeInstruction =
    params.mode === 'movie'
      ? `Kullanıcı "${params.seedMovie?.summary.title || params.query}" filmine GERÇEKTEN benzeyen filmler arıyor. Bu filmin kendisini kesinlikle önerme.`
      : `Kullanıcı şu ruh hali/tema/hikâye arayışında: "${params.query}".`;

  const genreInstruction = params.genreLabel
    ? `Kullanıcı özellikle "${params.genreLabel}" türüne odaklanmak istiyor; öneriler bu türle uyumlu olsun.`
    : 'Tür kısıtı yok; tek bir alt türe yığılmadan hikâye ve atmosfer uyumu yüksek, tür çeşitliliği dengeli filmler seç.';

  const prompt = [
    'Sen derin sinema bilgisine sahip bir film küratörüsün.',
    modeInstruction,
    seedContextBlock,
    genreInstruction,
    `Toplam ${requestCount} adet GERÇEK sinema filmi öner.`,
    'ZORUNLU KURALLAR:',
    '1) Yalnızca kategori/tür benzerliğine göre alakasız popüler filmleri önerme! Konu, hikâye yapısı, ana temalar, atmosfer, anlatım ritmi, yönetmenlik yaklaşımı veya karakter dinamikleri bakımından gerçek benzerlik taşıyan filmleri seç.',
    '2) ÇEŞİTLİLİK: Aynı yönetmenden en fazla 1 film öner. Aynı film serisinden/franchise’dan en fazla 1 film öner (referans filmin doğrudan devam filmlerini listeye doldurma).',
    '3) AÇIKLAMA KALİTESİ: Her film için `aiReason` alanı TAMAMEN farklı cümle yapısıyla yazılsın. Aynı açılış kalıbını veya şablon cümleyi asla tekrarlama. Somut hikâye/tema/atmosfer/anlatım bağını açıkla. Var olmayan oyuncu, yönetmen veya sahne uydurma!',
    '4) BENZERLİK PUANI: `semanticMatch` alanı 50-96 arası gerçekçi ve birbirinden farklılaşan benzerlik skoru olsun (IMDb puanıyla karıştırma).',
    '5) Sadece TMDB veritabanında gerçekten var olan filmleri öner; uydurma film yazma.',
  ]
    .filter(Boolean)
    .join('\n');

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const generationConfig: Record<string, unknown> = {
        temperature: 0.55,
        maxOutputTokens: 2800,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_JSON_SCHEMA,
      };
      if (model.includes('2.5')) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });

      if (!response.ok) {
        console.warn(`[CineBot] Gemini (${model}) HTTP ${response.status}`);
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
      };
      const parts = payload.candidates?.[0]?.content?.parts ?? [];
      const rawText =
        parts.find((p) => !p.thought && typeof p.text === 'string' && p.text.trim().length > 0)?.text ??
        parts[0]?.text;
      if (!rawText) continue;

      const json = JSON.parse(rawText);
      const validated = GeminiResponseSchema.safeParse(json);
      if (!validated.success) {
        console.warn(`[CineBot] Gemini (${model}) çıktısı Zod doğrulamasından geçemedi:`, validated.error.issues);
        continue;
      }

      return validated.data.recommendations;
    } catch (error) {
      console.warn(`[CineBot] Gemini (${model}) çağrısı atlandı:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
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
  const targetCount = Math.min(Math.max(params.count || 6, 1), 6);

  // 1) Film modunda referans filmin zengin TMDB metadata'sını çek (yönetmen, kadro, anahtar kelimeler, özet, öneriler)
  let seedMovie: RichMovieMetadata | null = null;
  if (params.mode === 'movie') {
    seedMovie = await findRichTmdbMovie(cleanQuery, undefined, undefined, true);
  }

  const effectiveMode: 'movie' | 'vibe' =
    params.mode === 'movie' && seedMovie ? 'movie' : 'vibe';

  const vibeIntent =
    effectiveMode === 'vibe' ? extractVibeIntent(cleanQuery, genreId) : null;

  // 2) Gemini semantik adayları + TMDB tematik keşfi paralel çalıştır
  const [geminiItems, keywordDiscoverPool] = await Promise.all([
    queryGeminiStructured({
      query: cleanQuery,
      mode: effectiveMode,
      count: targetCount,
      genreLabel,
      seedMovie,
    }),
    effectiveMode === 'movie' && seedMovie && seedMovie.keywordIds.length > 0
      ? discoverMoviesBySignals({
          keywordIds: seedMovie.keywordIds.slice(0, 5),
          genreIds: genreId ? [genreId] : undefined,
          minVoteCount: 150,
          minVoteAverage: 6.0,
        })
      : effectiveMode === 'vibe' && vibeIntent
        ? discoverMoviesBySignals({
            keywordIds: vibeIntent.inferredKeywordIds,
            genreIds: genreId
              ? [genreId]
              : vibeIntent.inferredGenreIds.slice(0, 2),
            minVoteCount: 150,
            minVoteAverage: 6.2,
          })
        : Promise.resolve([]),
  ]);

  // 3) Aday havuzu ve çoklu sinyal birleştirme
  const candidateMetaMap = new Map<number, RichMovieMetadata>();
  const candidateSignalsMap = new Map<number, CandidateSignals>();
  const seedId = seedMovie?.summary.id ?? null;

  const mergeSignals = (movieId: number, patch: Partial<CandidateSignals>) => {
    const existing = candidateSignalsMap.get(movieId) || {};
    candidateSignalsMap.set(movieId, { ...existing, ...patch });
  };

  // A) Gemini adaylarını TMDB zengin metadata ile doğrula (uydurma filmleri ele!)
  let geminiValidatedCount = 0;
  if (geminiItems && geminiItems.length > 0) {
    const resolvedGemini = await Promise.all(
      geminiItems.map(async (item, idx) => {
        const meta = await findRichTmdbMovie(item.title, item.originalTitle, item.year, false);
        return { item, idx, meta };
      })
    );

    for (const { item, idx, meta } of resolvedGemini) {
      if (!meta || !meta.summary.id || !meta.summary.posterPath) continue;
      if (seedId && meta.summary.id === seedId) continue;

      candidateMetaMap.set(meta.summary.id, meta);
      mergeSignals(meta.summary.id, {
        fromGemini: true,
        geminiRank: idx,
        geminiSemanticScore: item.semanticMatch,
        geminiReason: item.aiReason,
        geminiSharedThemes: item.sharedThemes,
      });
      geminiValidatedCount++;
    }
  }

  // B) TMDB çok-kaynaklı adayları (recommendations + similar + keyword discover) sinyalleriyle ekle
  const tmdbIdsToEnrich: number[] = [];
  const queuedIds = new Set<number>(seedId ? [seedId] : []);
  for (const id of candidateMetaMap.keys()) queuedIds.add(id);

  if (seedMovie) {
    seedMovie.recommendedIds.slice(0, 12).forEach((id, rank) => {
      if (id === seedId) return;
      mergeSignals(id, { fromTmdbRecs: true, tmdbRecsRank: rank });
      if (!queuedIds.has(id)) {
        queuedIds.add(id);
        tmdbIdsToEnrich.push(id);
      }
    });

    seedMovie.similarIds.slice(0, 8).forEach((id) => {
      if (id === seedId) return;
      mergeSignals(id, { fromTmdbSimilar: true });
      if (!queuedIds.has(id) && tmdbIdsToEnrich.length < 16) {
        queuedIds.add(id);
        tmdbIdsToEnrich.push(id);
      }
    });
  }

  for (const raw of keywordDiscoverPool.slice(0, 10)) {
    if (!raw.id || raw.id === seedId) continue;
    mergeSignals(raw.id, { fromKeywordDiscover: true });
    if (!queuedIds.has(raw.id) && tmdbIdsToEnrich.length < 18) {
      queuedIds.add(raw.id);
      tmdbIdsToEnrich.push(raw.id);
    }
  }

  // Gemini yeterli aday bulamadıysa veya zenginleştirme gerekiyorsa TMDB adaylarının detaylı metadata'sını çek
  const enrichLimit = geminiValidatedCount >= 8 ? 6 : 14;
  if (tmdbIdsToEnrich.length > 0) {
    const extraMetas = await Promise.all(
      tmdbIdsToEnrich.slice(0, enrichLimit).map((id) => getRichMovieMetadata(id, false))
    );
    for (const meta of extraMetas) {
      if (!meta || !meta.summary.id || !meta.summary.posterPath) continue;
      if (seedId && meta.summary.id === seedId) continue;
      if (!candidateMetaMap.has(meta.summary.id)) {
        candidateMetaMap.set(meta.summary.id, meta);
      }
    }
  }

  // 4) Tüm adayları çok boyutlu benzerlik algoritmasıyla (0-100) puanla
  const scoredCandidates: ScoredCandidate[] = [];
  for (const [movieId, meta] of candidateMetaMap.entries()) {
    // Kullanıcı açıkça tür seçtiyse o türe uymayanları (yeterli aday varsa) filtrelemek için genreId'yi ver
    const signals = candidateSignalsMap.get(movieId) || {};
    const scored =
      effectiveMode === 'movie' && seedMovie
        ? computeMovieSimilarity(seedMovie, meta, signals, genreId)
        : computeVibeSimilarity(cleanQuery, genreId, meta, signals);
    scoredCandidates.push(scored);
  }

  // Kullanıcı belirli bir tür filtresi seçtiyse önce o türe uyan adayları önceliklendir
  let poolToSelect = scoredCandidates;
  if (genreId) {
    const matchingGenre = scoredCandidates.filter((c) => c.metadata.genreIds.includes(genreId));
    if (matchingGenre.length > 0) {
      poolToSelect = matchingGenre;
    }
  }

  // 5) Çeşitlilik (aynı yönetmen/seri kısıtı, tür dengesi) + alaka eşiği ile en iyi 6 filmi seç & sırala
  const selected = selectDiverseRecommendations(poolToSelect, {
    maxCount: targetCount,
    minSimilarityScore: effectiveMode === 'movie' ? 48 : 45,
    requestedGenreId: genreId,
  });

  // 6) Her film için benzersiz, şablon tekrarsız ve doğrulanmış öneri gerekçelerini oluştur
  const suggestions = finalizeRecommendations(selected, {
    mode: effectiveMode,
    query: cleanQuery,
    seedTitle: seedMovie?.summary.title ?? null,
  });

  return {
    query: cleanQuery,
    mode: params.mode,
    engine: geminiValidatedCount > 0 ? 'gemini' : 'tmdb_smart',
    originalMovie: seedMovie?.summary ?? null,
    suggestions,
    count: suggestions.length,
  };
}
