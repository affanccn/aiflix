'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Bookmark,
  Heart,
  MessageSquare,
  History,
  Settings,
  CheckCircle2,
  AlertCircle,
  Mail,
  Trash2,
  Upload,
  LogIn,
  Sparkles,
  Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  fetchCineBotHistory,
  fetchSavedMovies,
  fetchUserEntries,
  toggleSavedMovie,
  uploadUserAvatar,
} from '@/lib/firestore-service';
import { getTmdbImageUrl, PRESET_AVATARS, validateImageFile } from '@/lib/security';
import type { CineBotHistoryItem, ForumEntry, SavedMovie } from '@/types';

type ProfileTab = 'watchlist' | 'favorites' | 'entries' | 'history' | 'settings';

export function ProfileClient() {
  const searchParams = useSearchParams();
  const { user, loading, displayName, avatarUrl, updateUserProfile, resendVerificationEmail } =
    useAuth();
  const { showToast } = useToast();

  const initialTab = (searchParams.get('tab') as ProfileTab) || 'watchlist';
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    ['watchlist', 'favorites', 'entries', 'history', 'settings'].includes(initialTab)
      ? initialTab
      : 'watchlist'
  );

  const [watchlist, setWatchlist] = useState<SavedMovie[]>([]);
  const [favorites, setFavorites] = useState<SavedMovie[]>([]);
  const [entries, setEntries] = useState<ForumEntry[]>([]);
  const [history, setHistory] = useState<CineBotHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as ProfileTab | null;
    if (paramTab && ['watchlist', 'favorites', 'entries', 'history', 'settings'].includes(paramTab)) {
      setActiveTab(paramTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setNewName(displayName);
    setNewAvatar(avatarUrl);
    setLoadingData(true);

    Promise.all([
      fetchSavedMovies(user.uid, 'watchlist').catch(() => []),
      fetchSavedMovies(user.uid, 'favorites').catch(() => []),
      fetchUserEntries(user.uid).catch(() => []),
      fetchCineBotHistory(user.uid).catch(() => []),
    ])
      .then(([w, f, e, h]) => {
        setWatchlist(w);
        setFavorites(f);
        setEntries(e);
        setHistory(h);
      })
      .finally(() => setLoadingData(false));
  }, [user, displayName, avatarUrl]);

  if (loading) {
    return (
      <div className="container page-section">
        <div className="surface-card">
          <div className="skeleton sk-block-180" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container page-section max-w-540">
        <div className="state-box">
          <LogIn size={44} color="#ff6b08" aria-hidden="true" />
          <h1 className="state-box-title">Profilinizi görmek için giriş yapın</h1>
          <p className="state-box-text">
            İzleme listenizi, favori filmlerinizi ve CineBot öneri geçmişinizi yönetmek için
            hesabınıza giriş yapmanız gerekiyor.
          </p>
          <Link href="/auth" className="btn btn-primary">
            Giriş Yap / Kayıt Ol
          </Link>
        </div>
      </div>
    );
  }

  const handleRemoveMovie = async (movie: SavedMovie, listType: 'watchlist' | 'favorites') => {
    try {
      await toggleSavedMovie(user.uid, listType, movie);
      if (listType === 'watchlist') {
        setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));
      } else {
        setFavorites((prev) => prev.filter((m) => m.id !== movie.id));
      }
      showToast(`"${movie.title}" listenizden çıkarıldı.`, 'info');
    } catch {
      showToast('Film çıkarılırken bir hata oluştu.', 'error');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Geçersiz dosya.', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(user.uid, file);
      setNewAvatar(url);
      showToast('Avatar yüklendi. Kaydet butonuna basarak profilinizi güncelleyin.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Avatar yüklenemedi.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(newName, newAvatar);
      showToast('Profil bilgileriniz güncellendi!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Profil güncellenemedi.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      showToast('Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'E-posta gönderilemedi.', 'error');
    }
  };

  const renderSavedGrid = (items: SavedMovie[], listType: 'watchlist' | 'favorites') => {
    if (loadingData) {
      return <div className="skeleton sk-block-220" />;
    }
    if (items.length === 0) {
      return (
        <div className="state-box">
          <h3 className="state-box-title">
            {listType === 'watchlist' ? 'İzleme listeniz henüz boş' : 'Henüz favori filminiz yok'}
          </h3>
          <p className="state-box-text">
            Film detay sayfalarından veya CineBot önerilerinden beğendiğiniz filmleri buraya
            ekleyebilirsiniz.
          </p>
          <Link href="/cinebot" className="btn btn-primary btn-sm">
            <Sparkles size={14} /> Film Keşfet
          </Link>
        </div>
      );
    }

    return (
      <div className="movies-grid-5">
        {items.map((movie) => {
          const poster = getTmdbImageUrl(movie.posterPath, 'w342');
          return (
            <article key={`${movie.mediaType || 'movie'}-${movie.id}`} className="movie-card">
              <Link href={movie.mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`}>
                <div className="movie-poster-wrap">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 720px) 48vw, 220px"
                      className="movie-poster-img"
                    />
                  ) : (
                    <div className="movie-poster-placeholder">{movie.title}</div>
                  )}
                  {movie.voteAverage > 0 && (
                    <span className="movie-rating-badge">
                      <Star size={12} fill="currentColor" /> {movie.voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="movie-card-body">
                <Link href={movie.mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`}>
                  <h3 className="movie-card-title">{movie.title}</h3>
                </Link>
                <button
                  type="button"
                  className="btn btn-danger btn-sm mt-auto"
                  onClick={() => handleRemoveMovie(movie, listType)}
                >
                  <Trash2 size={13} /> Listeden Çıkar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container page-section">
      <div className="surface-card profile-header-card">
        <div className="flex-row gap-18">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={78}
            height={78}
            className="sidebar-avatar-lg"
          />
          <div>
            <h1 className="m-0 mb-4 text-2xl">{displayName}</h1>
            <p className="m-0 mb-8 text-muted text-sm">{user.email}</p>
            {user.emailVerified ? (
              <span className="badge badge-verified">
                <CheckCircle2 size={13} /> E-posta Doğrulandı
              </span>
            ) : (
              <div className="flex-row flex-wrap gap-10">
                <span className="badge badge-unverified">
                  <AlertCircle size={13} /> E-posta Doğrulanmadı
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResendVerification}
                >
                  <Mail size={14} /> Doğrulama Gönder
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-row flex-wrap gap-18">
          <div className="text-center">
            <div className="profile-stat-num text-orange">{watchlist.length}</div>
            <div className="text-xs text-muted">İzleme Listesi</div>
          </div>
          <div className="text-center">
            <div className="profile-stat-num text-danger">{favorites.length}</div>
            <div className="text-xs text-muted">Favori</div>
          </div>
          <div className="text-center">
            <div className="profile-stat-num text-blue">{entries.length}</div>
            <div className="text-xs text-muted">Başlık</div>
          </div>
        </div>
      </div>

      <div className="tabs-bar" role="tablist" aria-label="Profil sekmeleri">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'watchlist'}
          className={`tab-pill${activeTab === 'watchlist' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          <Bookmark size={16} /> İzleme Listem ({watchlist.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'favorites'}
          className={`tab-pill${activeTab === 'favorites' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Heart size={16} /> Favorilerim ({favorites.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'entries'}
          className={`tab-pill${activeTab === 'entries' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('entries')}
        >
          <MessageSquare size={16} /> FilmSözlük Başlıklarım ({entries.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`tab-pill${activeTab === 'history' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} /> CineBot Geçmişim ({history.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'settings'}
          className={`tab-pill${activeTab === 'settings' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Profil Ayarları
        </button>
      </div>

      {activeTab === 'watchlist' && renderSavedGrid(watchlist, 'watchlist')}
      {activeTab === 'favorites' && renderSavedGrid(favorites, 'favorites')}

      {activeTab === 'entries' && (
        <div>
          {entries.length === 0 ? (
            <div className="state-box">
              <h3 className="state-box-title">Henüz FilmSözlük&apos;te başlık açmadınız</h3>
              <Link href="/filmsozluk" className="btn btn-primary btn-sm">
                FilmSözlük&apos;e Git
              </Link>
            </div>
          ) : (
            <div className="forum-preview-grid">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/filmsozluk?entry=${encodeURIComponent(entry.id)}`}
                  className="forum-preview-card"
                >
                  <h3 className="forum-preview-title">{entry.title}</h3>
                  <p className="forum-preview-excerpt">{entry.content}</p>
                  <div className="forum-preview-meta">
                    <span>{entry.likesCount} Beğeni</span>
                    <span>{entry.commentsCount} Yorum</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="state-box">
              <h3 className="state-box-title">CineBot öneri geçmişiniz boş</h3>
              <Link href="/cinebot" className="btn btn-primary btn-sm">
                <Sparkles size={14} /> CineBot&apos;a Sor
              </Link>
            </div>
          ) : (
            <div className="flex-col gap-14">
              {history.map((item) => (
                <div key={item.id} className="surface-card p-18">
                  <div className="flex-between flex-wrap gap-12 mb-10">
                    <strong>&ldquo;{item.query}&rdquo;</strong>
                    <Link
                      href={`/cinebot?mode=${item.mode}&movie=${encodeURIComponent(item.query)}&genre=${item.genre}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Tekrar Çalıştır
                    </Link>
                  </div>
                  <div className="flex-row flex-wrap gap-8">
                    {item.suggestions.map((s) => (
                      <Link key={s.id} href={`/movie/${s.id}`} className="badge badge-blue">
                        {s.title} ({s.year})
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <form className="surface-card max-w-540" onSubmit={handleSaveProfile}>
          <h2 className="m-0 mb-18 text-lg">Profil Bilgilerini Düzenle</h2>

          <div className="form-field">
            <label htmlFor="profile-username" className="form-label">
              Kullanıcı Adı
            </label>
            <input
              id="profile-username"
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              minLength={2}
              maxLength={40}
              required
            />
          </div>

          <div className="form-field">
            <span className="form-label">Hazır Avatarlar</span>
            <div className="avatar-picker-grid">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`avatar-choice${newAvatar === av.url ? ' is-selected' : ''}`}
                  onClick={() => setNewAvatar(av.url)}
                >
                  <Image src={av.url} alt={av.label} width={52} height={52} />
                  <span className="avatar-choice-label">{av.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="custom-avatar-upload" className="form-label">
              Veya Kendi Avatarınızı Yükleyin (JPG/PNG/WebP, max 2 MB)
            </label>
            <div>
              <label htmlFor="custom-avatar-upload" className="btn btn-secondary btn-sm">
                <Upload size={14} /> {uploadingAvatar ? 'Yükleniyor...' : 'Dosya Seç'}
              </label>
              <input
                id="custom-avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile || uploadingAvatar}
          >
            {savingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </form>
      )}
    </div>
  );
}
