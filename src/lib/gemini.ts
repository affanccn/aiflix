import { z } from 'zod';
import type { CineBotResponse, MediaFilter, MediaType } from '@/types';
import {
  discoverMoviesBySignals,
  discoverTvBySignals,
  findRichTmdbMedia,
  getRichMovieMetadata,
  getRichTvMetadata,
  getSpecificKeywordIds,
  quickSearchVibeMedia,
  searchTmdbKeywordIds,
  type RichMovieMetadata,
} from '@/lib/tmdb';
import { GENRE_ID_TO_NAME, GENRE_SLUG_TO_ID, TV_GENRE_SLUG_TO_ID } from '@/lib/genres';
import { sanitizePrompt } from '@/lib/security';
import {
  computeMovieSimilarity,
  computeVibeSimilarity,
  extractVibeIntent,
  finalizeRecommendations,
  isSameFranchiseOrSeries,
  selectDiverseRecommendations,
  type CandidateSignals,
  type ScoredCandidate,
} from '@/lib/recommendation-engine';

export const GeminiRecommendationItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  originalTitle: z.string().trim().min(1).max(200),
  mediaType: z.enum(['movie', 'tv']).catch('movie'),
  year: z.coerce.number().int().min(1900).max(2035).catch(2015),
  semanticMatch: z.coerce
    .number()
    .transform((n) => Math.max(40, Math.min(98, Math.round(n))))
    .catch(80),
  sharedThemes: z
    .array(z.string().trim())
    .transform((arr) => arr.filter((s) => s.length >= 2).slice(0, 4))
    .catch([]),
  aiReason: z.string().trim().min(12).max(600),
});

