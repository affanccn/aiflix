'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase/client';
import {
  normalizeAvatarUrl,
  sanitizeImageUrl,
  validateImageFile,
} from '@/lib/security';
import type {
  CineBotHistoryItem,
  ForumComment,
  ForumEntry,
  MovieSummary,
  SavedMovie,
} from '@/types';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase bağlantısı yapılandırılmamış.');
  return db;
}

function toIsoDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapEntryDoc(d: QueryDocumentSnapshot<DocumentData>): ForumEntry {
  const data = d.data();
  const legacyLikes = typeof data.likes === 'number' ? data.likes : 0;
  const legacyCommentsCount = Array.isArray(data.comments) ? data.comments.length : 0;

  return {
    id: d.id,
    title: typeof data.title === 'string' ? data.title : 'Başlıksız',
    content: typeof data.content === 'string' ? data.content : '',
    author: typeof data.author === 'string' ? data.author : 'Anonim',
    authorId: typeof data.authorId === 'string' ? data.authorId : '',
    authorImage: normalizeAvatarUrl(data.authorImage),
    imageUrl: sanitizeImageUrl(data.imageUrl ?? data.image),
    movieId: typeof data.movieId === 'number' ? data.movieId : null,
    movieTitle: typeof data.movieTitle === 'string' ? data.movieTitle : null,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : legacyLikes,
    commentsCount:
      typeof data.commentsCount === 'number' ? data.commentsCount : legacyCommentsCount,
    createdAt: toIsoDate(data.createdAt ?? data.date),
    updatedAt: data.updatedAt ? toIsoDate(data.updatedAt) : undefined,
  };
}

// -----------------------------------------------------------------------------
// FilmSözlük (Entries, Subcollection Comments, Subcollection Likes, Reports)
// -----------------------------------------------------------------------------

