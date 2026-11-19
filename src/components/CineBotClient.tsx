'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Clapperboard,
  Wand2,
  Star,
  Play,
  Heart,
  Bookmark,
  MessageSquare,
  Share2,
  History,
  Lightbulb,
  RotateCcw,
  Film,
  Cpu,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { TrailerModal } from '@/components/TrailerModal';
import { GENRE_OPTIONS } from '@/lib/genres';
import { getTmdbImageUrl } from '@/lib/security';
import {
  fetchCineBotHistory,
  fetchSavedMovies,
  saveCineBotHistory,
  toggleSavedMovie,
} from '@/lib/firestore-service';
import type { CineBotHistoryItem, CineBotRecommendation, CineBotResponse } from '@/types';

const INSPIRATION_TAGS = [
  { label: 'Ters Köşe Gerilim', query: 'Ters köşe yapan zihin bükücü gerilim filmleri', genre: 'thriller' },
  { label: 'Uzay Gizemi', query: 'Derin uzayda geçen yalnızlık ve gizem temalı', genre: 'sci-fi' },
  { label: 'Sıcak Nostalji', query: 'Yağmurlu bir pazar günü izlenecek sıcacık nostaljik', genre: 'drama' },
  { label: 'Cyberpunk & Gelecek', query: 'Cyberpunk atmosferli distopik aksiyon', genre: 'action' },
  { label: 'Karanlık Polisiye', query: 'Karanlık dedektif ve seri katil kovalamacası', genre: 'crime' },
  { label: 'Keyifli Yolculuk', query: 'İçinizi ısıtacak keyifli yol hikayesi', genre: 'comedy' },
];

