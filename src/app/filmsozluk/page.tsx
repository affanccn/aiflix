import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { FilmSozlukClient } from '@/components/FilmSozlukClient';

export const metadata: Metadata = {
  title: 'FilmSözlük — Sinema Tartışmaları & İncelemeler',
  description:
    'AiFlix FilmSözlük topluluğunda filmler hakkında başlık açın, teorileri paylaşın, yorum yapın ve sinemaseverlerle tartışın.',
  alternates: { canonical: '/filmsozluk' },
};

export default function FilmSozlukPage() {
  return (
    <Suspense
      fallback={
        <div className="container page-section">
          <div className="forum-layout">
            <div className="surface-card">
              <div className="skeleton sk-block-260" />
            </div>
          </div>
        </div>
      }
    >
      <FilmSozlukClient />
    </Suspense>
  );
}
