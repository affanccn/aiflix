'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, RotateCcw, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard, MovieCardSkeleton } from '@/components/MovieCard';
import { GENRE_OPTIONS } from '@/lib/genres';
import { useAuth } from '@/context/AuthContext';
import type { MovieSummary } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 65 }, (_, i) => CURRENT_YEAR - i);

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'all');
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [results, setResults] = useState<MovieSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextQ = searchParams.get('q') || '';
    const nextGenre = searchParams.get('genre') || 'all';
    const nextYear = searchParams.get('year') || '';
    const nextPage = Number(searchParams.get('page')) || 1;
    setQuery(nextQ);
    setGenre(nextGenre);
    setYear(nextYear);
    setPage(nextPage);
  }, [searchParams]);

  const fetchMovies = useCallback(
    async (opts: { q: string; genre: string; year: string; page: number }, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts.q.trim()) params.set('q', opts.q.trim());
        if (opts.genre && opts.genre !== 'all') params.set('genre', opts.genre);
        if (opts.year) params.set('year', opts.year);
        params.set('page', String(opts.page));

        const token = await getIdToken();
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as {
          results?: MovieSummary[];
          totalPages?: number;
          totalResults?: number;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Arama sonuçları alınamadı.');
        }

        setResults(data.results || []);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || 0);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Arama sırasında bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    },
    [getIdToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchMovies({ q: query, genre, year, page }, controller.signal);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, genre, year, page, fetchMovies]);

  const updateUrl = (next: { q?: string; genre?: string; year?: string; page?: number }) => {
    const params = new URLSearchParams();
    const qVal = next.q !== undefined ? next.q : query;
    const gVal = next.genre !== undefined ? next.genre : genre;
    const yVal = next.year !== undefined ? next.year : year;
    const pVal = next.page !== undefined ? next.page : 1;

    if (qVal.trim()) params.set('q', qVal.trim());
    if (gVal && gVal !== 'all') params.set('genre', gVal);
    if (yVal) params.set('year', yVal);
    if (pVal > 1) params.set('page', String(pVal));

    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  };

  return (
    <div className="container page-section">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            <Search size={26} color="#ff6b08" aria-hidden="true" />
            Film Keşfet &amp; Ara
          </h1>
          <p className="section-subtitle">
            TMDB arşivinde film adı, tür ve vizyon yılına göre anlık filtreleme yapın
          </p>
        </div>
      </div>

      <div className="surface-card mb-28">
        <div className="cinebot-controls-grid mb-0">
          <div className="form-field mb-0">
            <label htmlFor="search-query-input" className="form-label">
              Film Adı
            </label>
            <input
              id="search-query-input"
              type="search"
              className="form-input"
              placeholder="Film adı yazın (Örn: Başlangıç, Parasite, Dune)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
                updateUrl({ q: e.target.value, page: 1 });
              }}
              maxLength={120}
            />
          </div>

          <div className="form-field mb-0">
            <label htmlFor="search-genre-select" className="form-label">
              <SlidersHorizontal size={14} className="icon-inline" />
              Tür Filtresi
            </label>
            <select
              id="search-genre-select"
              className="form-select"
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                setPage(1);
                updateUrl({ genre: e.target.value, page: 1 });
              }}
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field mb-0">
            <label htmlFor="search-year-select" className="form-label">
              Vizyon Yılı
            </label>
            <select
              id="search-year-select"
              className="form-select"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
                updateUrl({ year: e.target.value, page: 1 });
              }}
            >
              <option value="">Tüm Yıllar</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <div className="flex-between mb-18 text-muted text-sm">
          <span>
            {query.trim()
              ? `"${query.trim()}" için ${totalResults.toLocaleString('tr-TR')} sonuç bulundu`
              : `Popüler filmler listeleniyor (${totalResults.toLocaleString('tr-TR')} kayıt)`}
          </span>
          {(query || genre !== 'all' || year) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQuery('');
                setGenre('all');
                setYear('');
                setPage(1);
                router.replace('/search');
              }}
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="movies-grid-5" aria-busy="true" aria-label="Arama sonuçları yükleniyor">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="state-box" role="alert">
          <Film size={40} color="#f87171" aria-hidden="true" />
          <h2 className="state-box-title">Arama yapılamadı</h2>
          <p className="state-box-text">{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fetchMovies({ q: query, genre, year, page })}
          >
            <RotateCcw size={15} /> Tekrar Dene
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="state-box">
          <Film size={40} color="#8b9ab8" aria-hidden="true" />
          <h2 className="state-box-title">Eşleşen film bulunamadı</h2>
          <p className="state-box-text">
            Farklı bir yazım deneyin, yıl/tür filtresini gevşetin veya CineBot AI&apos;dan ruh
            halinize göre öneri isteyin.
          </p>
        </div>
      ) : (
        <>
          <div className="movies-grid-5">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Sayfalama" className="flex-center gap-14 mt-32">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  updateUrl({ page: next });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ChevronLeft size={16} /> Önceki
              </button>
              <span className="text-sm text-secondary">
                Sayfa {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  updateUrl({ page: next });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Sonraki <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
