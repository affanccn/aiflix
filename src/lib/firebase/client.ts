'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let appCheckInitialized = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (
    typeof window !== 'undefined' &&
    !appCheckInitialized &&
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  ) {
    try {
      initializeAppCheck(appInstance, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckInitialized = true;
    } catch (err) {
      console.warn('[AiFlix] App Check başlatma uyarısı:', err);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) dbInstance = getFirestore(app);
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!storageInstance) storageInstance = getStorage(app);
  return storageInstance;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Firebase Auth hata kodlarını anlaşılır Türkçe mesajlara çevirir.
 */
export function getTurkishAuthError(codeOrMessage: unknown): string {
  const code = typeof codeOrMessage === 'string' ? codeOrMessage : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi ile zaten bir hesap bulunuyor.';
    case 'auth/invalid-email':
      return 'Lütfen geçerli bir e-posta adresi girin.';
    case 'auth/weak-password':
      return 'Şifreniz çok zayıf. En az 8 karakter, harf ve rakam kullanın.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta adresi veya şifre hatalı.';
    case 'auth/user-disabled':
      return 'Bu hesap geçici olarak devre dışı bırakılmış.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı.';
    case 'auth/popup-blocked':
      return 'Tarayıcınız açılır pencereyi engelledi. Lütfen izin verip tekrar deneyin.';
    case 'auth/account-exists-with-different-credential':
      return 'Bu e-posta adresi farklı bir giriş yöntemiyle zaten kayıtlı.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edin.';
    case 'auth/requires-recent-login':
      return 'Güvenlik nedeniyle bu işlem için yeniden giriş yapmanız gerekiyor.';
    default:
      return 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

/**
 * Firestore/Storage hata kodlarını anlaşılır Türkçe mesajlara çevirir.
 */
export function getTurkishFirestoreError(code: unknown): string {
  switch (code) {
    case 'permission-denied':
      return 'Bu işlem için yetkiniz bulunmuyor. Lütfen giriş yaptığınızdan emin olun.';
    case 'unauthenticated':
      return 'Bu işlemi yapmak için giriş yapmalısınız.';
    case 'not-found':
      return 'İstenen kayıt bulunamadı veya silinmiş olabilir.';
    case 'resource-exhausted':
      return 'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.';
    case 'unavailable':
      return 'Veritabanı servisine şu an ulaşılamıyor. Lütfen tekrar deneyin.';
    case 'storage/unauthorized':
      return 'Görsel yüklemek için giriş yapmalı ve sadece 2 MB altı JPG/PNG/WebP seçmelisiniz.';
    case 'storage/canceled':
      return 'Dosya yükleme iptal edildi.';
    default:
      return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
  }
}
