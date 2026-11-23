import { describe, it, expect } from 'vitest';
import type { RichMovieMetadata } from '@/lib/tmdb';
import {
  computeMovieSimilarity,
  computeVibeSimilarity,
  extractVibeIntent,
  finalizeRecommendations,
  isSameFranchiseOrSeries,
  selectDiverseRecommendations,
} from '@/lib/recommendation-engine';

function makeMeta(overrides: Partial<RichMovieMetadata> & { id: number; title: string }): RichMovieMetadata {
  const { id, title, ...rest } = overrides;
  const genres = rest.genres ?? ['Bilim Kurgu', 'Dram'];
  const genreIds = rest.genreIds ?? [878, 18];
  const yearNum = rest.yearNum ?? 2014;
  return {
    summary: {
      id,
      title,
      originalTitle: rest.summary?.originalTitle ?? title,
      overview: rest.overviewText ?? 'Uzay ve zaman üzerine derin bir dram.',
      posterPath: '/poster.jpg',
      backdropPath: '/backdrop.jpg',
      releaseDate: `${yearNum}-01-01`,
      year: String(yearNum),
      voteAverage: rest.summary?.voteAverage ?? 7.8,
      voteCount: rest.summary?.voteCount ?? 4500,
      genreIds,
      genres,
      runtime: rest.summary?.runtime ?? 135,
      trailerKey: rest.summary?.trailerKey ?? 'abc12345678',
    },
    imdbId: 'tt0816692',
    tagline: '',
    overviewText: 'Uzay ve zaman üzerine derin bir dram.',
    originalLanguage: 'en',
    yearNum,
    genreIds,
    genres,
    directorIds: [1],
    directorNames: ['Varsayılan Yönetmen'],
    writerNames: [],
    castIds: [10],
    castNames: ['Varsayılan Oyuncu'],
    keywordIds: [],
    keywordNames: [],
    collectionId: null,
    collectionName: null,
    recommendedIds: [],
    similarIds: [],
    relatedPool: [],
    ...rest,
  };
}

