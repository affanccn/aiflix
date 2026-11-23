import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiflix-rho.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AiFlix — Yapay Zeka Destekli Film Keşif & Sinema Topluluğu',
    template: '%s | AiFlix',
  },
  description:
    'Sevdiğiniz filmlere benzer yapımları CineBot yapay zeka asistanıyla keşfedin, haftanın trend filmlerini inceleyin ve FilmSözlük topluluğunda tartışın.',
  keywords: [
    'film öneri',
    'yapay zeka film öneri',
    'CineBot',
    'FilmSözlük',
    'trend filmler',
    'sinema topluluğu',
    'AiFlix',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'AiFlix',
    title: 'AiFlix — Yapay Zeka Destekli Film Keşif Platformu',
    description:
      'Ruh halinize ve sevdiğiniz filmlere göre kişiselleştirilmiş yapay zeka film önerileri ve aktif sinema topluluğu.',
    images: [
      {
        url: '/img/og-brand.png',
        width: 1200,
        height: 630,
        alt: 'AiFlix Yapay Zeka Film Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AiFlix — Yapay Zeka Destekli Film Keşif Platformu',
    description:
      'Sevdiğiniz filmlere benzer başyapıtları CineBot AI ile keşfedin ve FilmSözlük topluluğuna katılın.',
    images: ['/img/og-brand.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#080c16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Ana içeriğe geç
        </a>
        <Providers>
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