export const GeminiResponseSchema = z.object({
  recommendations: z.array(z.unknown()),
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
          title: { type: 'STRING', description: 'Yapımın Türkçe veya yaygın adı' },
          originalTitle: { type: 'STRING', description: 'Yapımın resmi orijinal adı' },
          mediaType: {
            type: 'STRING',
            enum: ['movie', 'tv'],
            description: 'Film için "movie", dizi için "tv"',
          },
          year: { type: 'INTEGER', description: 'Vizyon veya ilk yayın yılı (örn. 2016)' },
          semanticMatch: {
            type: 'INTEGER',
            description:
              'Konu, tema, atmosfer, anlatım tarzı ve yaratıcı benzerlik açısından 50 ile 96 arası gerçekçi benzerlik puanı (IMDb puanından bağımsız)',
          },
          sharedThemes: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Seçilen yapım veya istekle somut ortak 2-3 kısa Türkçe tema etiketi',
          },
          aiReason: {
            type: 'STRING',
            description:
              'Bu yapıma özgü, diğer önerilerle aynı kalıbı tekrarlamayan, somut konu/tema/atmosfer/anlatım benzerliğini açıklayan 1-2 cümlelik doğal ve doğru Türkçe gerekçe',
          },
        },
        required: [
          'title',
          'originalTitle',
          'mediaType',
          'year',
          'semanticMatch',
          'sharedThemes',
          'aiReason',
        ],
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
  mediaType: MediaFilter;
  count: number;
  genreLabel: string | null;
  seedMedia: RichMovieMetadata | null;
}): Promise<GeminiRecommendationItem[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const candidateModels = Array.from(
    new Set([configuredModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])
  );

  const requestCount = Math.min(Math.max(params.count + 4, 9), 11);

  const seedTypeLabel = params.seedMedia?.summary.mediaType === 'tv' ? 'dizi' : 'film';
  const seedContextBlock = params.seedMedia
    ? [
        `REFERANS YAPIMIN (${seedTypeLabel.toUpperCase()}) DOĞRULANMIŞ TMDB BİLGİLERİ:`,
        `- Adı: ${params.seedMedia.summary.title} (${params.seedMedia.summary.originalTitle}, ${params.seedMedia.summary.year || 'bilinmiyor'})`,
        `- Yönetmen / Yaratıcı: ${params.seedMedia.directorNames.join(', ') || 'bilinmiyor'}`,
        `- Başlıca Oyuncular: ${params.seedMedia.castNames.slice(0, 5).join(', ') || 'bilinmiyor'}`,
        `- Türler: ${params.seedMedia.genres.join(', ') || 'bilinmiyor'}`,
        `- Anahtar Temalar: ${params.seedMedia.keywordNames.slice(0, 10).join(', ') || 'bilinmiyor'}`,
        `- Özet: ${params.seedMedia.overviewText.slice(0, 360) || 'yok'}`,
      ].join('\n')
    : '';

  const mediaScopeInstruction =
    params.mediaType === 'movie'
      ? 'SADECE sinema filmleri öner (mediaType: "movie"). Dizi önerme.'
      : params.mediaType === 'tv'
        ? 'SADECE diziler öner (mediaType: "tv"). Sinema filmi önerme.'
        : 'Hem sinema filmleri ("movie") hem de diziler ("tv") arasından en iyi eşleşen dengeli bir karışım öner.';

  const modeInstruction =
    params.mode === 'movie'
      ? `Kullanıcı "${params.seedMedia?.summary.title || params.query}" yapımına GERÇEKTEN benzeyen farklı yapımlar arıyor. Bu yapımın kendisini ve aynı serideki devam/ön filmlerini KESİNLİKLE önerme.`
      : `Kullanıcı ruh haline/temasına göre şu kısa veya serbest ifadeyi yazdı: "${params.query}". İfade sadece 1-2 kelime bile olsa (örn. "korkan çocuk", "girls", "ters köşe") kullanıcının kastettiği atmosferi, karakter tipini, duyguyu veya hikâyeyi yaratıcı biçimde yorumla ve tam olarak bu hisse karşılık gelen yapımlar seç.`;

  const genreInstruction = params.genreLabel
    ? `Kullanıcı özellikle "${params.genreLabel}" türüne odaklanmak istiyor; öneriler bu türle uyumlu olsun.`
    : 'Tür kısıtı yok; tek bir alt türe yığılmadan hikâye ve atmosfer uyumu yüksek, tür çeşitliliği dengeli yapımlar seç.';

  const prompt = [
    'Sen derin sinema ve dizi bilgisine sahip bir küratörsün.',
    modeInstruction,
    mediaScopeInstruction,
    seedContextBlock,
    genreInstruction,
    `Toplam ${requestCount} adet GERÇEK yapım öner.`,
    'ZORUNLU KURALLAR:',
    '1) AYNI SERİ KESİN ENGELİ: Aranan yapımın kendi serisindeki hiçbir devam, ön film veya yan yapımı ASLA önerme! (Örn: Recep İvedik arandıysa Recep İvedik 2-7, Maze Runner arandıysa Maze Runner: Scorch Trials / Death Cure, Harry Potter arandıysa diğer Harry Potter filmlerini KESİNLİKLE önerme.)',
    '2) Yalnızca kategori/tür benzerliğine göre alakasız popüler yapımları önerme! Konu, hikâye yapısı, ana temalar, atmosfer, anlatım ritmi, yönetmen/yaratıcı yaklaşımı veya karakter dinamikleri bakımından gerçek benzerlik taşıyan yapımları seç.',
    '3) ÇEŞİTLİLİK: Aynı yönetmen/yaratıcıdan en fazla 1 yapım, aynı başka bir seriden en fazla 1 yapım öner.',
    '4) AÇIKLAMA KALİTESİ: Her yapım için `aiReason` alanı TAMAMEN farklı cümle yapısıyla yazılsın. Aynı açılış kalıbını veya şablon cümleyi asla tekrarlama. Somut hikâye/tema/atmosfer/anlatım bağını açıkla. Var olmayan oyuncu, yönetmen veya sahne uydurma!',
    '5) BENZERLİK PUANI: `semanticMatch` alanı 50-96 arası gerçekçi ve birbirinden farklılaşan benzerlik skoru olsun (IMDb puanıyla karıştırma).',
    '6) Sadece TMDB veritabanında gerçekten var olan film ve dizileri öner; uydurma yapım yazma.',
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
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });

      if (response.status === 400 && generationConfig.thinkingConfig) {
        const retryConfig = { ...generationConfig };
        delete retryConfig.thinkingConfig;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: retryConfig,
          }),
        });
      }

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

      const cleanedText = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const json = JSON.parse(cleanedText);
      const validated = GeminiResponseSchema.safeParse(json);
      if (!validated.success) {
        console.warn(`[CineBot] Gemini (${model}) çıktısı Zod doğrulamasından geçemedi:`, validated.error.issues);
        continue;
      }

      const items: GeminiRecommendationItem[] = [];
      for (const rawItem of validated.data.recommendations) {
        const parsedItem = GeminiRecommendationItemSchema.safeParse(rawItem);
        if (parsedItem.success) {
          items.push(parsedItem.data);
        }
      }
      if (items.length === 0) continue;

      return items.slice(0, 14);
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
  mediaType?: MediaFilter;
  genre: string;
  count: number;
}): Promise<CineBotResponse> {
  const cleanQuery = sanitizePrompt(params.query, 240);
  const requestedMediaType: MediaFilter = params.mediaType || 'all';
  const movieGenreId = GENRE_SLUG_TO_ID[params.genre] ?? null;
  const tvGenreId = TV_GENRE_SLUG_TO_ID[params.genre] ?? movieGenreId;
  const genreLabel = movieGenreId ? GENRE_ID_TO_NAME[movieGenreId] ?? null : null;
  const targetCount = Math.min(Math.max(params.count || 6, 1), 6);

  // 1) Referans film veya dizinin zengin TMDB metadata'sını çek
  let seedMedia: RichMovieMetadata | null = null;
  if (params.mode === 'movie') {
    seedMedia = await findRichTmdbMedia(cleanQuery, undefined, undefined, 'all', true);
  }

  const effectiveMode: 'movie' | 'vibe' =
    params.mode === 'movie' && seedMedia ? 'movie' : 'vibe';

  const vibeIntent =
    effectiveMode === 'vibe' ? extractVibeIntent(cleanQuery, movieGenreId) : null;

  const seedIsAnimation = Boolean(seedMedia?.genreIds.includes(16));
  const seedType: MediaType = seedMedia?.summary.mediaType === 'tv' ? 'tv' : 'movie';

  const wantMovies = requestedMediaType === 'all' || requestedMediaType === 'movie';
  const wantTv = requestedMediaType === 'all' || requestedMediaType === 'tv';

  // 2) Vibe modunda kısa/serbest ifadeler için TMDB canlı keyword araması + doğrudan başlık aramasını paralel hazırla
  const [liveVibeKeywordIds, directVibeMatches] =
    effectiveMode === 'vibe' && vibeIntent
      ? await Promise.all([
          searchTmdbKeywordIds(vibeIntent.searchTermsEn, 6),
          quickSearchVibeMedia(cleanQuery, requestedMediaType),
        ])
      : [[], []];

  const mergedVibeKeywordIds = vibeIntent
    ? Array.from(new Set([...vibeIntent.inferredKeywordIds, ...liveVibeKeywordIds])).slice(0, 6)
    : [];

  // 3) Gemini semantik adayları + TMDB tematik film/dizi keşfini paralel çalıştır
  const [geminiItems, movieDiscoverPool, tvDiscoverPool] = await Promise.all([
    queryGeminiStructured({
      query: cleanQuery,
      mode: effectiveMode,
      mediaType: requestedMediaType,
      count: targetCount,
      genreLabel,
      seedMedia,
    }),
    wantMovies
      ? effectiveMode === 'movie' && seedMedia
        ? discoverMoviesBySignals({
            keywordIds: getSpecificKeywordIds(seedMedia, 6),
            genreIds: movieGenreId ? [movieGenreId] : undefined,
            anyGenreIds: !movieGenreId && seedType === 'movie' ? seedMedia.genreIds.slice(0, 2) : undefined,
            withoutGenreIds: !seedIsAnimation && movieGenreId !== 16 ? [16, 10751] : undefined,
            minVoteCount: 300,
            minVoteAverage: 6.3,
          })
        : effectiveMode === 'vibe' && vibeIntent
          ? discoverMoviesBySignals({
              keywordIds: mergedVibeKeywordIds,
              genreIds: movieGenreId ? [movieGenreId] : undefined,
              anyGenreIds: !movieGenreId ? vibeIntent.inferredGenreIds.slice(0, 2) : undefined,
              withoutGenreIds: !vibeIntent.wantsAnimation && movieGenreId !== 16 ? [16, 10751] : undefined,
              minVoteCount: 150,
              minVoteAverage: 6.1,
            })
          : Promise.resolve([])
      : Promise.resolve([]),
    wantTv
      ? effectiveMode === 'movie' && seedMedia
        ? discoverTvBySignals({
            keywordIds: getSpecificKeywordIds(seedMedia, 6),
            genreIds: tvGenreId ? [tvGenreId] : undefined,
            anyGenreIds: !tvGenreId && seedType === 'tv' ? seedMedia.genreIds.slice(0, 2) : undefined,
            withoutGenreIds: !seedIsAnimation && tvGenreId !== 16 ? [16, 10762] : undefined,
            minVoteCount: 150,
            minVoteAverage: 6.6,
          })
        : effectiveMode === 'vibe' && vibeIntent
          ? discoverTvBySignals({
              keywordIds: mergedVibeKeywordIds,
              genreIds: tvGenreId ? [tvGenreId] : undefined,
              anyGenreIds: !tvGenreId && vibeIntent.inferredGenreIds.length > 0 ? vibeIntent.inferredGenreIds.slice(0, 2) : undefined,
              withoutGenreIds: !vibeIntent.wantsAnimation && tvGenreId !== 16 ? [16, 10762] : undefined,
              minVoteCount: 100,
              minVoteAverage: 6.4,
            })
          : Promise.resolve([])
      : Promise.resolve([]),
  ]);

  // 3) Aday havuzu (anahtar: "movie:123" veya "tv:456") ve çoklu sinyal birleştirme
  const candidateMetaMap = new Map<string, RichMovieMetadata>();
  const candidateSignalsMap = new Map<string, CandidateSignals>();
  const seedKey = seedMedia ? `${seedType}:${seedMedia.summary.id}` : null;

  const mergeSignals = (key: string, patch: Partial<CandidateSignals>) => {
    const existing = candidateSignalsMap.get(key) || {};
    candidateSignalsMap.set(key, { ...existing, ...patch });
  };

  // A) Gemini adaylarını TMDB zengin metadata ile doğrula
  let geminiValidatedCount = 0;
  if (geminiItems && geminiItems.length > 0) {
    const resolvedGemini = await Promise.all(
      geminiItems.map(async (item, idx) => {
        const targetType: MediaFilter =
          requestedMediaType === 'all' ? item.mediaType : requestedMediaType;
        const meta = await findRichTmdbMedia(
          item.title,
          item.originalTitle,
          item.year,
          targetType,
          false
        );
        return { item, idx, meta };
      })
    );

    for (const { item, idx, meta } of resolvedGemini) {
      if (!meta || !meta.summary.id || !meta.summary.posterPath) continue;
      const mType: MediaType = meta.summary.mediaType === 'tv' ? 'tv' : 'movie';
      if (requestedMediaType !== 'all' && mType !== requestedMediaType) continue;

      const key = `${mType}:${meta.summary.id}`;
      if (seedKey && key === seedKey) continue;
      if (seedMedia && isSameFranchiseOrSeries(seedMedia, meta)) continue;

      candidateMetaMap.set(key, meta);
      mergeSignals(key, {
        fromGemini: true,
        geminiRank: idx,
        geminiSemanticScore: item.semanticMatch,
        geminiReason: item.aiReason,
        geminiSharedThemes: item.sharedThemes,
      });
      geminiValidatedCount++;
    }
  }

  // B) TMDB çok-kaynaklı adayları dengeli sırayla kuyruğa ekle
  const toEnrich: Array<{ id: number; type: MediaType }> = [];
  const queuedKeys = new Set<string>(seedKey ? [seedKey] : []);
  for (const key of candidateMetaMap.keys()) queuedKeys.add(key);

  const enqueue = (id: number, type: MediaType, patch: Partial<CandidateSignals>) => {
    const key = `${type}:${id}`;
    if (seedKey && key === seedKey) return;
    mergeSignals(key, patch);
    if (!queuedKeys.has(key)) {
      queuedKeys.add(key);
      toEnrich.push({ id, type });
    }
  };

  // 0) Vibe modunda kısa/serbest ifadelerle doğrudan eşleşen film/diziler (örn. "girls")
  for (const hit of directVibeMatches) {
    enqueue(hit.id, hit.type, { fromDirectSearch: true });
  }

  // 1) Tematik Keyword + Tür keşfi (en güçlü alaka sinyali)
  const maxDiscoverMovies = requestedMediaType === 'movie' ? 10 : requestedMediaType === 'all' ? 6 : 0;
  const maxDiscoverTv = requestedMediaType === 'tv' ? 10 : requestedMediaType === 'all' ? 6 : 0;
  for (const raw of movieDiscoverPool.slice(0, maxDiscoverMovies)) {
    if (raw.id) enqueue(raw.id, 'movie', { fromKeywordDiscover: true });
  }
  for (const raw of tvDiscoverPool.slice(0, maxDiscoverTv)) {
    if (raw.id) enqueue(raw.id, 'tv', { fromKeywordDiscover: true });
  }

  // 2) Referans yapımın kendi TMDB recommendations & similar listeleri (aynı medya türü isteniyorsa)
  if (seedMedia && (requestedMediaType === 'all' || requestedMediaType === seedType)) {
    seedMedia.recommendedIds.slice(0, 8).forEach((id, rank) => {
      if (id) enqueue(id, seedType, { fromTmdbRecs: true, tmdbRecsRank: rank });
    });
    seedMedia.similarIds.slice(0, 6).forEach((id) => {
      if (id) enqueue(id, seedType, { fromTmdbSimilar: true });
    });
  }

  const enrichLimit = geminiValidatedCount >= 8 ? 6 : 16;
  if (toEnrich.length > 0) {
    const extraMetas = await Promise.all(
      toEnrich.slice(0, enrichLimit).map((item) =>
        item.type === 'tv' ? getRichTvMetadata(item.id, false) : getRichMovieMetadata(item.id, false)
      )
    );
    for (const meta of extraMetas) {
      if (!meta || !meta.summary.id || !meta.summary.posterPath) continue;
      const mType: MediaType = meta.summary.mediaType === 'tv' ? 'tv' : 'movie';
      const key = `${mType}:${meta.summary.id}`;
      if (seedKey && key === seedKey) continue;
      if (seedMedia && isSameFranchiseOrSeries(seedMedia, meta)) continue;
      if (!candidateMetaMap.has(key)) {
        candidateMetaMap.set(key, meta);
      }
    }
  }

  // 4) Tüm adayları çok boyutlu benzerlik algoritmasıyla (0-100) puanla
  const scoredCandidates: ScoredCandidate[] = [];
  for (const [key, meta] of candidateMetaMap.entries()) {
    const signals = candidateSignalsMap.get(key) || {};
    const effectiveGenreId = meta.summary.mediaType === 'tv' ? tvGenreId : movieGenreId;
    const scored =
      effectiveMode === 'movie' && seedMedia
        ? computeMovieSimilarity(seedMedia, meta, signals, effectiveGenreId)
        : computeVibeSimilarity(cleanQuery, effectiveGenreId, meta, signals);
    scoredCandidates.push(scored);
  }

  // Kullanıcı belirli bir tür filtresi seçtiyse önce o türe uyan adayları önceliklendir
  let poolToSelect = scoredCandidates;
  if (movieGenreId || tvGenreId) {
    const matchingGenre = scoredCandidates.filter((c) => {
      const targetGid = c.metadata.summary.mediaType === 'tv' ? tvGenreId : movieGenreId;
      return targetGid ? c.metadata.genreIds.includes(targetGid) : true;
    });
    if (matchingGenre.length > 0) {
      poolToSelect = matchingGenre;
    }
  }

  // 5) Çeşitlilik + aynı seri kesin engeli + alaka eşiği ile en iyi 6 yapımı seç & sırala
  const selected = selectDiverseRecommendations(poolToSelect, {
    maxCount: targetCount,
    minSimilarityScore: effectiveMode === 'movie' ? 48 : 45,
    requestedGenreId: movieGenreId,
  });

  // 6) Her yapım için benzersiz, şablon tekrarsız ve doğrulanmış öneri gerekçelerini oluştur
  const suggestions = finalizeRecommendations(selected, {
    mode: effectiveMode,
    query: cleanQuery,
    seedTitle: seedMedia?.summary.title ?? null,
  });

  return {
    query: cleanQuery,
    mode: params.mode,
    mediaType: requestedMediaType,
    engine: geminiValidatedCount > 0 ? 'gemini' : 'tmdb_smart',
    originalMovie: seedMedia?.summary ?? null,
    suggestions,
    count: suggestions.length,
  };
}
