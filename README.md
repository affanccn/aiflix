# 🎬 AiFlix v2 — Yapay Zeka Destekli Film Keşif & Sinema Topluluğu

AiFlix; **Next.js (App Router) + TypeScript**, **Google Gemini AI (yapılandırılmış JSON)**, **TMDB API** ve **Firebase (Auth, Cloud Firestore, Storage, App Check)** üzerine inşa edilmiş güvenli, hızlı ve modern bir sinema platformudur.

---

## ✨ Özellikler

- **🧠 CineBot AI:** Çift modlu (*Sevdiğim Filme Benzer* & *Ruh Halime Göre*) yapay zeka öneri motoru. Gemini çıktısı JSON Schema + Zod ile doğrulanır, TMDB ile eşleştirilir (eşleşmeyen hayali filmler elenir) ve "Neden Önerildi?" açıklamasıyla sunulur.
- **🔥 Haftanın Trend Filmleri:** 2x5 masaüstü ızgara ve yatay kaydırmalı carousel desteği, skeleton yükleme, hata/yeniden dene akışı.
- **🎞️ Film Detay Sayfası (`/movie/[id]`):** Afiş, özet, yönetmen, oyuncu kadrosu, gömülü YouTube fragmanı, benzer filmler, İzleme Listesi / Favoriler ve dinamik `Movie` Schema.org JSON-LD + Open Graph.
- **🔎 Gelişmiş Arama (`/search`):** Debounce'lu canlı arama, tür ve vizyon yılı filtreleri, sayfalama.
- **💬 FilmSözlük (`/filmsozluk`):** XSS korumalı, ölçeklenebilir alt koleksiyon veri modeli (`entries/{id}/comments`, `entries/{id}/likes`), cursor tabanlı sayfalama, sıralama (*En Yeni / En Popüler*), sahip bazlı düzenleme/silme, içerik şikayet sistemi ve Firebase Storage görsel yükleme (max 2 MB, JPG/PNG/WebP).
- **🔐 Gelişmiş Kimlik Doğrulama & Profil (`/auth`, `/profile`):** E-posta/şifre (min 8 karakter + güç göstergesi), Google ile giriş, e-posta doğrulama, şifremi unuttum, profil düzenleme, Favorilerim, İzleme Listem ve CineBot öneri geçmişi.

---

## 💻 Kurulum (Yerel Geliştirme)

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Ortam Değişkenlerini Hazırlayın

`.env.example` dosyasını `.env.local` olarak kopyalayıp kendi anahtarlarınızla doldurun:

```bash
cp .env.example .env.local
```

> **Güvenlik Notu:** `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`, `GEMINI_API_KEY` ve `FIREBASE_PRIVATE_KEY` değerleri **yalnızca sunucu tarafında** kullanılır ve istemciye asla gönderilmez. `.env.local` dosyasını kesinlikle Git'e eklemeyin.

### 3. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

---

## 🔥 Firebase Kurulumu, Güvenlik Kuralları ve App Check

### 1. Firestore & Storage Kurallarını Yayınlama

Proje kökündeki `firestore.rules`, `firestore.indexes.json` ve `storage.rules` dosyalarını Firebase projenize (`aiflix-f7b94`) dağıtmak için:

```bash
npm install -g firebase-tools
firebase login
firebase use aiflix-f7b94
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 2. Firebase Console Ayarları (Manuel Zorunlu Adımlar)

1. **Google ile Giriş:** Firebase Console &rarr; *Authentication* &rarr; *Sign-in method* &rarr; **Google** sağlayıcısını etkinleştirin.
2. **Yetkili Alan Adları:** *Authentication* &rarr; *Settings* &rarr; *Authorized domains* listesinde `aiflix-rho.vercel.app` ve `localhost` bulunduğundan emin olun.
3. **API Anahtarına Domain Kısıtlaması (Google Cloud Console):**
   - [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials) sayfasına gidin ve Firebase Web API anahtarınızı seçin.
   - **Application restrictions** &rarr; **Websites (HTTP referrers)** seçin ve şu alan adlarını ekleyin:
     - `https://aiflix-rho.vercel.app/*`
     - `https://*.vercel.app/*` *(yalnızca preview deployment kullanıyorsanız)*
     - `http://localhost:3000/*` *(yerel geliştirme için)*
4. **Firebase App Check (reCAPTCHA v3):**
   - [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) üzerinden `aiflix-rho.vercel.app` için bir **reCAPTCHA v3** anahtarı oluşturun.
   - Firebase Console &rarr; *App Check* &rarr; Web uygulamanızı seçin &rarr; **reCAPTCHA v3** secret key'ini girin.
   - Site Key'i `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` olarak Vercel Environment Variables'a ekleyin.
   - Ardından App Check sekmesinde Firestore, Storage ve Auth için **Enforce** (Zorunlu Kıl) özelliğini açın.

### 3. Mevcut FilmSözlük Verileri için Migration (Yıkıcı Olmayan)

Eski sürümde `entries` belgelerindeki gömülü `comments[]` ve `likedBy[]` dizilerini yeni alt koleksiyon yapısına güvenle taşımak için:

```bash
# Önce kuru çalıştırma (sadece yedek alır ve planı yazdırır)
DRY_RUN=true npm run migrate:filmsozluk

# Gerçek geçiş (önce backups/ altına tam JSON yedeği alır, sonra alt koleksiyonlara taşır)
npm run migrate:filmsozluk
```

---

## 🌐 Vercel Üzerinde Yayına Alma (Deploy)

1. [Vercel Dashboard](https://vercel.com) &rarr; Projenizi (`aiflix`) seçin &rarr; **Settings** &rarr; **Environment Variables**.
2. `.env.example` içindeki tüm değişkenleri **Production** (ve gerekiyorsa Preview) için ekleyin:
   - `NEXT_PUBLIC_SITE_URL` (`https://aiflix-rho.vercel.app`)
   - `TMDB_API_KEY` ve/veya `TMDB_ACCESS_TOKEN`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` *(App Check için)*
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` *(Admin SDK ID token doğrulaması için)*
3. **Framework Preset:** `Next.js` (otomatik algılanır).
4. `main` dalına push yaptığınızda Vercel otomatik olarak üretim derlemesini alır ve yayınlar.

---

## 🧪 Testler ve Kod Kalitesi

```bash
npm run typecheck   # TypeScript tip kontrolü
npm run lint        # ESLint denetimi
npm run test        # Güvenlik, XSS, API, rate-limit ve rules testleri (Vitest)
npm run build       # Üretim build doğrulaması
```

### Firebase Emulator ile Canlı Rules Testi

```bash
firebase emulators:start --only firestore,storage
```
