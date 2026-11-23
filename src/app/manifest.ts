import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AiFlix — Yapay Zeka Film Keşif Platformu',
    short_name: 'AiFlix',
    description:
      'Yapay zeka destekli kişiselleştirilmiş film önerileri, haftanın trend filmleri ve FilmSözlük sinema topluluğu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c16',
    theme_color: '#080c16',
    lang: 'tr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