describe('Çok Boyutlu Film Öneri Algoritması', () => {
  const interstellar = makeMeta({
    id: 157336,
    title: 'Yıldızlararası',
    summary: {
      id: 157336,
      title: 'Yıldızlararası',
      originalTitle: 'Interstellar',
      overview: 'İnsanlığın kurtuluşu için solucan deliğinden geçen bir astronot ve kızına dönme mücadelesi.',
      posterPath: '/interstellar.jpg',
      backdropPath: null,
      releaseDate: '2014-11-05',
      year: '2014',
      voteAverage: 8.4,
      voteCount: 35000,
      genreIds: [12, 18, 878],
      genres: ['Macera', 'Dram', 'Bilim Kurgu'],
      runtime: 169,
      trailerKey: 'zSWdZVtXT7E',
    },
    overviewText:
      'İnsanlığın kurtuluşu için solucan deliğinden geçen bir astronot, kara delik, görelilik ve kızına dönme mücadelesi.',
    genreIds: [12, 18, 878],
    genres: ['Macera', 'Dram', 'Bilim Kurgu'],
    directorIds: [525],
    directorNames: ['Christopher Nolan'],
    castIds: [10297, 1813],
    castNames: ['Matthew McConaughey', 'Anne Hathaway'],
    keywordIds: [1432, 9882, 4379, 161176, 10349],
    keywordNames: ['space travel', 'space', 'time travel', 'astronaut', 'survival'],
    yearNum: 2014,
  });

  it('sadece aynı türde olup hikâye/tema bağı olmayan yüksek IMDb filmlerini eler', () => {
    const arrival = makeMeta({
      id: 329865,
      title: 'Geliş',
      overviewText:
        'Dilbilimci bir kadın uzaydan gelen varlıklarla temas kurarken zaman algısı ve kızına dair anılarıyla yüzleşir.',
      genreIds: [18, 878, 9648],
      genres: ['Dram', 'Bilim Kurgu', 'Gizem'],
      directorIds: [137427],
      directorNames: ['Denis Villeneuve'],
      castNames: ['Amy Adams'],
      keywordIds: [9882, 4379, 1432],
      keywordNames: ['space', 'time travel', 'space travel'],
      yearNum: 2016,
      summary: {
        id: 329865,
        title: 'Geliş',
        originalTitle: 'Arrival',
        overview: 'Dilbilimci ve zaman algısı.',
        posterPath: '/arrival.jpg',
        backdropPath: null,
        releaseDate: '2016-11-10',
        year: '2016',
        voteAverage: 7.6, // IMDb puanı daha düşük ama benzerliği çok yüksek!
        voteCount: 17000,
        genreIds: [18, 878, 9648],
        genres: ['Dram', 'Bilim Kurgu', 'Gizem'],
        runtime: 116,
        trailerKey: 'tFMo_UJ4B4g',
      },
    });

    const unrelatedSciFi = makeMeta({
      id: 999001,
      title: 'Rastgele Süper Kahraman Komedisi',
      overviewText: 'Şehirde esprili kahramanlar sokak çeteleriyle dövüşüp parti düzenler.',
      genreIds: [12, 18, 878],
      genres: ['Macera', 'Dram', 'Bilim Kurgu'],
      directorIds: [777],
      directorNames: ['Bambaşka Yönetmen'],
      castNames: ['Bambaşka Oyuncu'],
      keywordIds: [99991, 99992],
      keywordNames: ['superhero parody', 'party'],
      yearNum: 2022,
      summary: {
        id: 999001,
        title: 'Rastgele Süper Kahraman Komedisi',
        originalTitle: 'Random Comedy',
        overview: 'Şehirde esprili kahramanlar.',
        posterPath: '/rand.jpg',
        backdropPath: null,
        releaseDate: '2022-05-01',
        year: '2022',
        voteAverage: 8.9, // Yüksek IMDb puanına rağmen konu/tema ilgisiz!
        voteCount: 12000,
        genreIds: [12, 18, 878],
        genres: ['Macera', 'Dram', 'Bilim Kurgu'],
        runtime: 100,
        trailerKey: null,
      },
    });

    const arrivalScore = computeMovieSimilarity(interstellar, arrival, {
      fromTmdbRecs: true,
      tmdbRecsRank: 0,
    });
    const unrelatedScore = computeMovieSimilarity(interstellar, unrelatedSciFi, {});

    expect(arrivalScore.similarityScore).toBeGreaterThanOrEqual(72);
    expect(unrelatedScore.similarityScore).toBeLessThan(45);

    // Alakasız film sırf 6'ya tamamlamak için seçilmemeli!
    const selected = selectDiverseRecommendations([unrelatedScore, arrivalScore], {
      maxCount: 6,
      minSimilarityScore: 48,
    });
    expect(selected.map((s) => s.metadata.summary.id)).toEqual([329865]);
  });

  it('aynı yönetmen ve aynı seri tekrarına izin vermez, tam olarak 6 veya daha az sonuç döner ve büyükten küçüğe sıralar', () => {
    const candidates = [
      // Aynı yönetmenden (Nolan) 2 film -> sadece en iyi 1 tanesi seçilmeli
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 1,
          title: 'Başlangıç',
          directorNames: ['Christopher Nolan'],
          keywordIds: [4379, 9882],
          keywordNames: ['time travel', 'space'],
          genres: ['Aksiyon', 'Bilim Kurgu'],
          genreIds: [28, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 91 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 2,
          title: 'Tenet',
          directorNames: ['Christopher Nolan'],
          keywordIds: [4379],
          keywordNames: ['time travel'],
          genres: ['Aksiyon', 'Bilim Kurgu'],
          genreIds: [28, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 86 }
      ),
      // Aynı koleksiyondan (Dune) 2 film -> sadece 1 tanesi seçilmeli
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 3,
          title: 'Dune: Çöl Gezegeni',
          directorNames: ['Denis Villeneuve'],
          collectionId: 726871,
          collectionName: 'Dune Collection',
          keywordIds: [9882, 1432],
          keywordNames: ['space', 'space travel'],
          genres: ['Bilim Kurgu', 'Macera'],
          genreIds: [878, 12],
        }),
        { fromGemini: true, geminiSemanticScore: 89 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 4,
          title: 'Dune: Bölüm İki',
          directorNames: ['Başka Yönetmen X'],
          collectionId: 726871,
          collectionName: 'Dune Collection',
          keywordIds: [9882, 1432],
          keywordNames: ['space', 'space travel'],
          genres: ['Bilim Kurgu', 'Macera'],
          genreIds: [878, 12],
        }),
        { fromGemini: true, geminiSemanticScore: 87 }
      ),
      // 5 farklı yönetmenli, farklı tematik açılı güçlü aday
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 5,
          title: 'Marslı',
          directorNames: ['Ridley Scott'],
          keywordIds: [161176, 10349, 1432],
          keywordNames: ['astronaut', 'survival', 'space travel'],
          genres: ['Dram', 'Macera', 'Bilim Kurgu'],
          genreIds: [18, 12, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 85 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 6,
          title: 'Yerçekimi',
          directorNames: ['Alfonso Cuarón'],
          keywordIds: [161176, 10349, 9882],
          keywordNames: ['astronaut', 'survival', 'space'],
          genres: ['Gerilim', 'Dram', 'Bilim Kurgu'],
          genreIds: [53, 18, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 84 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 7,
          title: 'Mesaj',
          directorNames: ['Robert Zemeckis'],
          castNames: ['Matthew McConaughey', 'Jodie Foster'],
          keywordIds: [1432, 9882],
          keywordNames: ['space travel', 'space'],
          genres: ['Gizem', 'Dram', 'Bilim Kurgu'],
          genreIds: [9648, 18, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 88 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 8,
          title: 'Gün Işığı',
          directorNames: ['Danny Boyle'],
          keywordIds: [1432, 161176, 10349],
          keywordNames: ['space travel', 'astronaut', 'survival'],
          genres: ['Gerilim', 'Bilim Kurgu'],
          genreIds: [53, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 82 }
      ),
      computeMovieSimilarity(
        interstellar,
        makeMeta({
          id: 9,
          title: 'Ay',
          directorNames: ['Duncan Jones'],
          keywordIds: [9882, 161176],
          keywordNames: ['space', 'astronaut'],
          genres: ['Gizem', 'Bilim Kurgu'],
          genreIds: [9648, 878],
        }),
        { fromGemini: true, geminiSemanticScore: 80 }
      ),
    ];

    const selected = selectDiverseRecommendations(candidates, {
      maxCount: 6,
      minSimilarityScore: 48,
    });

    expect(selected).toHaveLength(6);

    // Aynı yönetmen tekrar etmemeli
    const directors = selected.map((s) => s.metadata.directorNames[0]);
    expect(new Set(directors).size).toBe(6);

    // Aynı koleksiyon tekrar etmemeli
    const collections = selected
      .map((s) => s.metadata.collectionId)
      .filter((c): c is number => c !== null);
    expect(new Set(collections).size).toBe(collections.length);

    // En yüksek benzerlikten en düşüğe sıralı olmalı
    for (let i = 1; i < selected.length; i++) {
      expect(selected[i - 1].similarityScore).toBeGreaterThanOrEqual(selected[i].similarityScore);
    }

    // Her film için birbirinden farklı, tekrar etmeyen öneri gerekçesi üretilmeli
    const finalized = finalizeRecommendations(selected, {
      mode: 'movie',
      query: 'Interstellar',
      seedTitle: 'Yıldızlararası',
    });

    const reasons = finalized.map((f) => f.aiReason);
    expect(new Set(reasons).size).toBe(6);
    const openings = reasons.map((r) => r.split(/\s+/).slice(0, 4).join(' ').toLowerCase());
    expect(new Set(openings).size).toBe(6);
  });

  it('vibe modunda Türkçe niyeti doğru çözer ve animasyon uyumsuzluğunu düşürür', () => {
    const intent = extractVibeIntent('Karanlık atmosferli distopik bilim kurgu', null);
    expect(intent.wantsAnimation).toBe(false);
    expect(intent.inferredGenreIds).toContain(878);
    expect(intent.inferredKeywordIds.length).toBeGreaterThan(0);

    const bladeRunner = makeMeta({
      id: 335984,
      title: 'Blade Runner 2049',
      directorNames: ['Denis Villeneuve'],
      genres: ['Bilim Kurgu', 'Dram'],
      genreIds: [878, 18],
      keywordIds: [4565, 12190, 310],
      keywordNames: ['dystopia', 'cyberpunk', 'artificial intelligence'],
      overviewText: 'Distopik gelecekte karanlık bir dedektiflik ve yapay zekâ gizemi.',
    });

    const animatedUnrelated = makeMeta({
      id: 1560520,
      title: 'Rastgele Animasyon',
      directorNames: ['Animatör'],
      genres: ['Animasyon', 'Aksiyon'],
      genreIds: [16, 28],
      keywordIds: [],
      keywordNames: [],
      overviewText: 'Çizgi film kahramanı şehirde maceraya atılıyor.',
    });

    const brScore = computeVibeSimilarity('Karanlık atmosferli distopik bilim kurgu', null, bladeRunner, {});
    const animScore = computeVibeSimilarity('Karanlık atmosferli distopik bilim kurgu', null, animatedUnrelated, {});

    expect(brScore.similarityScore).toBeGreaterThan(animScore.similarityScore + 25);
    expect(animScore.similarityScore).toBeLessThan(45);
  });

  it('aranan filmin kendi serisindeki devam filmlerini (Recep İvedik, Maze Runner vb.) kesin olarak eler', () => {
    const recep1 = makeMeta({
      id: 1001,
      title: 'Recep İvedik',
      summary: {
        id: 1001,
        title: 'Recep İvedik',
        originalTitle: 'Recep İvedik',
        overview: 'Komedi filmi.',
        posterPath: '/r1.jpg',
        backdropPath: null,
        releaseDate: '2008-02-22',
        year: '2008',
        voteAverage: 6.2,
        voteCount: 500,
        genreIds: [35],
        genres: ['Komedi'],
      },
      collectionId: 5001,
      keywordIds: [101, 102],
      keywordNames: ['comedy', 'slapstick'],
    });
    const recep2 = makeMeta({
      id: 1002,
      title: 'Recep İvedik 2',
      summary: {
        id: 1002,
        title: 'Recep İvedik 2',
        originalTitle: 'Recep İvedik 2',
        overview: 'Komedi filmi.',
        posterPath: '/r2.jpg',
        backdropPath: null,
        releaseDate: '2009-02-13',
        year: '2009',
        voteAverage: 6.1,
        voteCount: 450,
        genreIds: [35],
        genres: ['Komedi'],
      },
      collectionId: null, // collectionId null olsa bile başlık kökünden yakalamalı!
      keywordIds: [101, 102],
      keywordNames: ['comedy', 'slapstick'],
    });
    const recep5 = makeMeta({
      id: 1005,
      title: 'Recep İvedik 5',
      summary: {
        id: 1005,
        title: 'Recep İvedik 5',
        originalTitle: 'Recep İvedik 5',
        overview: 'Komedi filmi.',
        posterPath: '/r5.jpg',
        backdropPath: null,
        releaseDate: '2017-02-16',
        year: '2017',
        voteAverage: 5.8,
        voteCount: 400,
        genreIds: [35],
        genres: ['Komedi'],
      },
      collectionId: 5001,
      keywordIds: [101, 102],
      keywordNames: ['comedy', 'slapstick'],
    });
    const differentComedy = makeMeta({
      id: 1099,
      title: 'Kolpaçino',
      directorNames: ['Atıl İnaç'],
      summary: {
        id: 1099,
        title: 'Kolpaçino',
        originalTitle: 'Kolpaçino',
        overview: 'Farklı bir Türk komedi filmi.',
        posterPath: '/k1.jpg',
        backdropPath: null,
        releaseDate: '2009-10-29',
        year: '2009',
        voteAverage: 6.7,
        voteCount: 300,
        genreIds: [35],
        genres: ['Komedi'],
      },
      collectionId: 9001,
      keywordIds: [101, 102],
      keywordNames: ['comedy', 'slapstick'],
    });

    expect(isSameFranchiseOrSeries(recep1, recep2)).toBe(true);
    expect(isSameFranchiseOrSeries(recep1, recep5)).toBe(true);
    expect(isSameFranchiseOrSeries(recep1, differentComedy)).toBe(false);

    const maze1 = makeMeta({
      id: 198663,
      title: 'Labirent: Ölümcül Kaçış',
      summary: {
        id: 198663,
        title: 'Labirent: Ölümcül Kaçış',
        originalTitle: 'The Maze Runner',
        overview: 'Labirentte hayatta kalma.',
        posterPath: '/m1.jpg',
        backdropPath: null,
        releaseDate: '2014-09-19',
        year: '2014',
        voteAverage: 7.2,
        voteCount: 16000,
        genreIds: [28, 878, 9648],
        genres: ['Aksiyon', 'Bilim Kurgu', 'Gizem'],
      },
      collectionId: 295130,
    });
    const maze2 = makeMeta({
      id: 294254,
      title: 'Labirent: Alev Deneyleri',
      summary: {
        id: 294254,
        title: 'Labirent: Alev Deneyleri',
        originalTitle: 'Maze Runner: The Scorch Trials',
        overview: 'Devam filmi.',
        posterPath: '/m2.jpg',
        backdropPath: null,
        releaseDate: '2015-09-18',
        year: '2015',
        voteAverage: 6.7,
        voteCount: 10000,
        genreIds: [28, 878, 53],
        genres: ['Aksiyon', 'Bilim Kurgu', 'Gerilim'],
      },
      collectionId: null, // collectionId olmasa bile "Labirent" ve "Maze Runner" kökünden yakalanmalı
    });

    expect(isSameFranchiseOrSeries(maze1, maze2)).toBe(true);

    const scored = [
      computeMovieSimilarity(recep1, recep2, { fromGemini: true, geminiSemanticScore: 95 }),
      computeMovieSimilarity(recep1, recep5, { fromGemini: true, geminiSemanticScore: 94 }),
      computeMovieSimilarity(recep1, differentComedy, { fromGemini: true, geminiSemanticScore: 78 }),
    ];
    const selected = selectDiverseRecommendations(scored, { maxCount: 6, minSimilarityScore: 48 });
    expect(selected.map((s) => s.metadata.summary.id)).toEqual([1099]);
  });
});
