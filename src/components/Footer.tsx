import React from 'react';
import Link from 'next/link';
import { Film } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand-logo mb-12">
              <span className="brand-logo-mark" aria-hidden="true">
                <Film size={18} />
              </span>
              <span>
                Ai<span className="brand-logo-accent">Flix</span>
              </span>
            </Link>
            <p className="footer-desc">
              Yapay zeka destekli film keşif motoru ve sinemaseverlerin buluşma noktası. Ruh
              halinize en uygun filmleri bulun, listelerinizi oluşturun ve FilmSözlük&apos;te
              tartışın.
            </p>
          </div>

          <div>
            <h2 className="footer-heading">Platform</h2>
            <ul className="footer-links">
              <li><Link href="/">Anasayfa &amp; Trendler</Link></li>
              <li><Link href="/cinebot">CineBot AI Önerileri</Link></li>
              <li><Link href="/search">Gelişmiş Film Arama</Link></li>
              <li><Link href="/filmsozluk">FilmSözlük Topluluğu</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">Hesap</h2>
            <ul className="footer-links">
              <li><Link href="/profile">Profilim &amp; Ayarlar</Link></li>
              <li><Link href="/profile?tab=watchlist">İzleme Listem</Link></li>
              <li><Link href="/profile?tab=favorites">Favori Filmlerim</Link></li>
              <li><Link href="/auth">Giriş Yap / Kayıt Ol</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {year} AiFlix. Tüm hakları saklıdır.</span>
          <span>
            Film verileri ve afişler{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline"
            >
              TMDB
            </a>{' '}
            tarafından sağlanmaktadır.
          </span>
        </div>
      </div>
    </footer>
  );
}