export async function fetchForumEntries(params: {
  sortBy: 'newest' | 'popular';
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<{
  entries: ForumEntry[];
  lastCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const db = requireDb();
  const pageSize = params.pageSize ?? 8;
  const entriesRef = collection(db, 'entries');

  const sortField = params.sortBy === 'popular' ? 'likesCount' : 'createdAt';

  try {
    const constraints = [
      orderBy(sortField, 'desc'),
      ...(params.cursor ? [startAfter(params.cursor)] : []),
      limit(pageSize + 1),
    ];
    const snap = await getDocs(query(entriesRef, ...constraints));
    const hasMore = snap.docs.length > pageSize;
    const slice = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    return {
      entries: slice.map(mapEntryDoc),
      lastCursor: slice.length > 0 ? slice[slice.length - 1] : null,
      hasMore,
    };
  } catch {
    // Eski dokümanlarda createdAt / likesCount indeksi yoksa sıralamasız güvenli okuma yapıp bellekte sırala
    const snap = await getDocs(query(entriesRef, limit(50)));
    const mapped = snap.docs.map(mapEntryDoc);
    mapped.sort((a, b) =>
      params.sortBy === 'popular'
        ? b.likesCount - a.likesCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      entries: mapped.slice(0, pageSize),
      lastCursor: null,
      hasMore: false,
    };
  }
}

export async function fetchLatestForumEntries(count = 4): Promise<ForumEntry[]> {
  const { entries } = await fetchForumEntries({ sortBy: 'newest', pageSize: count });
  return entries;
}

export async function fetchUserEntries(uid: string): Promise<ForumEntry[]> {
  const db = requireDb();
  const q = query(collection(db, 'entries'), where('authorId', '==', uid), limit(30));
  const snap = await getDocs(q);
  return snap.docs
    .map(mapEntryDoc)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function uploadEntryImage(uid: string, file: File): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Depolama servisi yapılandırılmamış.');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileRef = ref(storage, `entries/${uid}/${safeName}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

export async function uploadUserAvatar(uid: string, file: File): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Depolama servisi yapılandırılmamış.');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileRef = ref(storage, `avatars/${uid}/${Date.now()}.${ext}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

export async function createForumEntry(params: {
  user: User;
  title: string;
  content: string;
  imageFile?: File | null;
  movieId?: number | null;
  movieTitle?: string | null;
}): Promise<string> {
  const db = requireDb();
  const title = params.title.trim();
  const content = params.content.trim();

  if (title.length < 3 || title.length > 120) {
    throw new Error('Başlık 3 ile 120 karakter arasında olmalıdır.');
  }
  if (content.length < 10 || content.length > 5000) {
    throw new Error('İçerik 10 ile 5000 karakter arasında olmalıdır.');
  }

  let imageUrl: string | null = null;
  if (params.imageFile) {
    imageUrl = await uploadEntryImage(params.user.uid, params.imageFile);
  }

  const author = (
    params.user.displayName ||
    params.user.email?.split('@')[0] ||
    'Sinemasever'
  ).slice(0, 60);

  const docRef = await addDoc(collection(db, 'entries'), {
    title,
    content,
    author,
    authorId: params.user.uid,
    authorImage: normalizeAvatarUrl(params.user.photoURL),
    imageUrl,
    movieId: params.movieId ?? null,
    movieTitle: params.movieTitle ? params.movieTitle.slice(0, 120) : null,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateForumEntry(params: {
  entryId: string;
  title: string;
  content: string;
  imageUrl?: string | null;
}): Promise<void> {
  const db = requireDb();
  const title = params.title.trim();
  const content = params.content.trim();
  if (title.length < 3 || title.length > 120) {
    throw new Error('Başlık 3 ile 120 karakter arasında olmalıdır.');
  }
  if (content.length < 10 || content.length > 5000) {
    throw new Error('İçerik 10 ile 5000 karakter arasında olmalıdır.');
  }

  await updateDoc(doc(db, 'entries', params.entryId), {
    title,
    content,
    imageUrl: sanitizeImageUrl(params.imageUrl) ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteForumEntry(entryId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, 'entries', entryId));
}

export async function hasUserLikedEntry(entryId: string, uid: string): Promise<boolean> {
  const db = requireDb();
  const likeSnap = await getDoc(doc(db, 'entries', entryId, 'likes', uid));
  return likeSnap.exists();
}

export async function toggleEntryLike(
  entryId: string,
  uid: string
): Promise<{ liked: boolean; likesCount: number }> {
  const db = requireDb();
  const entryRef = doc(db, 'entries', entryId);
  const likeRef = doc(db, 'entries', entryId, 'likes', uid);

  return runTransaction(db, async (tx) => {
    const [entrySnap, likeSnap] = await Promise.all([tx.get(entryRef), tx.get(likeRef)]);
    if (!entrySnap.exists()) {
      throw new Error('Başlık bulunamadı.');
    }

    const data = entrySnap.data();
    const current =
      typeof data.likesCount === 'number'
        ? data.likesCount
        : typeof data.likes === 'number'
          ? data.likes
          : 0;

    if (likeSnap.exists()) {
      const nextCount = Math.max(0, current - 1);
      tx.delete(likeRef);
      tx.update(entryRef, { likesCount: nextCount });
      return { liked: false, likesCount: nextCount };
    } else {
      const nextCount = current + 1;
      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(entryRef, { likesCount: nextCount });
      return { liked: true, likesCount: nextCount };
    }
  });
}

export async function fetchEntryComments(entryId: string): Promise<ForumComment[]> {
  const db = requireDb();
  const commentsRef = collection(db, 'entries', entryId, 'comments');
  const snap = await getDocs(query(commentsRef, orderBy('createdAt', 'asc'), limit(100)));

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      author: typeof data.author === 'string' ? data.author : 'Anonim',
      authorId: typeof data.authorId === 'string' ? data.authorId : '',
      authorImage: normalizeAvatarUrl(data.authorImage),
      content: typeof data.content === 'string' ? data.content : '',
      parentId: typeof data.parentId === 'string' ? data.parentId : null,
      likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
      createdAt: toIsoDate(data.createdAt),
    };
  });
}

export async function addEntryComment(params: {
  entryId: string;
  user: User;
  content: string;
  parentId?: string | null;
}): Promise<ForumComment> {
  const db = requireDb();
  const content = params.content.trim();
  if (content.length < 1 || content.length > 2000) {
    throw new Error('Yorum 1 ile 2000 karakter arasında olmalıdır.');
  }

  const author = (
    params.user.displayName ||
    params.user.email?.split('@')[0] ||
    'Sinemasever'
  ).slice(0, 60);
  const authorImage = normalizeAvatarUrl(params.user.photoURL);
  const entryRef = doc(db, 'entries', params.entryId);
  const newCommentRef = doc(collection(db, 'entries', params.entryId, 'comments'));

  await runTransaction(db, async (tx) => {
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists()) throw new Error('Başlık bulunamadı.');
    const data = entrySnap.data();
    const current = typeof data.commentsCount === 'number' ? data.commentsCount : 0;

    tx.set(newCommentRef, {
      author,
      authorId: params.user.uid,
      authorImage,
      content,
      parentId: params.parentId ?? null,
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(entryRef, { commentsCount: current + 1 });
  });

  return {
    id: newCommentRef.id,
    author,
    authorId: params.user.uid,
    authorImage,
    content,
    parentId: params.parentId ?? null,
    likesCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteEntryComment(entryId: string, commentId: string): Promise<void> {
  const db = requireDb();
  const entryRef = doc(db, 'entries', entryId);
  const commentRef = doc(db, 'entries', entryId, 'comments', commentId);

  await runTransaction(db, async (tx) => {
    const entrySnap = await tx.get(entryRef);
    tx.delete(commentRef);
    if (entrySnap.exists()) {
      const current =
        typeof entrySnap.data().commentsCount === 'number' ? entrySnap.data().commentsCount : 0;
      tx.update(entryRef, { commentsCount: Math.max(0, current - 1) });
    }
  });
}

export async function toggleCommentLike(
  entryId: string,
  commentId: string,
  uid: string
): Promise<{ liked: boolean; likesCount: number }> {
  const db = requireDb();
  const commentRef = doc(db, 'entries', entryId, 'comments', commentId);
  const likeRef = doc(db, 'entries', entryId, 'comments', commentId, 'likes', uid);

  return runTransaction(db, async (tx) => {
    const [commentSnap, likeSnap] = await Promise.all([tx.get(commentRef), tx.get(likeRef)]);
    if (!commentSnap.exists()) throw new Error('Yorum bulunamadı.');
    const current =
      typeof commentSnap.data().likesCount === 'number' ? commentSnap.data().likesCount : 0;

    if (likeSnap.exists()) {
      const next = Math.max(0, current - 1);
      tx.delete(likeRef);
      tx.update(commentRef, { likesCount: next });
      return { liked: false, likesCount: next };
    } else {
      const next = current + 1;
      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(commentRef, { likesCount: next });
      return { liked: true, likesCount: next };
    }
  });
}

export async function submitContentReport(params: {
  reporterId: string;
  targetType: 'entry' | 'comment';
  targetId: string;
  entryId: string;
  reason: string;
}): Promise<void> {
  const db = requireDb();
  const reason = params.reason.trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error('Şikayet sebebi 3 ile 500 karakter arasında olmalıdır.');
  }

  await addDoc(collection(db, 'reports'), {
    reporterId: params.reporterId,
    targetType: params.targetType,
    targetId: params.targetId,
    entryId: params.entryId,
    reason,
    createdAt: serverTimestamp(),
  });
}

// -----------------------------------------------------------------------------
// Kullanıcı Profili, Favoriler, İzleme Listesi & CineBot Geçmişi
// -----------------------------------------------------------------------------

export async function syncUserProfileDoc(params: {
  uid: string;
  email: string;
  username: string;
  photoURL: string;
}): Promise<void> {
  const db = requireDb();
  await setDoc(
    doc(db, 'users', params.uid),
    {
      uid: params.uid,
      email: params.email,
      username: params.username.trim().slice(0, 40),
      photoURL: normalizeAvatarUrl(params.photoURL),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function fetchSavedMovies(
  uid: string,
  listType: 'favorites' | 'watchlist'
): Promise<SavedMovie[]> {
  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, 'users', uid, listType), orderBy('addedAt', 'desc'), limit(100))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: Number(data.id ?? d.id),
      title: String(data.title || ''),
      posterPath: typeof data.posterPath === 'string' ? data.posterPath : null,
      voteAverage: typeof data.voteAverage === 'number' ? data.voteAverage : 0,
      year: String(data.year || ''),
      addedAt: toIsoDate(data.addedAt),
    };
  });
}

export async function isMovieInUserList(
  uid: string,
  listType: 'favorites' | 'watchlist',
  movieId: number
): Promise<boolean> {
  const db = requireDb();
  const snap = await getDoc(doc(db, 'users', uid, listType, String(movieId)));
  return snap.exists();
}

export async function toggleSavedMovie(
  uid: string,
  listType: 'favorites' | 'watchlist',
  movie: Pick<MovieSummary, 'id' | 'title' | 'posterPath' | 'voteAverage' | 'year'>
): Promise<boolean> {
  const db = requireDb();
  const refDoc = doc(db, 'users', uid, listType, String(movie.id));
  const snap = await getDoc(refDoc);
  if (snap.exists()) {
    await deleteDoc(refDoc);
    return false;
  }
  await setDoc(refDoc, {
    id: movie.id,
    title: movie.title,
    posterPath: movie.posterPath ?? null,
    voteAverage: movie.voteAverage ?? 0,
    year: movie.year ?? '',
    addedAt: serverTimestamp(),
  });
  return true;
}

export async function saveCineBotHistory(
  uid: string,
  entry: Omit<CineBotHistoryItem, 'id' | 'createdAt'>
): Promise<void> {
  const db = requireDb();
  await addDoc(collection(db, 'users', uid, 'cinebotHistory'), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export async function fetchCineBotHistory(uid: string): Promise<CineBotHistoryItem[]> {
  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'cinebotHistory'), orderBy('createdAt', 'desc'), limit(15))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      query: String(data.query || ''),
      mode: data.mode === 'vibe' ? 'vibe' : 'movie',
      genre: String(data.genre || 'all'),
      engine: data.engine === 'gemini' ? 'gemini' : 'tmdb_smart',
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      createdAt: toIsoDate(data.createdAt),
    };
  });
}
