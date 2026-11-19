'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Bookmark,
  Heart,
  MessageSquare,
  Sparkles,
  Share2,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { TrailerModal } from '@/components/TrailerModal';
import { isMovieInUserList, toggleSavedMovie } from '@/lib/firestore-service';
import type { MovieDetail } from '@/types';

export function MovieDetailActions({ movie }: { movie: MovieDetail }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavorites, setInFavorites] = useState(false);
  const [busyList, setBusyList] = useState<'watchlist' | 'favorites' | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setInWatchlist(false);
      setInFavorites(false);
      return;
    }

    let cancelled = false;
    Promise.all([
      isMovieInUserList(user.uid, 'watchlist', movie.id),
      isMovieInUserList(user.uid, 'favorites', movie.id),
    ])
      .then(([w, f]) => {
        if (!cancelled) {
          setInWatchlist(w);
          setInFavorites(f);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, movie.id]);

  const handleToggleList = async (listType: 'watchlist' | 'favorites') => {
    if (!user) {
      showToast('Listelerinizi kullanmak için giriş yapmalısınız.', 'info');
      return;
    }
    setBusyList(listType);
    try {
      const added = await toggleSavedMovie(user.uid, listType, {
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        year: movie.year,
      });
      if (listType === 'watchlist') {
        setInWatchlist(added);
        showToast(
          added ? `"${movie.title}" izleme listenize eklendi.` : 'İzleme listenizden çıkarıldı.',
          'success'
        );
      } else {
        setInFavorites(added);
        showToast(
          added ? `"${movie.title}" favorilerinize eklendi.` : 'Favorilerinizden çıkarıldı.',
          'success'
        );
      }
    } catch {
      showToast('Liste güncellenirken bir sorun oluştu.', 'error');
    } finally {
      setBusyList(null);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${movie.title} — AiFlix`,
          text: `${movie.title} (${movie.year}) filmini AiFlix'te incele!`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Film bağlantısı panoya kopyalandı.', 'success');
      }
    } catch {
      // Kullanıcı iptal etti
    }
  };

  return (
    <>
      <div className="movie-detail-actions">
        {movie.trailerKey && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setTrailerOpen(true)}
          >
            <Play size={16} fill="currentColor" aria-hidden="true" />
            Fragmanı İzle
          </button>
        )}

        <button
          type="button"
          className={`btn ${inWatchlist ? 'btn-gradient' : 'btn-secondary'}`}
          disabled={busyList === 'watchlist'}
          aria-pressed={inWatchlist}
          onClick={() => handleToggleList('watchlist')}
        >
          {inWatchlist ? <Check size={16} /> : <Bookmark size={16} />}
          {inWatchlist ? 'İzleme Listesinde' : 'İzleme Listesine Ekle'}
        </button>

        <button
          type="button"
          className={`btn ${inFavorites ? 'btn-danger' : 'btn-secondary'}`}
          disabled={busyList === 'favorites'}
          aria-pressed={inFavorites}
          onClick={() => handleToggleList('favorites')}
        >
          <Heart size={16} fill={inFavorites ? 'currentColor' : 'none'} />
          {inFavorites ? 'Favorilerde' : 'Favorilere Ekle'}
        </button>

        <Link
          href={`/cinebot?movie=${encodeURIComponent(movie.title)}`}
          className="btn btn-secondary"
        >
          <Sparkles size={16} aria-hidden="true" /> Benzerlerini Bul
        </Link>

        <Link
          href={`/filmsozluk?topic=${encodeURIComponent(movie.title)}&movieId=${movie.id}`}
          className="btn btn-secondary"
        >
          <MessageSquare size={16} aria-hidden="true" /> FilmSözlük&apos;te Tartış
        </Link>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Filmi paylaş"
          title="Paylaş"
          onClick={handleShare}
        >
          <Share2 size={17} />
        </button>
      </div>

      <TrailerModal
        trailerKey={trailerOpen ? movie.trailerKey ?? null : null}
        title={movie.title}
        onClose={() => setTrailerOpen(false)}
      />
    </>
  );
}
