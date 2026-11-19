export interface GenreOption {
  slug: string;
  id: number | null;
  label: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { slug: 'all', id: null, label: 'Tüm Türler' },
  { slug: 'sci-fi', id: 878, label: 'Bilim Kurgu' },
  { slug: 'action', id: 28, label: 'Aksiyon' },
  { slug: 'thriller', id: 53, label: 'Gerilim' },
  { slug: 'drama', id: 18, label: 'Dram' },
  { slug: 'comedy', id: 35, label: 'Komedi' },
  { slug: 'horror', id: 27, label: 'Korku' },
  { slug: 'mystery', id: 9648, label: 'Gizem' },
  { slug: 'adventure', id: 12, label: 'Macera' },
  { slug: 'romance', id: 10749, label: 'Romantik' },
  { slug: 'animation', id: 16, label: 'Animasyon' },
  { slug: 'fantasy', id: 14, label: 'Fantastik' },
  { slug: 'crime', id: 80, label: 'Suç' },
  { slug: 'documentary', id: 99, label: 'Belgesel' },
  { slug: 'history', id: 36, label: 'Tarih' },
  { slug: 'war', id: 10752, label: 'Savaş' },
  { slug: 'family', id: 10751, label: 'Aile' },
];

export const GENRE_SLUG_TO_ID: Record<string, number | null> = Object.fromEntries(
  GENRE_OPTIONS.map((g) => [g.slug, g.id])
);

export const GENRE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  GENRE_OPTIONS.filter((g): g is GenreOption & { id: number } => g.id !== null).map((g) => [
    g.id,
    g.label,
  ])
);
