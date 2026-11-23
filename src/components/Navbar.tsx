'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Sparkles,
  MessageSquare,
  Search,
  User as UserIcon,
  Bookmark,
  LogOut,
  Menu,
  X,
  Star,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  NetflixIcon,
  PrimeVideoIcon,
  AppleTvIcon,
  ImdbIcon,
  YouTubeIcon,
} from '@/components/BrandIcons';
import { getTmdbImageUrl } from '@/lib/security';
import type { MovieSummary } from '@/types';

const NAV_ITEMS = [
  { href: '/', label: 'Anasayfa', icon: Home },
  { href: '/cinebot', label: 'CineBot AI', icon: Sparkles },
  { href: '/search', label: 'Keşfet', icon: Search },
  { href: '/filmsozluk', label: 'FilmSözlük', icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, displayName, avatarUrl, logout } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=1`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { results?: MovieSummary[] };
          setResults((data.results || []).slice(0, 5));
        }
      } catch {
        // İptal veya ağ hatası
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push('/search');
      return;
    }
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      showToast('Oturumunuz güvenli şekilde kapatıldı.', 'info');
      router.push('/');
    } catch {
      showToast('Çıkış yapılırken bir sorun oluştu.', 'error');
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-left">
            <Link href="/" className="brand-logo" aria-label="AiFlix Anasayfa">
              <span className="brand-logo-mark" aria-hidden="true">
                <Image
                  src="/img/logo-mark.png"
                  alt=""
                  width={34}
                  height={34}
                  className="brand-logo-mark-img"
                  priority
                />
              </span>
              <span>
                Ai<span className="brand-logo-accent">Flix</span>
              </span>
            </Link>

            <div className="platform-strip" aria-label="Popüler Platformlar">
              <a
                href="https://www.netflix.com"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-icon-link is-netflix"
                aria-label="Netflix"
                title="Netflix"
              >
                <NetflixIcon size={16} />
              </a>
              <a
                href="https://www.primevideo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-icon-link is-prime"
                aria-label="Amazon Prime Video"
                title="Prime Video"
              >
                <PrimeVideoIcon size={17} />
              </a>
              <a
                href="https://tv.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-icon-link is-apple"
                aria-label="Apple TV+"
                title="Apple TV+"
              >
                <AppleTvIcon size={17} />
              </a>
              <a
                href="https://www.imdb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-icon-link is-imdb"
                aria-label="IMDb"
                title="IMDb"
              >
                <ImdbIcon size={19} />
              </a>
              <a
                href="https://www.youtube.com/feed/storefront"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-icon-link is-youtube"
                aria-label="YouTube Filmler"
                title="YouTube Filmler"
              >
                <YouTubeIcon size={17} />
              </a>
            </div>
          </div>

          <nav className="navbar-links" aria-label="Ana menü">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${isActive ? ' is-active' : ''}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="navbar-right">
            <div className="nav-search" ref={searchWrapRef}>
              <form className="nav-search-box" onSubmit={handleSearchSubmit} role="search">
                <label htmlFor="global-movie-search" className="sr-only">
                  Film veya dizi ara
                </label>
                <input
                  id="global-movie-search"
                  type="search"
                  className="nav-search-input"
                  placeholder="Film veya dizi ara..."
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  autoComplete="off"
                />
                <button type="submit" className="nav-search-btn" aria-label="Film veya dizi ara">
                  <Search size={15} />
                </button>
              </form>

              {searchOpen && query.trim().length >= 2 && (
                <div className="nav-search-dropdown" role="listbox" aria-label="Arama önerileri">
                  {searching ? (
                    <div className="nav-search-status">Film ve diziler aranıyor...</div>
                  ) : results.length > 0 ? (
                    <>
                      {results.map((movie) => {
                        const isTv = movie.mediaType === 'tv';
                        const poster = getTmdbImageUrl(movie.posterPath, 'w185');
                        return (
                          <Link
                            key={`${movie.mediaType || 'movie'}-${movie.id}`}
                            href={isTv ? `/tv/${movie.id}` : `/movie/${movie.id}`}
                            className="nav-search-item"
                            onClick={() => setSearchOpen(false)}
                          >
                            {poster ? (
                              <Image
                                src={poster}
                                alt={movie.title}
                                width={38}
                                height={56}
                                className="nav-search-poster"
                              />
                            ) : (
                              <div className="nav-search-poster" aria-hidden="true" />
                            )}
                            <div className="nav-search-info">
                              <div className="nav-search-title">{movie.title}</div>
                              <div className="nav-search-meta">
                                <span>{isTv ? 'Dizi' : 'Film'}</span>
                                <span>•</span>
                                <span>{movie.year || '—'}</span>
                                <span className="inline-flex-center gap-3 text-gold">
                                  <Star size={12} fill="currentColor" /> {movie.voteAverage}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      <Link
                        href={`/search?q=${encodeURIComponent(query.trim())}`}
                        className="nav-search-all"
                        onClick={() => setSearchOpen(false)}
                      >
                        &ldquo;{query.trim()}&rdquo; için tüm sonuçları gör &rarr;
                      </Link>
                    </>
                  ) : (
                    <div className="nav-search-status">Eşleşen film bulunamadı.</div>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="nav-auth-skeleton skeleton" aria-hidden="true" />
            ) : user ? (
              <div className="nav-user-menu-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className="nav-avatar-btn"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Hesap menüsünü aç"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                >
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="nav-avatar-img"
                  />
                  <span className="nav-avatar-name">{displayName}</span>
                </button>

                {userMenuOpen && (
                  <div className="nav-dropdown" role="menu">
                    <div className="nav-dropdown-header">
                      <div className="nav-dropdown-name">{displayName}</div>
                      <div className="nav-dropdown-email">{user.email}</div>
                    </div>
                    <Link href="/profile" className="nav-dropdown-item" role="menuitem">
                      <UserIcon size={16} /> Profilim
                    </Link>
                    <Link href="/profile?tab=watchlist" className="nav-dropdown-item" role="menuitem">
                      <Bookmark size={16} /> Listelerim
                    </Link>
                    <button
                      type="button"
                      className="nav-dropdown-item is-danger"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth" className="btn btn-primary btn-sm">
                <LogIn size={15} aria-hidden="true" /> Giriş Yap
              </Link>
            )}

            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-drawer" role="dialog" aria-label="Mobil menü">
          <form className="nav-search-box" onSubmit={handleSearchSubmit} role="search">
            <label htmlFor="mobile-movie-search" className="sr-only">
              Film ara
            </label>
            <input
              id="mobile-movie-search"
              type="search"
              className="nav-search-input"
              placeholder="Film veya yönetmen ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="nav-search-btn" aria-label="Ara">
              <Search size={15} />
            </button>
          </form>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobil alt gezinme">
        <Link href="/" className={`mobile-bottom-link${pathname === '/' ? ' is-active' : ''}`}>
          <Home size={19} />
          <span>Anasayfa</span>
        </Link>
        <Link
          href="/cinebot"
          className={`mobile-bottom-link${pathname?.startsWith('/cinebot') ? ' is-active' : ''}`}
        >
          <Sparkles size={19} />
          <span>CineBot</span>
        </Link>
        <Link
          href="/search"
          className={`mobile-bottom-link${pathname?.startsWith('/search') ? ' is-active' : ''}`}
        >
          <Search size={19} />
          <span>Keşfet</span>
        </Link>
        <Link
          href="/filmsozluk"
          className={`mobile-bottom-link${pathname?.startsWith('/filmsozluk') ? ' is-active' : ''}`}
        >
          <MessageSquare size={19} />
          <span>Sözlük</span>
        </Link>
        <Link
          href={user ? '/profile' : '/auth'}
          className={`mobile-bottom-link${
            pathname?.startsWith('/profile') || pathname?.startsWith('/auth') ? ' is-active' : ''
          }`}
        >
          <UserIcon size={19} />
          <span>{user ? 'Profil' : 'Giriş'}</span>
        </Link>
      </nav>
    </>
  );
}
