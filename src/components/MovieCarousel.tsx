'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';
import type { MovieSummary } from '@/types';

interface MovieCarouselProps {
  title: string;
  subtitle?: string;
  movies: MovieSummary[];
}

export function MovieCarousel({ title, subtitle, movies }: MovieCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (movies.length === 0) return null;

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const distance = Math.max(el.clientWidth * 0.75, 240);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label="Sola kaydır"
            onClick={() => scrollByAmount('left')}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label="Sağa kaydır"
            onClick={() => scrollByAmount('right')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="carousel-wrap">
        <div className="carousel-track" ref={trackRef}>
          {movies.map((movie) => (
            <div key={movie.id} className="carousel-item">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
