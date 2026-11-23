import React from 'react';
import { HomeClient } from '@/components/HomeClient';
import { getTrendingMovies, getTrendingTvShows, isTmdbConfigured } from '@/lib/tmdb';
import type { MovieSummary } from '@/types';

export const revalidate = 1800;

export default async function HomePage() {
  let initialTrending: MovieSummary[] = [];
  let initialTrendingTv: MovieSummary[] = [];

  if (isTmdbConfigured()) {
    const [moviesRes, tvRes] = await Promise.allSettled([
      getTrendingMovies(10),
      getTrendingTvShows(10),
    ]);
    if (moviesRes.status === 'fulfilled') initialTrending = moviesRes.value;
    if (tvRes.status === 'fulfilled') initialTrendingTv = tvRes.value;
  }

  return (
    <HomeClient
      initialTrending={initialTrending}
      initialTrendingTv={initialTrendingTv}
    />
  );
}
