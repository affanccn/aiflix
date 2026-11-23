'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Sparkles,
  MessageSquare,
  Heart,
  RotateCcw,
  Film,
  PenSquare,
  LogIn,
  Bookmark,
  ArrowRight,
  LayoutGrid,
  GalleryHorizontalEnd,
} from 'lucide-react';
import { HeroMedia } from '@/components/HeroMedia';
import { MovieCard, MovieCardSkeleton } from '@/components/MovieCard';
import { MovieCarousel } from '@/components/MovieCarousel';
import { useAuth } from '@/context/AuthContext';
import { getTurkishFirestoreError } from '@/lib/firebase/client';
import { fetchLatestForumEntries } from '@/lib/firestore-service';
import type { ForumEntry, MovieSummary } from '@/types';

const VIBE_SHORTCUTS = [
  { label: 'Ters Köşe Gerilim', query: 'Ters köşe yapan zihin bükücü gerilim filmleri', genre: 'thriller' },
  { label: 'Derin Uzay & Bilim Kurgu', query: 'Derin uzayda geçen yalnızlık ve gizem temalı', genre: 'sci-fi' },
  { label: 'Karanlık Polisiye', query: 'Karanlık dedektif ve seri katil kovalamacası', genre: 'crime' },
  { label: 'Cyberpunk & Distopya', query: 'Cyberpunk atmosferli distopik aksiyon', genre: 'action' },
];

interface HomeClientProps {
  initialTrending: MovieSummary[];
}

