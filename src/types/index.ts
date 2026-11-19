export interface MovieSummary {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  year: string;
  voteAverage: number;
  voteCount: number;
  genreIds?: number[];
  genres?: string[];
  runtime?: number | null;
  trailerKey?: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MovieDetail extends MovieSummary {
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  imdbId: string | null;
  director: string | null;
  cast: CastMember[];
  similar: MovieSummary[];
  genres: string[];
}

export interface CineBotRecommendation extends MovieSummary {
  aiReason: string;
}

export interface CineBotResponse {
  query: string;
  mode: 'movie' | 'vibe';
  engine: 'gemini' | 'tmdb_smart';
  originalMovie: MovieSummary | null;
  suggestions: CineBotRecommendation[];
  count: number;
}

export interface CineBotHistoryItem {
  id: string;
  query: string;
  mode: 'movie' | 'vibe';
  genre: string;
  engine: 'gemini' | 'tmdb_smart';
  suggestions: Array<{
    id: number;
    title: string;
    posterPath: string | null;
    year: string;
    voteAverage: number;
    aiReason: string;
  }>;
  createdAt: string;
}

export interface ForumEntry {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  authorImage: string;
  imageUrl: string | null;
  movieId?: number | null;
  movieTitle?: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ForumComment {
  id: string;
  author: string;
  authorId: string;
  authorImage: string;
  content: string;
  parentId: string | null;
  likesCount: number;
  createdAt: string;
}

export interface SavedMovie {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  year: string;
  addedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  photoURL: string;
  emailVerified: boolean;
  createdAt?: string;
}
