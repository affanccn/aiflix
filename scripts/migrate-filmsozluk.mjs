#!/usr/bin/env node
/**
 * AiFlix FilmSözlük Veri Modeli Migration Scripti (Yıkıcı Olmayan / Idempotent)
 *
 * Ne yapar?
 * 1. Mevcut tüm `entries` dokümanlarını `backups/entries-backup-<timestamp>.json` dosyasına yedekler.
 * 2. Eski `entries/{id}` dokümanlarındaki gömülü `comments[]` ve `likedBy[]` dizilerini:
 *    - `entries/{id}/comments/{commentId}` (yanıtlar dahil, `parentId` ile)
 *    - `entries/{id}/likes/{uid}`
 *    alt koleksiyonlarına taşır.
 * 3. `likesCount`, `commentsCount`, `createdAt`, `imageUrl` alanlarını normalize eder.
 *    Mevcut dokümanları veya kullanıcı verilerini ASLA silmez.
 *
 * Kullanım:
 *   DRY_RUN=true node scripts/migrate-filmsozluk.mjs   (önce simülasyon)
 *   node scripts/migrate-filmsozluk.mjs                 (gerçek geçiş)
 *
 * Gerekli Ortam Değişkenleri:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const DRY_RUN = process.env.DRY_RUN === 'true';

function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'HATA: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ve FIREBASE_PRIVATE_KEY ortam değişkenleri gereklidir.'
    );
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return getFirestore();
}

function normalizeDate(value) {
  if (!value) return Timestamp.now();
  if (typeof value.toDate === 'function') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Timestamp.now() : Timestamp.fromDate(parsed);
}

function normalizeAvatar(url) {
  if (!url || typeof url !== 'string') return '/img/user/user-1.jpg';
  if (url.startsWith('/public/img/')) return url.replace('/public/img/', '/img/');
  if (url.startsWith('https://') || url.startsWith('/img/')) return url;
  return '/img/user/user-1.jpg';
}

function flattenReplies(replies, parentId, out) {
  if (!Array.isArray(replies)) return;
  for (const reply of replies) {
    const replyId = String(reply.id || `${parentId}-${out.length + 1}`);
    out.push({
      id: replyId,
      parentId,
      author: String(reply.author || 'Anonim').slice(0, 60),
      authorId: String(reply.authorId || 'legacy-user'),
      authorImage: normalizeAvatar(reply.authorImage),
      content: String(reply.content || '').slice(0, 2000),
      likesCount: Number(reply.likes || 0),
      likedBy: Array.isArray(reply.likedBy) ? reply.likedBy : [],
      createdAt: normalizeDate(reply.createdAt || reply.date),
    });
    if (Array.isArray(reply.replies) && reply.replies.length > 0) {
      flattenReplies(reply.replies, replyId, out);
    }
  }
}

async function run() {
  const db = initAdmin();
  console.log(`[Migration] Başlatılıyor (DRY_RUN=${DRY_RUN})...`);

  const snapshot = await db.collection('entries').get();
  console.log(`[Migration] Toplam ${snapshot.size} başlık bulundu.`);

  // 1. Tam Yedek Al
  const backupDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `entries-backup-${Date.now()}.json`);
  const backupPayload = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
  fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2), 'utf8');
  console.log(`[Migration] Yedek kaydedildi: ${backupFile}`);

  let migratedEntries = 0;
  let migratedComments = 0;
  let migratedLikes = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const entryRef = docSnap.ref;

    const legacyComments = Array.isArray(data.comments) ? data.comments : [];
    const legacyLikedBy = Array.isArray(data.likedBy) ? data.likedBy : [];

    // Yorumları ve iç içe yanıtları düzleştir
    const flatComments = [];
    for (const c of legacyComments) {
      const commentId = String(c.id || `c-${flatComments.length + 1}`);
      flatComments.push({
        id: commentId,
        parentId: null,
        author: String(c.author || 'Anonim').slice(0, 60),
        authorId: String(c.authorId || 'legacy-user'),
        authorImage: normalizeAvatar(c.authorImage),
        content: String(c.content || '').slice(0, 2000),
        likesCount: Number(c.likes || 0),
        likedBy: Array.isArray(c.likedBy) ? c.likedBy : [],
        createdAt: normalizeDate(c.createdAt || c.date),
      });
      flattenReplies(c.replies, commentId, flatComments);
    }

    const safeImageUrl =
      typeof data.imageUrl === 'string'
        ? data.imageUrl
        : typeof data.image === 'string' && data.image.startsWith('https://')
          ? data.image
          : null;

    const likesCount = Math.max(
      Number(data.likesCount ?? data.likes ?? 0),
      legacyLikedBy.length
    );

    const existingCommentsSnap = await entryRef.collection('comments').get();
    const commentsCount = Math.max(
      Number(data.commentsCount ?? 0),
      existingCommentsSnap.size,
      flatComments.length
    );

    const updateDocData = {
      title: String(data.title || 'Başlıksız').slice(0, 120),
      content: String(data.content || '').slice(0, 5000),
      author: String(data.author || 'Anonim').slice(0, 60),
      authorId: String(data.authorId || 'legacy-user'),
      authorImage: normalizeAvatar(data.authorImage),
      imageUrl: safeImageUrl,
      likesCount,
      commentsCount,
      createdAt: normalizeDate(data.createdAt || data.date),
      updatedAt: Timestamp.now(),
      migratedAt: Timestamp.now(),
    };

    if (DRY_RUN) {
      console.log(
        `[DRY_RUN] Entry ${docSnap.id}: ${flatComments.length} yorum, ${legacyLikedBy.length} beğeni taşınacak.`
      );
      continue;
    }

    const batch = db.batch();
    batch.set(entryRef, updateDocData, { merge: true });

    for (const uid of legacyLikedBy) {
      if (typeof uid !== 'string' || !uid) continue;
      const likeRef = entryRef.collection('likes').doc(uid);
      batch.set(
        likeRef,
        { uid, createdAt: normalizeDate(data.date) },
        { merge: true }
      );
      migratedLikes++;
    }

    for (const comment of flatComments) {
      const commentRef = entryRef.collection('comments').doc(comment.id);
      batch.set(
        commentRef,
        {
          author: comment.author,
          authorId: comment.authorId,
          authorImage: comment.authorImage,
          content: comment.content,
          parentId: comment.parentId,
          likesCount: comment.likesCount,
          createdAt: comment.createdAt,
          updatedAt: comment.createdAt,
        },
        { merge: true }
      );
      migratedComments++;
    }

    await batch.commit();
    migratedEntries++;
  }

  console.log(
    `[Migration] Tamamlandı! İşlenen başlık: ${migratedEntries}, yorum: ${migratedComments}, beğeni: ${migratedLikes}`
  );
}

run().catch((err) => {
  console.error('[Migration] Kritik hata:', err);
  process.exit(1);
});
