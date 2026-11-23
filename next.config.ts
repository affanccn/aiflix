import type { NextConfig } from 'next';

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https://image.tmdb.org https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://i.ytimg.com https://vercel.live",
  "font-src 'self' data: https://vercel.live",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://firebaseappcheck.googleapis.com https://www.google.com https://www.recaptcha.net https://vercel.live wss://ws-us3.pusher.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.firebaseapp.com https://accounts.google.com https://www.google.com https://www.recaptcha.net https://vercel.live",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/pages/cinebot.html', destination: '/cinebot', permanent: true },
      { source: '/pages/filmsozluk.html', destination: '/filmsozluk', permanent: true },
      { source: '/pages/films%C3%B6zl%C3%BCk.html', destination: '/filmsozluk', permanent: true },
      { source: '/films%C3%B6zl%C3%BCk', destination: '/filmsozluk', permanent: true },
      { source: '/pages/auth.html', destination: '/auth', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Mevcut kullanıcıların Firestore/Auth kayıtlarındaki eski /public/img/... yollarını koru
      {
        source: '/public/:path*',
        destination: '/:path*',
      },
    ];
  },
};

export default nextConfig;
