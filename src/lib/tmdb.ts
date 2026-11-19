import type { CastMember, MovieDetail, MovieSummary } from '@/types';
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

interface TmdbRawMovie {
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
  videos?: {
    results?: Array<{ key: string; site: string; type: string; official?: boolean }>;
  };
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
    crew?: Array<{ job?: string; name?: string }>;
  };
  similar?: {
    results?: TmdbRawMovie[];
  };
  recommendations?: {
    results?: TmdbRawMovie[];
  };
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

export function mapTmdbSummary(raw: TmdbRawMovie): MovieSummary {
  const releaseDate = raw.release_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';
  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((g) => g.name)
    : Array.isArray(raw.genre_ids)
      ? raw.genre_ids.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean)
      : [];

  return {
    id: raw.id,
    title: raw.title || raw.original_title || 'İsimsiz Film',
    originalTitle: raw.original_title || raw.title || '',
    overview: raw.overview || 'Bu film için henüz Türkçe özet eklenmemiş.',
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    releaseDate,
    year,
    voteAverage: typeof raw.vote_average === 'number' ? Number(raw.vote_average.toFixed(1)) : 0,
    voteCount: raw.vote_count || 0,
    genreIds: raw.genre_ids,
    genres: genres.length > 0 ? genres : ['Sinema'],
    runtime: raw.runtime ?? null,
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

export async function findAndEnrichTmdbMovie(
  title: string,
  originalTitle?: string,
  year?: number
): Promise<MovieSummary | null> {
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

      let match = data.results?.[0];
      if (!match && year) {
        // Yıl ufak sapma yaptıysa yılsız tekrar ara
        const retryData = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
          '/search/movie',
          { language: 'tr-TR', query, include_adult: 'false' },
          3600
        );
        match = retryData.results?.[0];
      }

      if (match?.id) {
        const detail = await tmdbFetch<TmdbRawMovie>(
          `/movie/${match.id}`,
          {
            language: 'tr-TR',
            append_to_response: 'videos',
            include_video_language: 'tr,en,null',
          },
          3600
        );
        return mapTmdbSummary(detail);
      }
    } catch {
      // Diğer başlığı dene
    }
  }

  return null;
}

export async function getSmartTmdbRecommendations(params: {
  query: string;
  count: number;
  genreId: number | null;
  genreLabel: string | null;
}): Promise<{
  originalMovie: MovieSummary | null;
  suggestions: Array<MovieSummary & { aiReason: string }>;
}> {
  let originalMovie: MovieSummary | null = null;
  const pool: TmdbRawMovie[] = [];
  const seen = new Set<number>();

  try {
    const searchData = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
      '/search/movie',
      { language: 'tr-TR', query: params.query, include_adult: 'false' },
      900
    );
    const first = searchData.results?.[0];
    if (first?.id) {
      seen.add(first.id);
      const detail = await tmdbFetch<TmdbRawMovie>(
        `/movie/${first.id}`,
        {
          language: 'tr-TR',
          append_to_response: 'videos,recommendations,similar',
          include_video_language: 'tr,en,null',
        },
        1800
      );
      originalMovie = mapTmdbSummary(detail);
      for (const item of [
        ...(detail.recommendations?.results || []),
        ...(detail.similar?.results || []),
      ]) {
        if (item.id && !seen.has(item.id) && item.poster_path) {
          seen.add(item.id);
          pool.push(item);
        }
      }
    }
  } catch {
    // Keşfet fallback'ine geç
  }

  if (pool.length < params.count) {
    const discover = await tmdbFetch<{ results?: TmdbRawMovie[] }>(
      '/discover/movie',
      {
        language: 'tr-TR',
        sort_by: 'vote_average.desc',
        'vote_count.gte': 300,
        with_genres: params.genreId || undefined,
        include_adult: 'false',
      },
      1800
    );
    for (const item of discover.results || []) {
      if (item.id && !seen.has(item.id) && item.poster_path) {
        seen.add(item.id);
        pool.push(item);
      }
    }
  }

  let filtered = pool;
  if (params.genreId) {
    const matches = pool.filter((m) => m.genre_ids?.includes(params.genreId!));
    if (matches.length > 0) filtered = matches;
  }

  filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  const selected = filtered.slice(0, params.count);

  const enriched = await Promise.all(
    selected.map(async (item) => {
      try {
        const detail = await tmdbFetch<TmdbRawMovie>(
          `/movie/${item.id}`,
          {
            language: 'tr-TR',
            append_to_response: 'videos',
            include_video_language: 'tr,en,null',
          },
          3600
        );
        const summary = mapTmdbSummary(detail);
        const aiReason = originalMovie
          ? `"${originalMovie.title}" yapımının atmosferini, anlatım temposunu ve ${params.genreLabel || summary.genres?.[0] || 'sinematik'} tonunu sevenler için yüksek puanlı (${summary.voteAverage}/10) güçlü bir alternatif.`
          : `"${params.query}" isteğiniz ve ${params.genreLabel || summary.genres?.[0] || 'sinema'} tercihlerinizle örtüşen, izleyici beğenisi yüksek bir yapım.`;
        return { ...summary, aiReason };
      } catch {
        return null;
      }
    })
  );

  return {
    originalMovie,
    suggestions: enriched.filter((x): x is MovieSummary & { aiReason: string } => x !== null),
  };
}