export function CineBotClient() {
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'movie' | 'vibe'>(
    searchParams.get('mode') === 'vibe' ? 'vibe' : 'movie'
  );
  const [query, setQuery] = useState(searchParams.get('movie') || searchParams.get('q') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'all');
  const [count, setCount] = useState(6);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CineBotResponse | null>(null);

  const [history, setHistory] = useState<CineBotHistoryItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [activeTrailer, setActiveTrailer] = useState<{ key: string; title: string } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setFavoriteIds(new Set());
      setWatchlistIds(new Set());
      return;
    }

    let cancelled = false;
    Promise.all([
      fetchCineBotHistory(user.uid).catch(() => []),
      fetchSavedMovies(user.uid, 'favorites').catch(() => []),
      fetchSavedMovies(user.uid, 'watchlist').catch(() => []),
    ]).then(([hist, favs, watch]) => {
      if (cancelled) return;
      setHistory(hist);
      setFavoriteIds(new Set(favs.map((m) => m.id)));
      setWatchlistIds(new Set(watch.map((m) => m.id)));
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const runSearch = useCallback(
    async (opts: { q: string; m: 'movie' | 'vibe'; g: string; c: number }) => {
      const cleanQ = opts.q.trim();
      if (cleanQ.length < 2) {
        showToast(
          opts.m === 'movie'
            ? 'Lütfen en az 2 karakterlik bir film adı yazın.'
            : 'Lütfen istediğiniz temayı veya ruh halinizi biraz daha açıklayın.',
          'info'
        );
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        const res = await fetch('/api/cinebot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            query: cleanQ,
            mode: opts.m,
            genre: opts.g,
            count: opts.c,
          }),
        });

        const data = (await res.json()) as CineBotResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Öneriler alınamadı.');
        }

        setResult(data);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);

        if (user && data.suggestions.length > 0) {
          const compactSuggestions = data.suggestions.map((s) => ({
            id: s.id,
            title: s.title,
            posterPath: s.posterPath,
            year: s.year,
            voteAverage: s.voteAverage,
            aiReason: s.aiReason,
          }));
          saveCineBotHistory(user.uid, {
            query: cleanQ,
            mode: opts.m,
            genre: opts.g,
            engine: data.engine,
            suggestions: compactSuggestions,
          })
            .then(() => fetchCineBotHistory(user.uid))
            .then(setHistory)
            .catch(() => {});
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Öneriler alınırken bir hata oluştu.';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    },
    [getIdToken, showToast, user]
  );

  useEffect(() => {
    const paramMovie = searchParams.get('movie') || searchParams.get('q');
    const paramMode = searchParams.get('mode') === 'vibe' ? 'vibe' : 'movie';
    const paramGenre = searchParams.get('genre') || 'all';

    if (paramMovie && !autoRanRef.current) {
      autoRanRef.current = true;
      setQuery(paramMovie);
      setMode(paramMode);
      setGenre(paramGenre);
      runSearch({ q: paramMovie, m: paramMode, g: paramGenre, c: count });
    }
  }, [searchParams, count, runSearch]);

  const handleToggleList = async (
    movie: CineBotRecommendation,
    listType: 'favorites' | 'watchlist'
  ) => {
    if (!user) {
      showToast('Favori ve izleme listesi için giriş yapmalısınız.', 'info');
      return;
    }
    try {
      const added = await toggleSavedMovie(user.uid, listType, {
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        year: movie.year,
      });

      if (listType === 'favorites') {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (added) next.add(movie.id);
          else next.delete(movie.id);
          return next;
        });
        showToast(
          added ? `"${movie.title}" favorilerinize eklendi.` : 'Favorilerinizden çıkarıldı.',
          'success'
        );
      } else {
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          if (added) next.add(movie.id);
          else next.delete(movie.id);
          return next;
        });
        showToast(
          added ? `"${movie.title}" izleme listenize eklendi.` : 'İzleme listenizden çıkarıldı.',
          'success'
        );
      }
    } catch {
      showToast('Liste güncellenemedi. Lütfen tekrar deneyin.', 'error');
    }
  };

  const handleShareResults = async () => {
    if (!result) return;
    const shareUrl = `${window.location.origin}/cinebot?mode=${result.mode}&movie=${encodeURIComponent(result.query)}&genre=${encodeURIComponent(genre)}`;
    const titles = result.suggestions.map((s) => `• ${s.title} (${s.year})`).join('\n');
    const shareText = `AiFlix CineBot "${result.query}" için şu filmleri önerdi:\n${titles}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `CineBot AI: ${result.query}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        showToast('Öneri listesi ve bağlantısı panoya kopyalandı!', 'success');
      }
    } catch {
      // Kullanıcı iptal etti
    }
  };

  const restoreFromHistory = (item: CineBotHistoryItem) => {
    setQuery(item.query);
    setMode(item.mode);
    setGenre(item.genre);
    setResult({
      query: item.query,
      mode: item.mode,
      engine: item.engine,
      originalMovie: null,
      count: item.suggestions.length,
      suggestions: item.suggestions.map((s) => ({
        ...s,
        originalTitle: s.title,
        overview: '',
        backdropPath: null,
        releaseDate: s.year,
        voteCount: 0,
        genres: [],
      })),
    });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container page-section">
      <div className="page-intro">
        <span className="hero-eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          Yapılandırılmış Gemini AI + TMDB Doğrulamalı Öneri Motoru
        </span>
        <h1 className="hero-title page-intro-title">
          CineBot <span className="hero-title-accent">AI</span> Film Asistanı
        </h1>
        <p className="hero-subtitle mb-0">
          Sevdiğin bir filmi yaz ya da ruh halini anlat; CineBot gerçek TMDB kayıtlarıyla
          doğrulanmış en iyi filmleri sebepleriyle listelesin.
        </p>
      </div>

      <div className="surface-card mb-32">
        <div className="mode-switch" role="tablist" aria-label="Öneri modu">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'movie'}
            className={`mode-switch-btn${mode === 'movie' ? ' is-active' : ''}`}
            onClick={() => setMode('movie')}
          >
            <Clapperboard size={17} aria-hidden="true" />
            <span>Sevdiğim Bir Filme Benzer</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'vibe'}
            className={`mode-switch-btn${mode === 'vibe' ? ' is-active' : ''}`}
            onClick={() => setMode('vibe')}
          >
            <Wand2 size={17} aria-hidden="true" />
            <span>Ruh Halime &amp; Temaya Göre</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch({ q: query, m: mode, g: genre, c: count });
          }}
        >
          <div className="cinebot-controls-grid">
            <div className="form-field mb-0">
              <label htmlFor="cinebot-query" className="form-label">
                {mode === 'movie' ? 'Film Adı' : 'Ruh Haliniz veya İstediğiniz Konu'}
              </label>
              <input
                id="cinebot-query"
                type="text"
                className="form-input"
                maxLength={240}
                placeholder={
                  mode === 'movie'
                    ? 'Örn: Interstellar, Inception, Fight Club, Parasite...'
                    : 'Örn: Yağmurlu bir akşamda izlenecek ters köşe yapan gizemli bir film...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
            </div>

            <div className="form-field mb-0">
              <label htmlFor="cinebot-genre" className="form-label">
                Kategori (Tür)
              </label>
              <select
                id="cinebot-genre"
                className="form-select"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field mb-0">
              <label htmlFor="cinebot-count" className="form-label">
                Öneri Sayısı
              </label>
              <select
                id="cinebot-count"
                className="form-select"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={3}>3 Film</option>
                <option value={4}>4 Film</option>
                <option value={6}>6 Film</option>
                <option value={8}>8 Film</option>
              </select>
            </div>
          </div>

          <div className="flex-row flex-wrap gap-8 mt-14 mb-24">
            <span className="text-sm font-bold text-muted">İlham Al:</span>
            {INSPIRATION_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                className="vibe-pill"
                onClick={() => {
                  setMode('vibe');
                  setQuery(tag.query);
                  setGenre(tag.genre);
                  runSearch({ q: tag.query, m: 'vibe', g: tag.genre, c: count });
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-gradient btn-lg w-full"
            disabled={loading}
          >
            <Sparkles size={18} aria-hidden="true" />
            <span>{loading ? 'Yapay Zeka Filmleri Analiz Ediyor...' : 'Yapay Zeka ile Öneri Getir'}</span>
          </button>
        </form>
      </div>

      <div ref={resultsRef}>
        {loading && (
          <div className="surface-card mb-32" aria-busy="true" aria-live="polite">
            <div className="text-center mb-24">
              <h2 className="m-0 mb-6 text-lg">
                CineBot en uygun filmleri seçiyor ve TMDB ile doğruluyor...
              </h2>
              <p className="m-0 text-muted text-sm">
                Her öneri gerçek afiş, puan, tür ve fragman bilgileriyle zenginleştiriliyor.
              </p>
            </div>
            <div className="cinebot-results-grid">
              {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                <div key={i} className="cinebot-rec-card">
                  <div className="skeleton sk-poster-ratio" />
                  <div className="flex-col gap-10">
                    <div className="skeleton sk-rec-title" />
                    <div className="skeleton sk-rec-reason" />
                    <div className="skeleton sk-rec-desc" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="state-box mb-32" role="alert">
            <Film size={42} color="#f87171" aria-hidden="true" />
            <h2 className="state-box-title">Öneriler alınamadı</h2>
            <p className="state-box-text">{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => runSearch({ q: query, m: mode, g: genre, c: count })}
            >
              <RotateCcw size={15} /> Tekrar Dene
            </button>
          </div>
        )}

        {!loading && result && (
          <section aria-labelledby="cinebot-results-heading" className="mb-40">
            <div className="section-header">
              <div>
                <h2 id="cinebot-results-heading" className="section-title">
                  {result.originalMovie
                    ? `"${result.originalMovie.title}" İçin Öneriler`
                    : `"${result.query}" İçin Seçilen Filmler`}
                </h2>
                <p className="section-subtitle">
                  {result.count} doğrulanmış film önerisi bulundu
                </p>
              </div>
              <div className="section-actions">
                <span className="badge badge-blue">
                  <Cpu size={14} aria-hidden="true" />
                  {result.engine === 'gemini' ? 'Gemini AI Motoru' : 'TMDB Akıllı Algoritma'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleShareResults}
                >
                  <Share2 size={15} aria-hidden="true" /> Sonucu Paylaş
                </button>
              </div>
            </div>

            <div className="cinebot-results-grid">
              {result.suggestions.map((movie) => {
                const poster = getTmdbImageUrl(movie.posterPath, 'w342');
                const isFav = favoriteIds.has(movie.id);
                const isWatch = watchlistIds.has(movie.id);

                return (
                  <article key={movie.id} className="cinebot-rec-card">
                    <Link
                      href={`/movie/${movie.id}`}
                      aria-label={`${movie.title} detay sayfası`}
                      className="block"
                    >
                      <div className="movie-poster-wrap rounded-10">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={`${movie.title} afişi`}
                            fill
                            sizes="(max-width: 720px) 90vw, 180px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="movie-poster-placeholder">
                            <Film size={28} />
                          </div>
                        )}
                        {movie.voteAverage > 0 && (
                          <span className="movie-rating-badge">
                            <Star size={12} fill="currentColor" /> {movie.voteAverage.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="flex-col min-w-0">
                      <div className="flex-between gap-8">
                        <Link href={`/movie/${movie.id}`}>
                          <h3 className="m-0 mb-2 text-lg font-bold">
                            {movie.title}
                          </h3>
                        </Link>
                        {movie.year && <span className="badge">{movie.year}</span>}
                      </div>

                      {movie.originalTitle && movie.originalTitle !== movie.title && (
                        <div className="text-xs text-muted mb-6">
                          {movie.originalTitle}
                        </div>
                      )}

                      {movie.genres && movie.genres.length > 0 && (
                        <div className="flex-row flex-wrap gap-6 mb-6">
                          {movie.genres.slice(0, 3).map((g) => (
                            <span key={g} className="badge badge-orange">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="ai-reason-box">
                        <div className="ai-reason-label">
                          <Lightbulb size={13} aria-hidden="true" /> Neden Önerildi?
                        </div>
                        {movie.aiReason}
                      </div>

                      {movie.overview && (
                        <p className="m-0 mb-12 text-sm text-secondary line-clamp-3">
                          {movie.overview}
                        </p>
                      )}

                      <div className="mt-auto flex-row flex-wrap gap-8 pt-6">
                        {movie.trailerKey && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              setActiveTrailer({ key: movie.trailerKey!, title: movie.title })
                            }
                          >
                            <Play size={14} fill="currentColor" /> Fragman
                          </button>
                        )}
                        <button
                          type="button"
                          className={`btn btn-sm ${isFav ? 'btn-danger' : 'btn-secondary'}`}
                          aria-pressed={isFav}
                          onClick={() => handleToggleList(movie, 'favorites')}
                        >
                          <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                          {isFav ? 'Favoride' : 'Favori'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${isWatch ? 'btn-gradient' : 'btn-secondary'}`}
                          aria-pressed={isWatch}
                          onClick={() => handleToggleList(movie, 'watchlist')}
                        >
                          {isWatch ? <Check size={14} /> : <Bookmark size={14} />}
                          {isWatch ? 'Listede' : 'İzle'}
                        </button>
                        <Link
                          href={`/filmsozluk?topic=${encodeURIComponent(movie.title)}&movieId=${movie.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          <MessageSquare size={14} /> Tartış
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {user && history.length > 0 && (
        <section className="surface-card" aria-labelledby="history-heading">
          <div className="section-header mb-16">
            <h2 id="history-heading" className="section-title text-lg">
              <History size={20} color="#ff6b08" aria-hidden="true" />
              Son CineBot Öneri Geçmişin
            </h2>
          </div>
          <div className="flex-row flex-wrap gap-10">
            {history.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                className="vibe-pill"
                onClick={() => restoreFromHistory(item)}
              >
                <Sparkles size={13} color="#2196f3" aria-hidden="true" />
                <span>{item.query}</span>
                <span className="text-muted text-xs">
                  ({item.suggestions.length} film)
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <TrailerModal
        trailerKey={activeTrailer?.key ?? null}
        title={activeTrailer?.title ?? ''}
        onClose={() => setActiveTrailer(null)}
      />
    </div>
  );
}
