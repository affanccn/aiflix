import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Film, Home, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 — Sayfa Bulunamadı',
  description: 'Aradığınız sayfa AiFlix üzerinde bulunamadı.',
};

export default function NotFound() {
  return (
    <div className="container error-page-container">
      <div className="state-box">
        <Film size={56} color="#ff6b08" aria-hidden="true" />
        <h1 className="hero-title error-code-display">404</h1>
        <h2 className="state-box-title">Bu sahne senaryoda bulunamadı</h2>
        <p className="state-box-text">
          Aradığınız sayfa taşınmış, silinmiş ya da hiç çekilmemiş olabilir. Anasayfaya dönebilir
          veya CineBot ile yeni filmler keşfedebilirsiniz.
        </p>
        <div className="flex-center flex-wrap gap-12 mt-8">
          <Link href="/" className="btn btn-primary">
            <Home size={16} /> Anasayfaya Dön
          </Link>
          <Link href="/cinebot" className="btn btn-secondary">
            <Sparkles size={16} /> CineBot&apos;a Sor
          </Link>
        </div>
      </div>
    </div>
  );
}
