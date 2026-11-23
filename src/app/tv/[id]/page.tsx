import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Clock, Calendar, User as UserIcon, Tv, Clapperboard, Layers } from 'lucide-react';
import { getTvDetailById, isTmdbConfigured } from '@/lib/tmdb';
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
    return { title: 'Dizi Detayı' };
  }

  try {
    const show = await getTvDetailById(Number(id));
    if (!show) return { title: 'Dizi Bulunamadı' };

    const ogImage =
      getTmdbImageUrl(show.backdropPath, 'w1280') ||
      getTmdbImageUrl(show.posterPath, 'w500') ||
      '/img/og-brand.png';

    const title = show.year ? `${show.title} (${show.year}) — Dizi` : `${show.title} — Dizi`;
    const description =
      show.overview.slice(0, 155) || `${show.title} oyuncuları, sezonları, konusu, fragmanı ve benzer diziler.`;

    return {
      title,
      description,
      alternates: { canonical: `/tv/${show.id}` },
      openGraph: {
        type: 'video.tv_show',
        title: `${title} | AiFlix`,
        description,
        url: `${SITE_URL}/tv/${show.id}`,
        images: [{ url: ogImage, width: 1280, height: 720, alt: show.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | AiFlix`,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: 'Dizi Detayı' };
  }
}

export default async function TvDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) {
    notFound();
  }

  if (!isTmdbConfigured()) {
    return (
      <div className="container page-section">
        <div className="state-box">
          <Tv size={44} color="#ff6b08" />
          <h1 className="state-box-title">TMDB Servisi Yapılandırılmamış</h1>
          <p className="state-box-text">
            Dizi detaylarını görüntülemek için sunucu ortam değişkenlerinde TMDB anahtarının tanımlı
            olması gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  const show = await getTvDetailById(Number(id));
  if (!show) {
    notFound();
  }

  const posterUrl = getTmdbImageUrl(show.posterPath, 'w500');
  const backdropUrl = getTmdbImageUrl(show.backdropPath, 'w1280');

  const tvJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.title,
    alternateName: show.originalTitle !== show.title ? show.originalTitle : undefined,
    description: show.overview,
    image: posterUrl || undefined,
    datePublished: show.releaseDate || undefined,
    numberOfSeasons: show.numberOfSeasons || undefined,
    numberOfEpisodes: show.numberOfEpisodes || undefined,
    genre: show.genres,
    creator: show.director ? { '@type': 'Person', name: show.director } : undefined,
    actor: show.cast.slice(0, 6).map((c) => ({ '@type': 'Person', name: c.name })),
    aggregateRating:
      show.voteCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: show.voteAverage,
            ratingCount: show.voteCount,
            bestRating: 10,
            worstRating: 1,
          }
        : undefined,
  };

  const safeJsonLd = JSON.stringify(tvJsonLd).replace(/</g, '\\u003c');

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
                alt={`${show.title} afişi`}
                fill
                priority
                sizes="(max-width: 720px) 240px, 300px"
                className="object-cover"
              />
            ) : (
              <div className="movie-poster-placeholder">
                <Tv size={40} />
                <span>Afiş bulunamadı</span>
              </div>
            )}
          </div>

          <div>
            <div className="mb-8">
              <span className="badge badge-blue">
                <Tv size={13} aria-hidden="true" /> Dizi
              </span>
            </div>
            <h1 className="movie-detail-title">{show.title}</h1>
            {show.originalTitle && show.originalTitle !== show.title && (
              <p className="m-0 mb-8 text-muted text-base">
                Orijinal Ad: {show.originalTitle}
              </p>
            )}
            {show.tagline && <p className="movie-detail-tagline">&ldquo;{show.tagline}&rdquo;</p>}

            <div className="movie-meta-row">
              {show.voteAverage > 0 && (
                <span className="badge badge-gold">
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  {show.voteAverage.toFixed(1)} / 10
                </span>
              )}
              {show.year && (
                <span className="badge">
                  <Calendar size={14} aria-hidden="true" /> {show.year}
                </span>
              )}
              {show.numberOfSeasons && (
                <span className="badge">
                  <Layers size={14} aria-hidden="true" /> {show.numberOfSeasons} Sezon
                  {show.numberOfEpisodes ? ` • ${show.numberOfEpisodes} Bölüm` : ''}
                </span>
              )}
              {show.runtime && (
                <span className="badge">
                  <Clock size={14} aria-hidden="true" /> ~{show.runtime} dk / bölüm
                </span>
              )}
              {show.director && (
                <span className="badge badge-blue">
                  <Clapperboard size={14} aria-hidden="true" /> Yaratıcı: {show.director}
                </span>
              )}
            </div>

            <div className="movie-meta-row">
              {show.genres.map((genre) => (
                <span key={genre} className="badge badge-orange">
                  {genre}
                </span>
              ))}
            </div>

            <p className="movie-detail-overview">{show.overview}</p>

            <MovieDetailActions movie={show} />
          </div>
        </div>
      </section>

      <div className="container">
        {show.trailerKey && isValidYouTubeKey(show.trailerKey) && (
          <section className="page-section" aria-labelledby="trailer-heading">
            <div className="section-header">
              <h2 id="trailer-heading" className="section-title">
                Resmi Fragman
              </h2>
            </div>
            <div className="surface-card trailer-card-frame">
              <div className="video-ratio">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${show.trailerKey}?rel=0`}
                  title={`${show.title} Resmi Fragmanı`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )}

        {show.cast.length > 0 && (
          <section className="page-section" aria-labelledby="cast-heading">
            <div className="section-header">
              <h2 id="cast-heading" className="section-title">
                Öne Çıkan Oyuncular
              </h2>
            </div>
            <div className="cast-grid">
              {show.cast.map((actor) => {
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

        {show.similar.length > 0 && (
          <MovieCarousel
            title="Benzer Diziler"
            subtitle={`"${show.title}" dizisini seven izleyicilerin öne çıkardığı yapımlar`}
            movies={show.similar}
          />
        )}
      </div>
    </>
  );
}
