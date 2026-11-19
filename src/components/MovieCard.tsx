'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Sparkles, Film } from 'lucide-react';
import { getTmdbImageUrl } from '@/lib/security';
import type { MovieSummary } from '@/types';

interface MovieCardProps {
  movie: MovieSummary;
  priority?: boolean;
}

export function MovieCard({ movie, priority = false }: MovieCardProps) {
  const posterUrl = getTmdbImageUrl(movie.posterPath, 'w342');
  const genresText = (movie.genres || []).slice(0, 2).join(' • ');

  return (
    <article className="movie-card">
      <Link href={`/movie/${movie.id}`} aria-label={`${movie.title} film detayları`}>
        <div className="movie-poster-wrap">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`${movie.title} afişi`}
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 25vw, 240px"
              className="movie-poster-img"
              priority={priority}
            />
          ) : (
            <div className="movie-poster-placeholder">
              <Film size={28} aria-hidden="true" />
              <span>Afiş bulunamadı</span>
            </div>
          )}

          {movie.voteAverage > 0 && (
            <span className="movie-rating-badge" aria-label={`Puan ${movie.voteAverage}`}>
              <Star size={12} fill="currentColor" aria-hidden="true" />
              {movie.voteAverage.toFixed(1)}
            </span>
          )}

          {movie.year && <span className="movie-year-badge">{movie.year}</span>}
        </div>
      </Link>

      <div className="movie-card-body">
        <Link href={`/movie/${movie.id}`}>
          <h3 className="movie-card-title" title={movie.title}>
            {movie.title}
          </h3>
        </Link>
        {genresText && <div className="movie-card-genres">{genresText}</div>}
        <div className="movie-card-footer">
          <Link
            href={`/cinebot?movie=${encodeURIComponent(movie.title)}`}
            className="movie-card-cta"
          >
            <Sparkles size={13} aria-hidden="true" />
            <span>Benzerini Bul</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="movie-card" aria-hidden="true">
      <div className="movie-poster-wrap skeleton" />
      <div className="movie-card-body">
        <div className="skeleton sk-title" />
        <div className="skeleton sk-sub" />
        <div className="skeleton sk-btn" />
      </div>
    </div>
  );
}
