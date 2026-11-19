import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Clock, Calendar, User as UserIcon, Film, Clapperboard } from 'lucide-react';
import { getMovieDetailById, isTmdbConfigured } from '@/lib/tmdb';
import { getTmdbImageUrl, isValidYouTubeKey } from '@/lib/security';
import { MovieDetailActions } from '@/components/MovieDetailClient';
import { MovieCarousel } from '@/components/MovieCarousel';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiflix-rho.vercel.app';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id) || !isTmdbConfigured()) {
    return { title: 'Film Detayı' };
  }

  try {
    const movie = await getMovieDetailById(Number(id));
    if (!movie) return { title: 'Film Bulunamadı' };

    const ogImage =
      getTmdbImageUrl(movie.backdropPath, 'w1280') ||
      getTmdbImageUrl(movie.posterPath, 'w500') ||
      '/img/hero-poster.webp';

    const title = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    const description =
      movie.overview.slice(0, 155) || `${movie.title} oyuncuları, konusu, fragmanı ve benzer filmler.`;

    return {
      title,
      description,
      alternates: { canonical: `/movie/${movie.id}` },
      openGraph: {
        type: 'video.movie',
        title: `${title} | AiFlix`,
        description,
        url: `${SITE_URL}/movie/${movie.id}`,
        images: [{ url: ogImage, width: 1280, height: 720, alt: movie.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | AiFlix`,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: 'Film Detayı' };
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) {
    notFound();
  }

  if (!isTmdbConfigured()) {
    return (
      <div className="container page-section">
        <div className="state-box">
          <Film size={44} color="#ff6b08" />
          <h1 className="state-box-title">TMDB Servisi Yapılandırılmamış</h1>
          <p className="state-box-text">
            Film detaylarını görüntülemek için sunucu ortam değişkenlerinde TMDB anahtarının tanımlı
            olması gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  const movie = await getMovieDetailById(Number(id));
  if (!movie) {
    notFound();
  }

  const posterUrl = getTmdbImageUrl(movie.posterPath, 'w500');
  const backdropUrl = getTmdbImageUrl(movie.backdropPath, 'w1280');

  const movieJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    alternateName: movie.originalTitle !== movie.title ? movie.originalTitle : undefined,
    description: movie.overview,
    image: posterUrl || undefined,
    datePublished: movie.releaseDate || undefined,
    genre: movie.genres,
    director: movie.director ? { '@type': 'Person', name: movie.director } : undefined,
    actor: movie.cast.slice(0, 6).map((c) => ({ '@type': 'Person', name: c.name })),
    aggregateRating:
      movie.voteCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: movie.voteAverage,
            ratingCount: movie.voteCount,
            bestRating: 10,
            worstRating: 1,
          }
        : undefined,
  };

  const safeJsonLd = JSON.stringify(movieJsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
      />

      <section className="movie-detail-hero">
        {backdropUrl && (
          <div className="movie-detail-backdrop" aria-hidden="true">
            <Image
              src={backdropUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="movie-detail-backdrop-img"
            />
            <div className="movie-detail-backdrop-overlay" />
          </div>
        )}

        <div className="container movie-detail-grid">
          <div className="movie-detail-poster">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={`${movie.title} afişi`}
                fill
                priority
                sizes="(max-width: 720px) 240px, 300px"
                className="object-cover"
              />
            ) : (
              <div className="movie-poster-placeholder">
                <Film size={40} />
                <span>Afiş bulunamadı</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="movie-detail-title">{movie.title}</h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="m-0 mb-8 text-muted text-base">
                Orijinal Ad: {movie.originalTitle}
              </p>
            )}
            {movie.tagline && <p className="movie-detail-tagline">&ldquo;{movie.tagline}&rdquo;</p>}

            <div className="movie-meta-row">
              {movie.voteAverage > 0 && (
                <span className="badge badge-gold">
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  {movie.voteAverage.toFixed(1)} / 10
                </span>
              )}
              {movie.year && (
                <span className="badge">
                  <Calendar size={14} aria-hidden="true" /> {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="badge">
                  <Clock size={14} aria-hidden="true" /> {movie.runtime} dk
                </span>
              )}
              {movie.director && (
                <span className="badge badge-blue">
                  <Clapperboard size={14} aria-hidden="true" /> Yönetmen: {movie.director}
                </span>
              )}
            </div>

            <div className="movie-meta-row">
              {movie.genres.map((genre) => (
                <span key={genre} className="badge badge-orange">
                  {genre}
                </span>
              ))}
            </div>

            <p className="movie-detail-overview">{movie.overview}</p>

            <MovieDetailActions movie={movie} />
          </div>
        </div>
      </section>

      <div className="container">
        {movie.trailerKey && isValidYouTubeKey(movie.trailerKey) && (
          <section className="page-section" aria-labelledby="trailer-heading">
            <div className="section-header">
              <h2 id="trailer-heading" className="section-title">
                Resmi Fragman
              </h2>
            </div>
            <div className="surface-card trailer-card-frame">
              <div className="video-ratio">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}?rel=0`}
                  title={`${movie.title} Resmi Fragmanı`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )}

        {movie.cast.length > 0 && (
          <section className="page-section" aria-labelledby="cast-heading">
            <div className="section-header">
              <h2 id="cast-heading" className="section-title">
                Öne Çıkan Oyuncular
              </h2>
            </div>
            <div className="cast-grid">
              {movie.cast.map((actor) => {
                const photo = getTmdbImageUrl(actor.profilePath, 'w185');
                return (
                  <div key={actor.id} className="cast-card">
                    <div className="cast-photo-wrap">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={actor.name}
                          fill
                          sizes="(max-width: 720px) 32vw, 180px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="movie-poster-placeholder">
                          <UserIcon size={28} aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="cast-info">
                      <div className="cast-name" title={actor.name}>
                        {actor.name}
                      </div>
                      <div className="cast-character" title={actor.character}>
                        {actor.character || 'Oyuncu'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {movie.similar.length > 0 && (
          <MovieCarousel
            title="Benzer Filmler"
            subtitle={`"${movie.title}" filmini seven izleyicilerin öne çıkardığı yapımlar`}
            movies={movie.similar}
          />
        )}
      </div>
    </>
  );
}
