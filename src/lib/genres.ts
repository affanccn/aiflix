export interface GenreOption {
  slug: string;
  id: number | null;
  tvId?: number | null;
  label: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { slug: 'all', id: null, tvId: null, label: 'Tüm Türler' },
  { slug: 'sci-fi', id: 878, tvId: 10765, label: 'Bilim Kurgu' },
  { slug: 'action', id: 28, tvId: 10759, label: 'Aksiyon' },
  { slug: 'thriller', id: 53, tvId: 9648, label: 'Gerilim' },
  { slug: 'drama', id: 18, tvId: 18, label: 'Dram' },
  { slug: 'comedy', id: 35, tvId: 35, label: 'Komedi' },
  { slug: 'horror', id: 27, tvId: 9648, label: 'Korku' },
  { slug: 'mystery', id: 9648, tvId: 9648, label: 'Gizem' },
  { slug: 'adventure', id: 12, tvId: 10759, label: 'Macera' },
  { slug: 'romance', id: 10749, tvId: 10749, label: 'Romantik' },
  { slug: 'animation', id: 16, tvId: 16, label: 'Animasyon' },
  { slug: 'fantasy', id: 14, tvId: 10765, label: 'Fantastik' },
  { slug: 'crime', id: 80, tvId: 80, label: 'Suç' },
  { slug: 'documentary', id: 99, tvId: 99, label: 'Belgesel' },
  { slug: 'history', id: 36, tvId: 10768, label: 'Tarih' },
  { slug: 'war', id: 10752, tvId: 10768, label: 'Savaş' },
  { slug: 'family', id: 10751, tvId: 10751, label: 'Aile' },
];

export const GENRE_SLUG_TO_ID: Record<string, number | null> = Object.fromEntries(
  GENRE_OPTIONS.map((g) => [g.slug, g.id])
);

export const TV_GENRE_SLUG_TO_ID: Record<string, number | null> = Object.fromEntries(
  GENRE_OPTIONS.map((g) => [g.slug, g.tvId ?? g.id])
);

export const GENRE_ID_TO_NAME: Record<number, string> = {
  ...Object.fromEntries(
    GENRE_OPTIONS.filter((g): g is GenreOption & { id: number } => g.id !== null).map((g) => [
      g.id,
      g.label,
    ])
  ),
  // TMDB TV-specific genre IDs
  10759: 'Aksiyon & Macera',
  10762: 'Çocuk',
  10763: 'Haber',
  10764: 'Reality',
  10765: 'Bilim Kurgu & Fantastik',
  10766: 'Dizi / Pembe Dizi',
  10767: 'Talk Show',
  10768: 'Savaş & Politik',
};
