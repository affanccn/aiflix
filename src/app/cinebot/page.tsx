import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { CineBotClient } from '@/components/CineBotClient';

export const metadata: Metadata = {
  title: 'CineBot AI — Yapay Zeka Film Önerisi',
  description:
    'Sevdiğiniz filmlere benzer yapımları veya ruh halinize en uygun filmleri Gemini AI ve TMDB destekli CineBot ile anında keşfedin.',
  alternates: { canonical: '/cinebot' },
};

export default function CineBotPage() {
  return (
    <Suspense
      fallback={
        <div className="container page-section">
          <div className="surface-card">
            <div className="skeleton sk-block-220" />
          </div>
        </div>
      }
    >
      <CineBotClient />
    </Suspense>
  );
}
