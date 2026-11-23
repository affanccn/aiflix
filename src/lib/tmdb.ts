import type { CastMember, MediaFilter, MovieDetail, MovieSummary } from '@/types';
import { GENRE_ID_TO_NAME } from '@/lib/genres';
import { isValidYouTubeKey } from '@/lib/security';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getTmdbCredentials() {
  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  const accessToken = process.env.TMDB_ACCESS_TOKEN?.trim() || '';
  return { apiKey, accessToken };
}

export function isTmdbConfigured(): boolean {
  const { apiKey, accessToken } = getTmdbCredentials();
  return Boolean(apiKey || accessToken);
}

export interface TmdbRawMovie {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  runtime?: number | null;
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string | null;
  original_language?: string;
  belongs_to_collection?: { id: number; name: string } | null;
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
  };
  videos?: {
    results?: Array<{ key: string; site: string; type: string; official?: boolean }>;
  };
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
    crew?: Array<{ id?: number; job?: string; name?: string }>;
  };
  similar?: {
    results?: TmdbRawMovie[];
  };
  recommendations?: {
    results?: TmdbRawMovie[];
  };
}

export interface RichMovieMetadata {
  summary: MovieSummary;
  imdbId: string | null;
  tagline: string;
  overviewText: string;
  originalLanguage: string;
  yearNum: number | null;
  genreIds: number[];
  genres: string[];
  directorIds: number[];
  directorNames: string[];
  writerNames: string[];
  castIds: number[];
  castNames: string[];
  keywordIds: number[];
  keywordNames: string[];
  collectionId: number | null;
  collectionName: string | null;
  recommendedIds: number[];
  similarIds: number[];
  relatedPool: TmdbRawMovie[];
}

function pickBestTrailerKey(
  videos?: Array<{ key: string; site: string; type: string; official?: boolean }>
): string | null {
  if (!Array.isArray(videos) || videos.length === 0) return null;
  const yt = videos.filter((v) => v.site === 'YouTube' && isValidYouTubeKey(v.key));
  if (yt.length === 0) return null;
  const officialTrailer = yt.find((v) => v.type === 'Trailer' && v.official);
  const trailer = yt.find((v) => v.type === 'Trailer');
  const teaser = yt.find((v) => v.type === 'Teaser');
  return (officialTrailer || trailer || teaser || yt[0])?.key ?? null;
}

export interface TmdbRawTv {
  id: number;
  media_type?: 'tv' | 'movie' | 'person';
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  episode_run_time?: number[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  tagline?: string;
  status?: string;
  original_language?: string;
  created_by?: Array<{ id?: number; name?: string }>;
  external_ids?: { imdb_id?: string | null };
  keywords?: {
    results?: Array<{ id: number; name: string }>;
  };
  videos?: {
    results?: Array<{ key: string; site: string; type: string; official?: boolean }>;
  };
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
    crew?: Array<{ id?: number; job?: string; name?: string }>;
  };
  similar?: {
    results?: TmdbRawTv[];
  };
  recommendations?: {
    results?: TmdbRawTv[];
  };
}

export function mapTmdbSummary(raw: TmdbRawMovie): MovieSummary {
  const releaseDate = raw.release_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';
  const genreIds = Array.isArray(raw.genre_ids)
    ? raw.genre_ids
    : Array.isArray(raw.genres)
      ? raw.genres.map((g) => g.id)
      : [];
  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((g) => g.name)
    : genreIds.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean);

  return {
    id: raw.id,
    mediaType: 'movie',
    title: raw.title || raw.original_title || 'İsimsiz Film',
    originalTitle: raw.original_title || raw.title || '',
    overview: raw.overview || 'Bu film için henüz Türkçe özet eklenmemiş.',
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    releaseDate,
    year,
    voteAverage: typeof raw.vote_average === 'number' ? Number(raw.vote_average.toFixed(1)) : 0,
    voteCount: raw.vote_count || 0,
    genreIds,
    genres: genres.length > 0 ? genres : ['Sinema'],
    runtime: raw.runtime ?? null,
    trailerKey: pickBestTrailerKey(raw.videos?.results),
  };
}

