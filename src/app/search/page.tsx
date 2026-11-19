import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchClient } from '@/components/SearchClient';
import { MovieCardSkeleton } from '@/components/MovieCard';

export const metadata: Metadata = {
  title: 'Film Keşfet & Ara',
  description:
    'TMDB veritabanında tür, yıl ve film adına göre anlık arama yapın, puanları inceleyin ve izleme listenize ekleyin.',
  alternates: { canonical: '/search' },
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container page-section">
          <div className="movies-grid-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
