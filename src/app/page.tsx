import React from 'react';
import { HomeClient } from '@/components/HomeClient';
import { getTrendingMovies, isTmdbConfigured } from '@/lib/tmdb';
import type { MovieSummary } from '@/types';

export const revalidate = 1800;

export default async function HomePage() {
  let initialTrending: MovieSummary[] = [];

  if (isTmdbConfigured()) {
    try {
      initialTrending = await getTrendingMovies(10);
    } catch {
      initialTrending = [];
    }
  }

  return <HomeClient initialTrending={initialTrending} />;
}