export function HomeClient({ initialTrending }: HomeClientProps) {
  const router = useRouter();
  const { user, loading: authLoading, displayName, avatarUrl } = useAuth();

  const [heroInput, setHeroInput] = useState('');
  const [trending, setTrending] = useState<MovieSummary[]>(initialTrending);
  const [trendingLoading, setTrendingLoading] = useState(initialTrending.length === 0);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');

  const [entries, setEntries] = useState<ForumEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const res = await fetch('/api/trending?limit=10');
      const data = (await res.json()) as { results?: MovieSummary[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Trend filmler alınamadı.');
      }
      setTrending(data.results || []);
    } catch (err) {
      setTrendingError(
        err instanceof Error ? err.message : 'Trend filmler yüklenirken bir sorun oluştu.'
      );
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTrending.length === 0) {
      loadTrending();
    }
  }, [initialTrending.length, loadTrending]);

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const list = await fetchLatestForumEntries(4);
      setEntries(list);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code) {
        setEntriesError(getTurkishFirestoreError(code));
      } else if (err instanceof Error && err.message) {
        setEntriesError(err.message);
      } else {
        setEntriesError(
          'FilmSözlük başlıkları şu an yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.'
        );
      }
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroInput.trim();
    if (!trimmed) {
      router.push('/cinebot');
      return;
    }
    router.push(`/cinebot?movie=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <section className="hero" aria-label="Hoş geldiniz">
        <HeroMedia />
        <div className="container">
          <div className="hero-content">
            <span className="hero-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Gemini AI + TMDB Destekli Sinema Platformu
            </span>
            <h1 className="hero-title">
              Sıradaki Favori Filmini <span className="hero-title-accent">Yapay Zeka</span> ile
              Keşfet
            </h1>
            <p className="hero-subtitle">
              Sevdiğin filmlere benzer başyapıtları bul, ruh haline özel öneriler al ve FilmSözlük
              topluluğunda sinemaseverlerle fikirlerini paylaş.
            </p>

            <form className="hero-search-form" onSubmit={handleHeroSubmit} role="search">
              <label htmlFor="hero-movie-input" className="sr-only">
                Sevdiğiniz bir film adı veya tema yazın
              </label>
              <input
                id="hero-movie-input"
                type="text"
                className="hero-search-input"
                placeholder="Sevdiğin bir filmi yaz (Örn: Interstellar, Matrix, Inception)..."
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                maxLength={160}
              />
              <button type="submit" className="btn btn-primary btn-lg">
                <Sparkles size={17} aria-hidden="true" />
                <span>Öneri Bul</span>
              </button>
            </form>

            <div className="hero-pills" aria-label="Hızlı öneri temaları">
              {VIBE_SHORTCUTS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  className="vibe-pill"
                  onClick={() =>
                    router.push(
                      `/cinebot?mode=vibe&movie=${encodeURIComponent(tag.query)}&genre=${tag.genre}`
                    )
                  }
                >
                  <Sparkles size={13} color="#ff6b08" aria-hidden="true" />
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-section container" aria-labelledby="trending-heading">
        <div className="section-header">
          <div>
            <h2 id="trending-heading" className="section-title">
              <Flame size={24} color="#ff6b08" aria-hidden="true" />
              Haftanın Trend Filmleri
            </h2>
            <p className="section-subtitle">
              TMDB verilerine göre bu hafta dünya genelinde en çok konuşulan 10 yapım
            </p>
          </div>

          <div className="section-actions">
            <div className="inline-flex-center gap-4" role="group" aria-label="Görünüm seçimi">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                aria-label="Izgara görünümü"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'carousel' ? 'btn-primary' : 'btn-secondary'}`}
                aria-label="Yatay şerit görünümü"
                aria-pressed={viewMode === 'carousel'}
                onClick={() => setViewMode('carousel')}
              >
                <GalleryHorizontalEnd size={15} />
              </button>
            </div>
            <Link href="/search" className="btn btn-secondary btn-sm">
              Tümünü Keşfet <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {trendingLoading ? (
          <div className="movies-grid-5" aria-busy="true" aria-label="Trend filmler yükleniyor">
            {Array.from({ length: 10 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : trendingError ? (
          <div className="state-box" role="alert">
            <Film size={40} color="#f87171" aria-hidden="true" />
            <h3 className="state-box-title">Trend filmler yüklenemedi</h3>
            <p className="state-box-text">{trendingError}</p>
            <button type="button" className="btn btn-primary" onClick={loadTrending}>
              <RotateCcw size={15} /> Tekrar Dene
            </button>
          </div>
        ) : trending.length === 0 ? (
          <div className="state-box">
            <Film size={40} color="#8b9ab8" aria-hidden="true" />
            <h3 className="state-box-title">Şu an listelenecek trend film yok</h3>
            <p className="state-box-text">
              CineBot AI üzerinden doğrudan ruh haline veya sevdiğin filme göre arama yapabilirsin.
            </p>
            <Link href="/cinebot" className="btn btn-primary">
              CineBot&apos;a Git
            </Link>
          </div>
        ) : viewMode === 'carousel' ? (
          <MovieCarousel title="" movies={trending.slice(0, 10)} />
        ) : (
          <div className="movies-grid-5">
            {trending.slice(0, 10).map((movie, idx) => (
              <MovieCard key={movie.id} movie={movie} priority={idx < 5} />
            ))}
          </div>
        )}
      </section>

      <section className="page-section container pt-12">
        <div className="home-split">
          <div className="surface-card">
            <div className="section-header mb-18">
              <div>
                <h2 className="section-title text-xl">
                  <MessageSquare size={22} color="#2196f3" aria-hidden="true" />
                  FilmSözlük Son Tartışmalar
                </h2>
                <p className="section-subtitle">Topluluktan en güncel film analizleri ve teoriler</p>
              </div>
              <Link href="/filmsozluk" className="btn btn-secondary btn-sm">
                Tüm Başlıklar <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {entriesLoading ? (
              <div className="forum-preview-grid" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="forum-preview-card">
                    <div className="skeleton sk-forum-title" />
                    <div className="skeleton sk-forum-body" />
                    <div className="skeleton sk-forum-meta" />
                  </div>
                ))}
              </div>
            ) : entriesError ? (
              <div className="state-box">
                <p className="state-box-text">{entriesError}</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={loadEntries}>
                  <RotateCcw size={14} /> Tekrar Dene
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="state-box">
                <MessageSquare size={36} color="#ff6b08" aria-hidden="true" />
                <h3 className="state-box-title">İlk sinema tartışmasını sen başlat!</h3>
                <p className="state-box-text">
                  Son izlediğin film hakkındaki düşüncelerini FilmSözlük&apos;te toplulukla paylaş.
                </p>
                <Link href="/filmsozluk" className="btn btn-primary btn-sm">
                  <PenSquare size={15} /> Yeni Başlık Aç
                </Link>
              </div>
            ) : (
              <div className="forum-preview-grid">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/filmsozluk?entry=${encodeURIComponent(entry.id)}`}
                    className="forum-preview-card"
                  >
                    <h3 className="forum-preview-title">{entry.title}</h3>
                    <p className="forum-preview-excerpt">{entry.content}</p>
                    <div className="forum-preview-meta">
                      <span className="author-chip">
                        <Image
                          src={entry.authorImage}
                          alt={entry.author}
                          width={24}
                          height={24}
                          className="author-chip-avatar"
                        />
                        <span>{entry.author}</span>
                      </span>
                      <span className="inline-flex-center gap-10">
                        <span className="inline-flex-center gap-4">
                          <Heart size={13} color="#f87171" /> {entry.likesCount}
                        </span>
                        <span className="inline-flex-center gap-4">
                          <MessageSquare size={13} color="#7cc4fa" /> {entry.commentsCount}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="surface-card sidebar-profile-card" aria-label="Hızlı erişim">
            {authLoading ? (
              <div className="skeleton sk-avatar-lg" />
            ) : (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={76}
                height={76}
                className="sidebar-avatar-lg"
              />
            )}

            <div>
              <h2 className="m-0 mb-4 text-lg">
                Hoş geldin, <span className="text-orange">{displayName}</span>
              </h2>
              <p className="m-0 text-sm text-muted">
                {user
                  ? 'Listelerini yönet, öneri geçmişini incele ve tartışmalara katıl.'
                  : 'Favorilerini kaydetmek ve FilmSözlük’te yazmak için giriş yap.'}
              </p>
            </div>

            <div className="sidebar-actions">
              <Link href="/cinebot" className="btn btn-gradient">
                <Sparkles size={16} aria-hidden="true" /> CineBot ile Öneri Al
              </Link>
              <Link href="/filmsozluk" className="btn btn-secondary">
                <PenSquare size={16} aria-hidden="true" /> Yeni Başlık Aç
              </Link>
              {user ? (
                <Link href="/profile?tab=watchlist" className="btn btn-secondary">
                  <Bookmark size={16} aria-hidden="true" /> İzleme Listem
                </Link>
              ) : (
                !authLoading && (
                  <Link href="/auth" className="btn btn-primary">
                    <LogIn size={16} aria-hidden="true" /> Giriş Yap / Kayıt Ol
                  </Link>
                )
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
