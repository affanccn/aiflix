'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import {
  MessageSquare,
  Heart,
  PenSquare,
  Upload,
  Trash2,
  Edit3,
  Flag,
  Reply,
  Clock,
  Flame,
  LogIn,
  X,
  RotateCcw,
  Film,
  Send,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getTurkishFirestoreError } from '@/lib/firebase/client';
import {
  addEntryComment,
  createForumEntry,
  deleteEntryComment,
  deleteForumEntry,
  fetchEntryComments,
  fetchForumEntries,
  hasUserLikedEntry,
  submitContentReport,
  toggleCommentLike,
  toggleEntryLike,
  updateForumEntry,
} from '@/lib/firestore-service';
import { validateImageFile } from '@/lib/security';
import type { ForumComment, ForumEntry } from '@/types';

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FilmSozlukClient() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [entries, setEntries] = useState<ForumEntry[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState(searchParams.get('topic') || '');
  const [content, setContent] = useState('');
  const [movieId] = useState<number | null>(() => {
    const raw = searchParams.get('movieId');
    return raw && /^\d+$/.test(raw) ? Number(raw) : null;
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [likedEntryIds, setLikedEntryIds] = useState<Set<string>>(new Set());
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(
    searchParams.get('entry') || null
  );
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, ForumComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<{ entryId: string; commentId: string; author: string } | null>(null);

  const [reportModal, setReportModal] = useState<{
    targetType: 'entry' | 'comment';
    targetId: string;
    entryId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadEntries = useCallback(
    async (mode: 'reset' | 'more') => {
      if (mode === 'reset') {
        setLoading(true);
        setLoadError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetchForumEntries({
          sortBy,
          pageSize: 8,
          cursor: mode === 'more' ? cursor : null,
        });

        setEntries((prev) => (mode === 'more' ? [...prev, ...res.entries] : res.entries));
        setCursor(res.lastCursor);
        setHasMore(res.hasMore);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        setLoadError(getTurkishFirestoreError(code));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy, cursor]
  );

  useEffect(() => {
    setCursor(null);
    loadEntries('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  useEffect(() => {
    if (!user || entries.length === 0) {
      setLikedEntryIds(new Set());
      return;
    }

    let cancelled = false;
    Promise.all(
      entries.map(async (entry) => ({
        id: entry.id,
        liked: await hasUserLikedEntry(entry.id, user.uid).catch(() => false),
      }))
    ).then((statuses) => {
      if (cancelled) return;
      setLikedEntryIds(new Set(statuses.filter((s) => s.liked).map((s) => s.id)));
    });

    return () => {
      cancelled = true;
    };
  }, [user, entries]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Geçersiz dosya.', 'error');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Başlık açmak için giriş yapmalısınız.', 'info');
      return;
    }
    setSubmittingEntry(true);
    try {
      await createForumEntry({
        user,
        title,
        content,
        imageFile,
        movieId,
        movieTitle: movieId ? title : null,
      });
      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreviewUrl(null);
      showToast('Tartışma başlığınız yayınlandı!', 'success');
      await loadEntries('reset');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg = code ? getTurkishFirestoreError(code) : (err as Error).message;
      showToast(msg || 'Başlık oluşturulamadı.', 'error');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleSaveEdit = async (entry: ForumEntry) => {
    setSavingEdit(true);
    try {
      await updateForumEntry({
        entryId: entry.id,
        title: editTitle,
        content: editContent,
        imageUrl: entry.imageUrl,
      });
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, title: editTitle.trim(), content: editContent.trim() }
            : item
        )
      );
      setEditingId(null);
      showToast('Başlık güncellendi.', 'success');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(code ? getTurkishFirestoreError(code) : (err as Error).message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteForumEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      showToast('Başlık silindi.', 'info');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(getTurkishFirestoreError(code), 'error');
    }
  };

  const handleToggleLike = async (entryId: string) => {
    if (!user) {
      showToast('Beğenmek için giriş yapmalısınız.', 'info');
      return;
    }
    try {
      const res = await toggleEntryLike(entryId, user.uid);
      setLikedEntryIds((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(entryId);
        else next.delete(entryId);
        return next;
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, likesCount: res.likesCount } : e))
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(getTurkishFirestoreError(code), 'error');
    }
  };

  const loadComments = useCallback(async (entryId: string) => {
    setLoadingComments((prev) => ({ ...prev, [entryId]: true }));
    try {
      const list = await fetchEntryComments(entryId);
      setCommentsByEntry((prev) => ({ ...prev, [entryId]: list }));
    } catch {
      showToast('Yorumlar yüklenemedi.', 'error');
    } finally {
      setLoadingComments((prev) => ({ ...prev, [entryId]: false }));
    }
  }, [showToast]);

  const handleToggleComments = (entryId: string) => {
    if (openCommentsId === entryId) {
      setOpenCommentsId(null);
      return;
    }
    setOpenCommentsId(entryId);
    loadComments(entryId);
  };

  const handleSubmitComment = async (entryId: string) => {
    if (!user) {
      showToast('Yorum yazmak için giriş yapmalısınız.', 'info');
      return;
    }
    const text = (commentDrafts[entryId] || '').trim();
    if (!text) return;

    const parentId =
      replyTarget && replyTarget.entryId === entryId ? replyTarget.commentId : null;

    try {
      const created = await addEntryComment({
        entryId,
        user,
        content: text,
        parentId,
      });
      setCommentsByEntry((prev) => ({
        ...prev,
        [entryId]: [...(prev[entryId] || []), created],
      }));
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, commentsCount: e.commentsCount + 1 } : e))
      );
      setCommentDrafts((prev) => ({ ...prev, [entryId]: '' }));
      setReplyTarget(null);
      showToast('Yorumunuz eklendi.', 'success');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(code ? getTurkishFirestoreError(code) : (err as Error).message, 'error');
    }
  };

  const handleDeleteComment = async (entryId: string, commentId: string) => {
    try {
      await deleteEntryComment(entryId, commentId);
      setCommentsByEntry((prev) => ({
        ...prev,
        [entryId]: (prev[entryId] || []).filter((c) => c.id !== commentId),
      }));
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, commentsCount: Math.max(0, e.commentsCount - 1) } : e
        )
      );
      showToast('Yorum silindi.', 'info');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(getTurkishFirestoreError(code), 'error');
    }
  };

  const handleLikeComment = async (entryId: string, commentId: string) => {
    if (!user) {
      showToast('Yorum beğenmek için giriş yapmalısınız.', 'info');
      return;
    }
    try {
      const res = await toggleCommentLike(entryId, commentId, user.uid);
      setCommentsByEntry((prev) => ({
        ...prev,
        [entryId]: (prev[entryId] || []).map((c) =>
          c.id === commentId ? { ...c, likesCount: res.likesCount } : c
        ),
      }));
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(getTurkishFirestoreError(code), 'error');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportModal) return;
    setSubmittingReport(true);
    try {
      await submitContentReport({
        reporterId: user.uid,
        targetType: reportModal.targetType,
        targetId: reportModal.targetId,
        entryId: reportModal.entryId,
        reason: reportReason,
      });
      setReportModal(null);
      setReportReason('');
      showToast('Bildiriminiz alındı. İnceleme için teşekkür ederiz.', 'success');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      showToast(code ? getTurkishFirestoreError(code) : (err as Error).message, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="container page-section">
      <div className="forum-layout">
        <div className="page-intro">
          <span className="hero-eyebrow">
            <MessageSquare size={14} aria-hidden="true" /> Sinema Topluluğu
          </span>
          <h1 className="hero-title page-intro-title">
            Film<span className="hero-title-accent">Sözlük</span>
          </h1>
          <p className="hero-subtitle mb-0">
            İzlediğin filmler üzerine incelemeler yaz, teorileri tartış ve toplulukla etkileşime geç.
          </p>
        </div>

        <section className="surface-card" aria-labelledby="create-entry-heading">
          <h2 id="create-entry-heading" className="section-title text-lg mb-16">
            <PenSquare size={19} color="#ff6b08" aria-hidden="true" />
            Yeni Tartışma Başlığı Aç
          </h2>

          {!authLoading && !user ? (
            <div className="state-box">
              <p className="state-box-text">
                Başlık açmak, yorum yazmak veya beğeni göndermek için AiFlix hesabınızla giriş
                yapmanız gerekiyor. Tüm başlıkları misafir olarak okuyabilirsiniz.
              </p>
              <Link href="/auth" className="btn btn-primary btn-sm">
                <LogIn size={15} /> Giriş Yap / Kayıt Ol
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreateEntry}>
              <div className="form-field">
                <label htmlFor="entry-title" className="form-label">
                  Başlık ({title.length}/120)
                </label>
                <input
                  id="entry-title"
                  type="text"
                  className="form-input"
                  placeholder="Örn: Interstellar'ın sonundaki Tesseract sahnesi üzerine..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="entry-content" className="form-label">
                  Düşünceleriniz ({content.length}/5000)
                </label>
                <textarea
                  id="entry-content"
                  className="form-textarea"
                  placeholder="Film hakkındaki yorumunuzu, teorilerinizi veya önerinizi paylaşın..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  minLength={10}
                  maxLength={5000}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="entry-image-upload" className="form-label">
                  Görsel Ekle (İsteğe Bağlı — JPG, PNG, WebP, en fazla 2 MB)
                </label>
                <div className="flex-row flex-wrap gap-12">
                  <label htmlFor="entry-image-upload" className="btn btn-secondary btn-sm">
                    <Upload size={15} aria-hidden="true" />
                    {imageFile ? imageFile.name : 'Görsel Seç'}
                  </label>
                  <input
                    id="entry-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  {imagePreviewUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                    >
                      <X size={14} /> Görseli Kaldır
                    </button>
                  )}
                </div>

                {imagePreviewUrl && (
                  <div className="upload-preview-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Yüklenen görsel önizlemesi"
                      className="upload-preview-img"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingEntry || authLoading}
              >
                <Send size={15} aria-hidden="true" />
                {submittingEntry ? 'Yayınlanıyor...' : 'Başlığı Yayınla'}
              </button>
            </form>
          )}
        </section>

        <div className="forum-toolbar">
          <h2 className="section-title text-lg">Tartışmalar ({entries.length})</h2>
          <div className="flex-row gap-8" role="group" aria-label="Sıralama">
            <button
              type="button"
              className={`btn btn-sm ${sortBy === 'newest' ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={sortBy === 'newest'}
              onClick={() => setSortBy('newest')}
            >
              <Clock size={14} /> En Yeni
            </button>
            <button
              type="button"
              className={`btn btn-sm ${sortBy === 'popular' ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={sortBy === 'popular'}
              onClick={() => setSortBy('popular')}
            >
              <Flame size={14} /> En Popüler
            </button>
          </div>
        </div>

        {loading ? (
          <div aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="forum-entry-card">
                <div className="skeleton sk-entry-title" />
                <div className="skeleton sk-entry-body" />
                <div className="skeleton sk-entry-meta" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="state-box" role="alert">
            <MessageSquare size={38} color="#f87171" aria-hidden="true" />
            <h3 className="state-box-title">Tartışmalar yüklenemedi</h3>
            <p className="state-box-text">{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={() => loadEntries('reset')}>
              <RotateCcw size={15} /> Tekrar Dene
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="state-box">
            <Film size={40} color="#ff6b08" aria-hidden="true" />
            <h3 className="state-box-title">Henüz tartışma başlığı açılmamış</h3>
            <p className="state-box-text">
              Yukarıdaki formu kullanarak FilmSözlük&apos;teki ilk tartışmayı siz başlatabilirsiniz.
            </p>
          </div>
        ) : (
          <>
            {entries.map((entry) => {
              const isOwner = Boolean(user && entry.authorId === user.uid);
              const isLiked = likedEntryIds.has(entry.id);
              const isEditing = editingId === entry.id;
              const isCommentsOpen = openCommentsId === entry.id;
              const entryComments = commentsByEntry[entry.id] || [];
              const rootComments = entryComments.filter((c) => !c.parentId);
              const repliesByParent = entryComments.reduce<Record<string, ForumComment[]>>(
                (acc, c) => {
                  if (c.parentId) {
                    if (!acc[c.parentId]) acc[c.parentId] = [];
                    acc[c.parentId].push(c);
                  }
                  return acc;
                },
                {}
              );

              return (
                <article key={entry.id} className="forum-entry-card">
                  {isEditing ? (
                    <div>
                      <div className="form-field">
                        <label htmlFor={`edit-title-${entry.id}`} className="form-label">
                          Başlığı Düzenle
                        </label>
                        <input
                          id={`edit-title-${entry.id}`}
                          type="text"
                          className="form-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          minLength={3}
                          maxLength={120}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`edit-content-${entry.id}`} className="form-label">
                          İçeriği Düzenle
                        </label>
                        <textarea
                          id={`edit-content-${entry.id}`}
                          className="form-textarea"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          minLength={10}
                          maxLength={5000}
                        />
                      </div>
                      <div className="flex-row gap-10">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(entry)}
                        >
                          {savingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditingId(null)}
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="forum-entry-header">
                        <div>
                          <h3 className="forum-entry-title">{entry.title}</h3>
                          {entry.movieId && (
                            <Link
                              href={`/movie/${entry.movieId}`}
                              className="badge badge-blue mt-6"
                            >
                              <Film size={12} /> Film sayfasına git
                            </Link>
                          )}
                        </div>
                        <span className="text-xs text-muted nowrap">
                          {formatRelativeDate(entry.createdAt)}
                        </span>
                      </div>

                      {entry.imageUrl && (
                        <Image
                          src={entry.imageUrl}
                          alt={entry.title}
                          width={880}
                          height={380}
                          className="forum-entry-image"
                        />
                      )}

                      <p className="forum-entry-content">{entry.content}</p>

                      <div className="forum-entry-footer">
                        <span className="author-chip">
                          <Image
                            src={entry.authorImage}
                            alt={entry.author}
                            width={26}
                            height={26}
                            className="author-chip-avatar"
                          />
                          <strong>{entry.author}</strong>
                        </span>

                        <div className="forum-actions">
                          <button
                            type="button"
                            className={`btn btn-sm ${isLiked ? 'btn-danger' : 'btn-secondary'}`}
                            aria-pressed={isLiked}
                            aria-label={`Beğen (${entry.likesCount})`}
                            onClick={() => handleToggleLike(entry.id)}
                          >
                            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                            <span>{entry.likesCount}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            aria-expanded={isCommentsOpen}
                            onClick={() => handleToggleComments(entry.id)}
                          >
                            <MessageSquare size={14} />
                            <span>{entry.commentsCount} Yorum</span>
                          </button>

                          {isOwner && (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                aria-label="Başlığı düzenle"
                                onClick={() => {
                                  setEditingId(entry.id);
                                  setEditTitle(entry.title);
                                  setEditContent(entry.content);
                                }}
                              >
                                <Edit3 size={14} /> Düzenle
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                aria-label="Başlığı sil"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 size={14} /> Sil
                              </button>
                            </>
                          )}

                          {user && !isOwner && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              aria-label="İçeriği bildir"
                              title="Şikayet Et"
                              onClick={() =>
                                setReportModal({
                                  targetType: 'entry',
                                  targetId: entry.id,
                                  entryId: entry.id,
                                })
                              }
                            >
                              <Flag size={14} /> Bildir
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {isCommentsOpen && (
                    <div className="comments-panel">
                      {loadingComments[entry.id] ? (
                        <p className="text-muted text-sm">Yorumlar yükleniyor...</p>
                      ) : rootComments.length === 0 ? (
                        <p className="text-muted text-sm">
                          Henüz yorum yapılmamış. İlk yorumu siz yazın!
                        </p>
                      ) : (
                        rootComments.map((comment) => {
                          const replies = repliesByParent[comment.id] || [];
                          return (
                            <div key={comment.id}>
                              <div className="comment-card">
                                <div className="flex-between gap-10 mb-8">
                                  <span className="author-chip">
                                    <Image
                                      src={comment.authorImage}
                                      alt={comment.author}
                                      width={22}
                                      height={22}
                                      className="author-chip-avatar"
                                    />
                                    <strong>{comment.author}</strong>
                                    <span className="text-muted text-xs">
                                      {formatRelativeDate(comment.createdAt)}
                                    </span>
                                  </span>
                                  <div className="flex-row gap-6">
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-sm"
                                      aria-label="Yorumu beğen"
                                      onClick={() => handleLikeComment(entry.id, comment.id)}
                                    >
                                      <Heart size={13} /> {comment.likesCount}
                                    </button>
                                    {user && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() =>
                                          setReplyTarget({
                                            entryId: entry.id,
                                            commentId: comment.id,
                                            author: comment.author,
                                          })
                                        }
                                      >
                                        <Reply size={13} /> Yanıtla
                                      </button>
                                    )}
                                    {user && comment.authorId === user.uid && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        aria-label="Yorumu sil"
                                        onClick={() => handleDeleteComment(entry.id, comment.id)}
                                      >
                                        <Trash2 size={13} color="#f87171" />
                                      </button>
                                    )}
                                    {user && comment.authorId !== user.uid && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        aria-label="Yorumu bildir"
                                        onClick={() =>
                                          setReportModal({
                                            targetType: 'comment',
                                            targetId: comment.id,
                                            entryId: entry.id,
                                          })
                                        }
                                      >
                                        <Flag size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="m-0 text-secondary pre-wrap">{comment.content}</p>
                              </div>

                              {replies.map((reply) => (
                                <div key={reply.id} className="comment-card is-reply">
                                  <div className="flex-between mb-6">
                                    <span className="author-chip">
                                      <Image
                                        src={reply.authorImage}
                                        alt={reply.author}
                                        width={20}
                                        height={20}
                                        className="author-chip-avatar"
                                      />
                                      <strong>{reply.author}</strong>
                                      <span className="text-muted text-xs">
                                        {formatRelativeDate(reply.createdAt)}
                                      </span>
                                    </span>
                                    <div className="flex-row gap-6">
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleLikeComment(entry.id, reply.id)}
                                      >
                                        <Heart size={12} /> {reply.likesCount}
                                      </button>
                                      {user && reply.authorId === user.uid && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          aria-label="Yanıtı sil"
                                          onClick={() => handleDeleteComment(entry.id, reply.id)}
                                        >
                                          <Trash2 size={12} color="#f87171" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="m-0 text-secondary text-base">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}

                      {user ? (
                        <div className="mt-14">
                          {replyTarget && replyTarget.entryId === entry.id && (
                            <div className="reply-banner">
                              <span>
                                <strong>{replyTarget.author}</strong> kullanıcısının yorumuna yanıt
                                yazıyorsunuz
                              </span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setReplyTarget(null)}
                              >
                                <X size={14} /> İptal
                              </button>
                            </div>
                          )}
                          <label htmlFor={`comment-input-${entry.id}`} className="sr-only">
                            Yorumunuzu yazın
                          </label>
                          <textarea
                            id={`comment-input-${entry.id}`}
                            className="form-textarea comment-textarea-compact"
                            placeholder="Yorumunuzu yazın..."
                            maxLength={2000}
                            value={commentDrafts[entry.id] || ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSubmitComment(entry.id)}
                          >
                            <Send size={14} /> Yorum Gönder
                          </button>
                        </div>
                      ) : (
                        <p className="mt-12 text-sm text-muted">
                          Yorum yazmak için{' '}
                          <Link href="/auth" className="text-orange underline">
                            giriş yapın
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {hasMore && (
              <div className="text-center mt-24">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={loadingMore}
                  onClick={() => loadEntries('more')}
                >
                  {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Başlık Yükle'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {reportModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportModal(null);
          }}
        >
          <div className="modal-dialog modal-dialog-sm">
            <div className="modal-header">
              <h2 id="report-modal-title" className="modal-title">
                İçeriği Bildir
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Kapat"
                onClick={() => setReportModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSubmitReport}>
              <div className="form-field">
                <label htmlFor="report-reason" className="form-label">
                  Şikayet Sebebi
                </label>
                <textarea
                  id="report-reason"
                  className="form-textarea"
                  placeholder="Spam, hakaret, spoiler uyarısız içerik vb. nedenleri açıklayın..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  minLength={3}
                  maxLength={500}
                  required
                />
              </div>
              <div className="flex-end gap-10">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setReportModal(null)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