export function mapTmdbTvSummary(raw: TmdbRawTv): MovieSummary {
  const releaseDate = raw.first_air_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';
  const genreIds = Array.isArray(raw.genre_ids)
    ? raw.genre_ids
    : Array.isArray(raw.genres)
      ? raw.genres.map((g) => g.id)
      : [];
  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((g) => g.name)
    : genreIds.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean);

  const avgRuntime =
    Array.isArray(raw.episode_run_time) && raw.episode_run_time.length > 0
      ? raw.episode_run_time[0]
      : null;

  return {
    id: raw.id,
    mediaType: 'tv',
    title: raw.name || raw.original_name || 'İsimsiz Dizi',
    originalTitle: raw.original_name || raw.name || '',
    overview: raw.overview || 'Bu dizi için henüz Türkçe özet eklenmemiş.',
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    releaseDate,
    year,
    voteAverage: typeof raw.vote_average === 'number' ? Number(raw.vote_average.toFixed(1)) : 0,
    voteCount: raw.vote_count || 0,
    genreIds,
    genres: genres.length > 0 ? genres : ['Dizi'],
    runtime: avgRuntime,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    trailerKey: pickBestTrailerKey(raw.videos?.results),
  };
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  revalidateSeconds = 1800
): Promise<T> {
  const { apiKey, accessToken } = getTmdbCredentials();
  if (!apiKey && !accessToken) {
    throw new Error('TMDB_NOT_CONFIGURED');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  if (apiKey && !accessToken) {
    url.searchParams.set('api_key', apiKey);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'AiFlix/2.0',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`TMDB_HTTP_${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getTrendingMovies(limit = 10): Promise<MovieSummary[]> {
  const data = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
    '/trending/movie/week',
    { language: 'tr-TR', page: 1 },
    3600
  );
  return (data.results || [])
    .filter((m) => m.id && m.poster_path)
    .slice(0, limit)
    .map(mapTmdbSummary);
}

export async function searchTmdbMovies(options: {
  query?: string;
  genreId?: number | null;
  year?: number | null;
  page?: number;
}): Promise<{ results: MovieSummary[]; totalPages: number; totalResults: number; page: number }> {
  const page = Math.min(Math.max(options.page || 1, 1), 20);
  const query = options.query?.trim() || '';

  if (query) {
    const data = await tmdbFetch<{
      results?: TmdbRawMovie[];
      total_pages?: number;
      total_results?: number;
    }>(
      '/search/movie',
      {
        language: 'tr-TR',
        query,
        include_adult: 'false',
        primary_release_year: options.year || undefined,
        page,
      },
      900
    );

    let list = (data.results || []).map(mapTmdbSummary);
    if (options.genreId) {
      list = list.filter((m) => m.genreIds?.includes(options.genreId!));
    }

    return {
      results: list,
      totalPages: Math.min(data.total_pages || 1, 20),
      totalResults: options.genreId ? list.length : data.total_results || list.length,
      page,
    };
  }

  // Sorgu yoksa filtreye göre keşfet
  const data = await tmdbFetch<{
    results?: TmdbRawMovie[];
    total_pages?: number;
    total_results?: number;
  }>(
    '/discover/movie',
    {
      language: 'tr-TR',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_genres: options.genreId || undefined,
      primary_release_year: options.year || undefined,
      'vote_count.gte': 50,
      page,
    },
    1800
  );

  return {
    results: (data.results || []).map(mapTmdbSummary),
    totalPages: Math.min(data.total_pages || 1, 20),
    totalResults: data.total_results || 0,
    page,
  };
}

export async function getMovieDetailById(movieId: number): Promise<MovieDetail | null> {
  if (!Number.isInteger(movieId) || movieId <= 0) return null;

  try {
    const raw = await tmdbFetch<TmdbRawMovie>(
      `/movie/${movieId}`,
      {
        language: 'tr-TR',
        append_to_response: 'credits,videos,similar,recommendations',
        include_video_language: 'tr,en,null',
      },
      3600
    );

    let overview = raw.overview?.trim() || '';
    if (!overview) {
      try {
        const enRaw = await tmdbFetch<TmdbRawMovie>(
          `/movie/${movieId}`,
          { language: 'en-US' },
          3600
        );
        overview = enRaw.overview?.trim() || 'Bu film için henüz özet eklenmemiş.';
      } catch {
        overview = 'Bu film için henüz özet eklenmemiş.';
      }
    }

    const director =
      raw.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null;

    const cast: CastMember[] = (raw.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profilePath: c.profile_path || null,
    }));

    const similarPool = [
      ...(raw.recommendations?.results || []),
      ...(raw.similar?.results || []),
    ];
    const seen = new Set<number>([movieId]);
    const similar: MovieSummary[] = [];
    for (const item of similarPool) {
      if (!item.id || seen.has(item.id) || !item.poster_path) continue;
      seen.add(item.id);
      similar.push(mapTmdbSummary(item));
      if (similar.length >= 10) break;
    }

    const base = mapTmdbSummary({ ...raw, overview });

    return {
      ...base,
      tagline: raw.tagline || '',
      status: raw.status || '',
      budget: raw.budget || 0,
      revenue: raw.revenue || 0,
      imdbId: raw.imdb_id || null,
      director,
      cast,
      similar,
      genres: (raw.genres || []).map((g) => g.name),
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'TMDB_HTTP_404') {
      return null;
    }
    throw err;
  }
}

function normalizeMatchTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickBestSearchMatch(
  results: TmdbRawMovie[],
  targetTitle: string,
  targetOriginalTitle?: string,
  targetYear?: number
): TmdbRawMovie | null {
  if (!results.length) return null;
  const targets = [targetOriginalTitle, targetTitle]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map(normalizeMatchTitle);

  let best: TmdbRawMovie | null = null;
  let bestScore = -Infinity;

  for (const item of results.slice(0, 10)) {
    if (!item.id) continue;
    const itemTitles = [item.title, item.original_title]
      .filter((v): v is string => Boolean(v))
      .map(normalizeMatchTitle);

    let score = 0;
    for (const t of targets) {
      if (itemTitles.some((it) => it === t)) {
        score = Math.max(score, 100);
      } else if (itemTitles.some((it) => it.includes(t) || t.includes(it))) {
        score = Math.max(score, 65);
      }
    }

    const itemYear = item.release_date ? Number(item.release_date.slice(0, 4)) : null;
    if (targetYear && itemYear) {
      const diff = Math.abs(targetYear - itemYear);
      if (diff === 0) score += 35;
      else if (diff === 1) score += 20;
      else if (diff <= 3) score += 5;
      else score -= 25;
    }

    // Popülerlik/oy sayısı belgesel/kısa film yerine gerçek sinema filmini seçmeye yardımcı olur
    const votes = item.vote_count || 0;
    score += Math.min(25, Math.log10(votes + 1) * 7);
    if (item.poster_path) score += 8;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

export async function getRichMovieMetadata(
  movieId: number,
  includeRelated = false
): Promise<RichMovieMetadata | null> {
  if (!Number.isInteger(movieId) || movieId <= 0) return null;

  try {
    const appendFields = includeRelated
      ? 'credits,keywords,videos,recommendations,similar'
      : 'credits,keywords,videos';

    const raw = await tmdbFetch<TmdbRawMovie>(
      `/movie/${movieId}`,
      {
        language: 'tr-TR',
        append_to_response: appendFields,
        include_video_language: 'tr,en,null',
      },
      3600
    );

    let overviewText = raw.overview?.trim() || '';
    if (!overviewText) {
      try {
        const enRaw = await tmdbFetch<TmdbRawMovie>(
          `/movie/${movieId}`,
          { language: 'en-US' },
          3600
        );
        overviewText = enRaw.overview?.trim() || '';
      } catch {
        // Fallback overview boş kalabilir
      }
    }

    const summary = mapTmdbSummary({
      ...raw,
      overview: overviewText || 'Bu film için henüz Türkçe özet eklenmemiş.',
    });

    const directors = (raw.credits?.crew || []).filter((c) => c.job === 'Director' && c.name);
    const writers = (raw.credits?.crew || []).filter(
      (c) => (c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story') && c.name
    );
    const topCast = (raw.credits?.cast || []).slice(0, 8);
    const kwList = raw.keywords?.keywords || [];

    const recommendedList = raw.recommendations?.results || [];
    const similarList = raw.similar?.results || [];
    const relatedPool: TmdbRawMovie[] = [];
    const seen = new Set<number>([movieId]);
    for (const item of [...recommendedList, ...similarList]) {
      if (item.id && !seen.has(item.id) && item.poster_path) {
        seen.add(item.id);
        relatedPool.push(item);
      }
    }

    const yearNum = summary.year ? Number(summary.year) : null;

    return {
      summary,
      imdbId: raw.imdb_id || null,
      tagline: raw.tagline?.trim() || '',
      overviewText,
      originalLanguage: raw.original_language || '',
      yearNum: yearNum && Number.isFinite(yearNum) ? yearNum : null,
      genreIds: summary.genreIds || [],
      genres: summary.genres || [],
      directorIds: directors.map((d) => d.id).filter((id): id is number => typeof id === 'number'),
      directorNames: Array.from(new Set(directors.map((d) => d.name!).filter(Boolean))),
      writerNames: Array.from(new Set(writers.map((w) => w.name!).filter(Boolean))),
      castIds: topCast.map((c) => c.id),
      castNames: topCast.map((c) => c.name),
      keywordIds: kwList.map((k) => k.id),
      keywordNames: kwList.map((k) => k.name.toLowerCase()),
      collectionId: raw.belongs_to_collection?.id ?? null,
      collectionName: raw.belongs_to_collection?.name ?? null,
      recommendedIds: recommendedList.map((m) => m.id).filter(Boolean),
      similarIds: similarList.map((m) => m.id).filter(Boolean),
      relatedPool,
    };
  } catch {
    return null;
  }
}

export async function findRichTmdbMovie(
  title: string,
  originalTitle?: string,
  year?: number,
  includeRelated = false
): Promise<RichMovieMetadata | null> {
  const candidatesToTry = Array.from(
    new Set([originalTitle?.trim(), title.trim()].filter((v): v is string => Boolean(v)))
  );

  for (const query of candidatesToTry) {
    try {
      const data = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
        '/search/movie',
        {
          language: 'tr-TR',
          query,
          year: year && year >= 1900 && year <= 2035 ? year : undefined,
          include_adult: 'false',
        },
        3600
      );

      let match = pickBestSearchMatch(data.results || [], title, originalTitle, year);
      if (!match && year) {
        const retryData = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
          '/search/movie',
          { language: 'tr-TR', query, include_adult: 'false' },
          3600
        );
        match = pickBestSearchMatch(retryData.results || [], title, originalTitle, year);
      }

      if (match?.id) {
        return getRichMovieMetadata(match.id, includeRelated);
      }
    } catch {
      // Diğer başlığı dene
    }
  }

  return null;
}

const GENERIC_NON_THEMATIC_KEYWORDS = new Set([
  'mission',
  'kidnapping',
  'based on novel or book',
  'based on comic',
  'based on true story',
  'aftercreditsstinger',
  'duringcreditsstinger',
  'woman director',
  'sequel',
  'remake',
  'reboot',
  '3d',
  'imax',
  'blockbuster',
  'los angeles, california',
  'new york city',
  'paris, france',
  'london, england',
]);

export function getSpecificKeywordIds(meta: RichMovieMetadata, limit = 6): number[] {
  const specific: number[] = [];
  for (let i = 0; i < meta.keywordIds.length; i++) {
    const name = (meta.keywordNames[i] || '').toLowerCase().trim();
    if (!GENERIC_NON_THEMATIC_KEYWORDS.has(name)) {
      specific.push(meta.keywordIds[i]);
    }
    if (specific.length >= limit) break;
  }
  return specific.length > 0 ? specific : meta.keywordIds.slice(0, limit);
}

export async function discoverMoviesBySignals(params: {
  keywordIds?: number[];
  genreIds?: number[];
  anyGenreIds?: number[];
  withoutGenreIds?: number[];
  sortBy?: 'popularity.desc' | 'vote_count.desc' | 'vote_average.desc';
  minVoteCount?: number;
  minVoteAverage?: number;
  page?: number;
}): Promise<TmdbRawMovie[]> {
  try {
    const withGenres =
      params.genreIds && params.genreIds.length > 0
        ? params.genreIds.slice(0, 3).join(',')
        : params.anyGenreIds && params.anyGenreIds.length > 0
          ? params.anyGenreIds.slice(0, 3).join('|')
          : undefined;

    const data = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
      '/discover/movie',
      {
        language: 'tr-TR',
        sort_by: params.sortBy ?? 'vote_count.desc',
        include_adult: 'false',
        with_keywords:
          params.keywordIds && params.keywordIds.length > 0
            ? params.keywordIds.slice(0, 6).join('|')
            : undefined,
        with_genres: withGenres,
        without_genres:
          params.withoutGenreIds && params.withoutGenreIds.length > 0
            ? params.withoutGenreIds.join(',')
            : undefined,
        'vote_count.gte': params.minVoteCount ?? 250,
        'vote_average.gte': params.minVoteAverage ?? 6.3,
        page: params.page ?? 1,
      },
      1800
    );
    return (data.results || []).filter((m) => Boolean(m.id && m.poster_path));
  } catch {
    return [];
  }
}

export async function findAndEnrichTmdbMovie(
  title: string,
  originalTitle?: string,
  year?: number
): Promise<MovieSummary | null> {
  const rich = await findRichTmdbMovie(title, originalTitle, year, false);
  return rich ? rich.summary : null;
}

// =============================================================================
// TV Series (Dizi) & Multi-Media Support
// =============================================================================

export async function getTrendingTvShows(limit = 10): Promise<MovieSummary[]> {
  const data = await tmdbFetch<{ results?: TmdbRawTv[] }>(
    '/trending/tv/week',
    { language: 'tr-TR', page: 1 },
    3600
  );
  return (data.results || [])
    .filter((t) => t.id && t.poster_path)
    .slice(0, limit)
    .map(mapTmdbTvSummary);
}

export async function searchTmdbTvShows(options: {
  query?: string;
  genreId?: number | null;
  year?: number | null;
  page?: number;
}): Promise<{ results: MovieSummary[]; totalPages: number; totalResults: number; page: number }> {
  const page = Math.min(Math.max(options.page || 1, 1), 20);
  const query = options.query?.trim() || '';

  if (query) {
    const data = await tmdbFetch<{
      results?: TmdbRawTv[];
      total_pages?: number;
      total_results?: number;
    }>(
      '/search/tv',
      {
        language: 'tr-TR',
        query,
        include_adult: 'false',
        first_air_date_year: options.year || undefined,
        page,
      },
      900
    );

    let list = (data.results || []).map(mapTmdbTvSummary);
    if (options.genreId) {
      list = list.filter((m) => m.genreIds?.includes(options.genreId!));
    }

    return {
      results: list,
      totalPages: Math.min(data.total_pages || 1, 20),
      totalResults: options.genreId ? list.length : data.total_results || list.length,
      page,
    };
  }

  const data = await tmdbFetch<{
    results?: TmdbRawTv[];
    total_pages?: number;
    total_results?: number;
  }>(
    '/discover/tv',
    {
      language: 'tr-TR',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_genres: options.genreId || undefined,
      first_air_date_year: options.year || undefined,
      'vote_count.gte': 40,
      page,
    },
    1800
  );

  return {
    results: (data.results || []).map(mapTmdbTvSummary),
    totalPages: Math.min(data.total_pages || 1, 20),
    totalResults: data.total_results || 0,
    page,
  };
}

export async function searchTmdbMedia(options: {
  query?: string;
  mediaType?: MediaFilter;
  genreId?: number | null;
  tvGenreId?: number | null;
  year?: number | null;
  page?: number;
}): Promise<{ results: MovieSummary[]; totalPages: number; totalResults: number; page: number }> {
  const mediaType = options.mediaType || 'all';
  if (mediaType === 'movie') {
    return searchTmdbMovies({
      query: options.query,
      genreId: options.genreId,
      year: options.year,
      page: options.page,
    });
  }
  if (mediaType === 'tv') {
    return searchTmdbTvShows({
      query: options.query,
      genreId: options.tvGenreId ?? options.genreId,
      year: options.year,
      page: options.page,
    });
  }

  // 'all' -> Hem film hem dizi sonuçlarını birleştir (popülerliğe/puan sırasına göre dengeli)
  const [movieRes, tvRes] = await Promise.all([
    searchTmdbMovies({
      query: options.query,
      genreId: options.genreId,
      year: options.year,
      page: options.page,
    }),
    searchTmdbTvShows({
      query: options.query,
      genreId: options.tvGenreId ?? options.genreId,
      year: options.year,
      page: options.page,
    }),
  ]);

  const combined: MovieSummary[] = [];
  const maxLen = Math.max(movieRes.results.length, tvRes.results.length);
  for (let i = 0; i < maxLen && combined.length < 20; i++) {
    if (movieRes.results[i]) combined.push(movieRes.results[i]);
    if (tvRes.results[i] && combined.length < 20) combined.push(tvRes.results[i]);
  }

  return {
    results: combined,
    totalPages: Math.min(Math.max(movieRes.totalPages, tvRes.totalPages), 20),
    totalResults: movieRes.totalResults + tvRes.totalResults,
    page: options.page || 1,
  };
}

export async function getTvDetailById(tvId: number): Promise<MovieDetail | null> {
  if (!Number.isInteger(tvId) || tvId <= 0) return null;

  try {
    const raw = await tmdbFetch<TmdbRawTv>(
      `/tv/${tvId}`,
      {
        language: 'tr-TR',
        append_to_response: 'credits,videos,similar,recommendations,external_ids',
        include_video_language: 'tr,en,null',
      },
      3600
    );

    let overview = raw.overview?.trim() || '';
    if (!overview) {
      try {
        const enRaw = await tmdbFetch<TmdbRawTv>(`/tv/${tvId}`, { language: 'en-US' }, 3600);
        overview = enRaw.overview?.trim() || 'Bu dizi için henüz özet eklenmemiş.';
      } catch {
        overview = 'Bu dizi için henüz özet eklenmemiş.';
      }
    }

    const creator =
      raw.created_by?.[0]?.name ??
      raw.credits?.crew?.find((c) => c.job === 'Executive Producer' || c.job === 'Director')
        ?.name ??
      null;

    const cast: CastMember[] = (raw.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profilePath: c.profile_path || null,
    }));

    const similarPool = [
      ...(raw.recommendations?.results || []),
      ...(raw.similar?.results || []),
    ];
    const seen = new Set<number>([tvId]);
    const similar: MovieSummary[] = [];
    for (const item of similarPool) {
      if (!item.id || seen.has(item.id) || !item.poster_path) continue;
      seen.add(item.id);
      similar.push(mapTmdbTvSummary(item));
      if (similar.length >= 10) break;
    }

    const base = mapTmdbTvSummary({ ...raw, overview });

    return {
      ...base,
      tagline: raw.tagline || '',
      status: raw.status || '',
      budget: 0,
      revenue: 0,
      imdbId: raw.external_ids?.imdb_id || null,
      director: creator,
      cast,
      similar,
      genres: (raw.genres || []).map((g) => g.name),
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'TMDB_HTTP_404') {
      return null;
    }
    throw err;
  }
}

export async function getRichTvMetadata(
  tvId: number,
  includeRelated = false
): Promise<RichMovieMetadata | null> {
  if (!Number.isInteger(tvId) || tvId <= 0) return null;

  try {
    const appendFields = includeRelated
      ? 'credits,keywords,videos,recommendations,similar,external_ids'
      : 'credits,keywords,videos,external_ids';

    const raw = await tmdbFetch<TmdbRawTv>(
      `/tv/${tvId}`,
      {
        language: 'tr-TR',
        append_to_response: appendFields,
        include_video_language: 'tr,en,null',
      },
      3600
    );

    let overviewText = raw.overview?.trim() || '';
    if (!overviewText) {
      try {
        const enRaw = await tmdbFetch<TmdbRawTv>(`/tv/${tvId}`, { language: 'en-US' }, 3600);
        overviewText = enRaw.overview?.trim() || '';
      } catch {
        // Fallback overview boş kalabilir
      }
    }

    const summary = mapTmdbTvSummary({
      ...raw,
      overview: overviewText || 'Bu dizi için henüz Türkçe özet eklenmemiş.',
    });

    const creators = (raw.created_by || []).filter((c) => c.name);
    const directors =
      creators.length > 0
        ? creators
        : (raw.credits?.crew || []).filter(
            (c) => (c.job === 'Director' || c.job === 'Executive Producer') && c.name
          );
    const writers = (raw.credits?.crew || []).filter(
      (c) => (c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story') && c.name
    );
    const topCast = (raw.credits?.cast || []).slice(0, 8);
    const kwList = raw.keywords?.results || [];

    const recommendedList = raw.recommendations?.results || [];
    const similarList = raw.similar?.results || [];
    const yearNum = summary.year ? Number(summary.year) : null;

    return {
      summary,
      imdbId: raw.external_ids?.imdb_id || null,
      tagline: raw.tagline?.trim() || '',
      overviewText,
      originalLanguage: raw.original_language || '',
      yearNum: yearNum && Number.isFinite(yearNum) ? yearNum : null,
      genreIds: summary.genreIds || [],
      genres: summary.genres || [],
      directorIds: directors.map((d) => d.id).filter((id): id is number => typeof id === 'number'),
      directorNames: Array.from(new Set(directors.map((d) => d.name!).filter(Boolean))),
      writerNames: Array.from(new Set(writers.map((w) => w.name!).filter(Boolean))),
      castIds: topCast.map((c) => c.id),
      castNames: topCast.map((c) => c.name),
      keywordIds: kwList.map((k) => k.id),
      keywordNames: kwList.map((k) => k.name.toLowerCase()),
      collectionId: null,
      collectionName: null,
      recommendedIds: recommendedList.map((m) => m.id).filter(Boolean),
      similarIds: similarList.map((m) => m.id).filter(Boolean),
      relatedPool: [],
    };
  } catch {
    return null;
  }
}

function pickBestTvMatch(
  results: TmdbRawTv[],
  targetTitle: string,
  targetOriginalTitle?: string,
  targetYear?: number
): TmdbRawTv | null {
  if (!results.length) return null;
  const targets = [targetOriginalTitle, targetTitle]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map(normalizeMatchTitle);

  let best: TmdbRawTv | null = null;
  let bestScore = -Infinity;

  for (const item of results.slice(0, 10)) {
    if (!item.id) continue;
    const itemTitles = [item.name, item.original_name]
      .filter((v): v is string => Boolean(v))
      .map(normalizeMatchTitle);

    let score = 0;
    for (const t of targets) {
      if (itemTitles.some((it) => it === t)) {
        score = Math.max(score, 100);
      } else if (itemTitles.some((it) => it.includes(t) || t.includes(it))) {
        score = Math.max(score, 65);
      }
    }

    const itemYear = item.first_air_date ? Number(item.first_air_date.slice(0, 4)) : null;
    if (targetYear && itemYear) {
      const diff = Math.abs(targetYear - itemYear);
      if (diff === 0) score += 35;
      else if (diff === 1) score += 20;
      else if (diff <= 3) score += 5;
      else score -= 25;
    }

    const votes = item.vote_count || 0;
    score += Math.min(25, Math.log10(votes + 1) * 7);
    if (item.poster_path) score += 8;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

export async function findRichTmdbTv(
  title: string,
  originalTitle?: string,
  year?: number,
  includeRelated = false
): Promise<RichMovieMetadata | null> {
  const candidatesToTry = Array.from(
    new Set([originalTitle?.trim(), title.trim()].filter((v): v is string => Boolean(v)))
  );

  for (const query of candidatesToTry) {
    try {
      const data = await tmdbFetch<{ results?: TmdbRawTv[] }>(
        '/search/tv',
        {
          language: 'tr-TR',
          query,
          first_air_date_year: year && year >= 1900 && year <= 2035 ? year : undefined,
          include_adult: 'false',
        },
        3600
      );

      let match = pickBestTvMatch(data.results || [], title, originalTitle, year);
      if (!match && year) {
        const retryData = await tmdbFetch<{ results?: TmdbRawTv[] }>(
          '/search/tv',
          { language: 'tr-TR', query, include_adult: 'false' },
          3600
        );
        match = pickBestTvMatch(retryData.results || [], title, originalTitle, year);
      }

      if (match?.id) {
        return getRichTvMetadata(match.id, includeRelated);
      }
    } catch {
      // Diğer başlığı dene
    }
  }

  return null;
}

export async function findRichTmdbMedia(
  title: string,
  originalTitle?: string,
  year?: number,
  preferredType: MediaFilter = 'all',
  includeRelated = false
): Promise<RichMovieMetadata | null> {
  if (preferredType === 'movie') {
    return findRichTmdbMovie(title, originalTitle, year, includeRelated);
  }
  if (preferredType === 'tv') {
    return findRichTmdbTv(title, originalTitle, year, includeRelated);
  }

  // 'all' -> İkisini de ara, oy sayısı ve başlık eşleşmesine göre daha güçlü olanı seç
  const [movieMeta, tvMeta] = await Promise.all([
    findRichTmdbMovie(title, originalTitle, year, includeRelated),
    findRichTmdbTv(title, originalTitle, year, includeRelated),
  ]);

  if (movieMeta && !tvMeta) return movieMeta;
  if (tvMeta && !movieMeta) return tvMeta;
  if (!movieMeta && !tvMeta) return null;

  const targetNorm = normalizeMatchTitle(originalTitle || title);
  const movieExact =
    normalizeMatchTitle(movieMeta!.summary.title) === targetNorm ||
    normalizeMatchTitle(movieMeta!.summary.originalTitle) === targetNorm;
  const tvExact =
    normalizeMatchTitle(tvMeta!.summary.title) === targetNorm ||
    normalizeMatchTitle(tvMeta!.summary.originalTitle) === targetNorm;

  if (tvExact && !movieExact) return tvMeta;
  if (movieExact && !tvExact) return movieMeta;

  return (tvMeta!.summary.voteCount || 0) > (movieMeta!.summary.voteCount || 0)
    ? tvMeta
    : movieMeta;
}

export async function discoverTvBySignals(params: {
  keywordIds?: number[];
  genreIds?: number[];
  anyGenreIds?: number[];
  withoutGenreIds?: number[];
  sortBy?: 'popularity.desc' | 'vote_count.desc' | 'vote_average.desc';
  minVoteCount?: number;
  minVoteAverage?: number;
  page?: number;
}): Promise<TmdbRawTv[]> {
  try {
    const withGenres =
      params.genreIds && params.genreIds.length > 0
        ? params.genreIds.slice(0, 3).join(',')
        : params.anyGenreIds && params.anyGenreIds.length > 0
          ? params.anyGenreIds.slice(0, 3).join('|')
          : undefined;

    const data = await tmdbFetch<{ results?: TmdbRawTv[] }>(
      '/discover/tv',
      {
        language: 'tr-TR',
        sort_by: params.sortBy ?? 'vote_count.desc',
        include_adult: 'false',
        with_keywords:
          params.keywordIds && params.keywordIds.length > 0
            ? params.keywordIds.slice(0, 6).join('|')
            : undefined,
        with_genres: withGenres,
        without_genres:
          params.withoutGenreIds && params.withoutGenreIds.length > 0
            ? params.withoutGenreIds.join(',')
            : undefined,
        'vote_count.gte': params.minVoteCount ?? 150,
        'vote_average.gte': params.minVoteAverage ?? 6.5,
        page: params.page ?? 1,
      },
      1800
    );
    return (data.results || []).filter((t) => Boolean(t.id && t.poster_path));
  } catch {
    return [];
  }
}
