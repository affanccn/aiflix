# 🎬 AiFlix - Yapay Zeka Destekli Film Keşif Platformu

AiFlix, sinemaseverlerin sevdikleri filmlere benzer yapımları bulmasını, ruh hallerine veya istedikleri temaya göre yapay zeka destekli öneriler almasını ve **FilmSözlük** topluluğunda diğer kullanıcılarla tartışmasını sağlayan modern bir web platformudur.

---

## 🚀 Öne Çıkan Özellikler

- **🧠 Çift Modlu CineBot (AI Film Öneri Motoru):**
  - **Film Bazlı Öneri:** İzlediğiniz ve sevdiğiniz filmi yazarak tematik, görsel ve kurgusal olarak en yakın filmleri keşfedin.
  - **Ruh Hali & Tema (Prompt) Modu:** Hayalinizdeki film atmosferini veya modunuzu doğal dille yazın (Örn: *"Yağmurlu bir gecede izlenecek ters köşe yapan gerilim"*), yapay zeka sizin için en uygun filmleri çıkarsın.
  - **AI Eşleşme Sebebi:** Her önerilen film için özel *"Neden Bu Film?"* analizi.
- **🔥 Haftanın Trend Filmleri:** Ana sayfada TMDB'den canlı çekilen popüler ve trend filmler vitrini.
- **💬 FilmSözlük (Sosyal Tartışma Platformu):** Firebase Firestore tabanlı başlık açma, yorum yapma, yanıtlama ve beğenme özellikleri.
- **🔐 Firebase Kimlik Doğrulama:** E-posta/şifre ile güvenli kayıt olma, giriş yapma ve profil avatarı yönetimi.
- **⚡ Vercel & Serverless Uyumlu:** Vercel üzerinde tek tıkla canlıya alınabilir mimari.

---

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js (Vercel Serverless Function uyumlu)
- **Frontend:** HTML5, CSS3 (Modern Glassmorphism, Responsive), Vanilla JavaScript
- **API'ler:**
  - The Movie Database (TMDB) REST API (Film detayları, afişler, fragmanlar, puanlar)
  - Google Gemini API / OpenAI API (Doğal dil öneri analizi)
  - Firebase Authentication & Cloud Firestore (Kullanıcı ve Sözlük veritabanı)

---

## 💻 Yerel Geliştirme (Localhost)

Projeyi bilgisayarınızda çalıştırmak için:

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Çevre Değişkenlerini Ayarlayın (İsteğe bağlı):**
   `.env.example` dosyasını kopyalayıp `.env` adıyla kaydedin:
   ```env
   TMDB_API_KEY=b2b675bb84525726b8c8cea1c8aed29b
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=
   PORT=3000
   ```
   *(Not: `GEMINI_API_KEY` olmadan da sistem akıllı TMDB algoritmasıyla eksiksiz çalışır!)*

3. **Sunucuyu başlatın:**
   ```bash
   npm start
   ```

4. Tarayıcınızda açın:
   👉 **http://localhost:3000**

---

## 🌐 Vercel Üzerinde Yayına Alma (Deploy)

Bu proje Vercel Serverless Function mimarisine tam uyumlu hale getirilmiştir (`vercel.json` ve `api/index.js` hazırdır).

### Yöntem 1: GitHub Üzerinden Vercel'e Bağlama (En Kolay)

1. **Projeyi GitHub deponuza gönderin:**
   ```bash
   git init
   git add .
   git commit -m "feat: Vercel deployment and enhanced CineBot AI"
   git branch -M main
   git remote add origin https://github.com/affanccn/aiflix.git
   git push -u origin main --force
   ```

2. [Vercel](https://vercel.com) hesabınıza giriş yapın.
3. **"Add New"** > **"Project"** butonuna tıklayın.
4. `affanccn/aiflix` deponuzu seçip **"Import"** deyin.
5. **Environment Variables** bölümüne isteğe bağlı değişkenlerinizi ekleyin:
   - `TMDB_API_KEY` (Varsayılan anahtar kod içinde tanımlıdır, dilerseniz kendi anahtarınızı girebilirsiniz)
   - `GEMINI_API_KEY` (Google AI Studio'dan ücretsiz alacağınız anahtar)
6. **"Deploy"** butonuna basın. Projeniz birkaç saniye içinde canlıya alınacaktır! 🎉

---

## 📂 Proje Yapısı

```
aiflix/
├── api/
│   └── index.js            # Vercel Serverless giriş noktası
├── pages/
│   ├── cinebot.html        # Gelişmiş CineBot AI öneri sayfası
│   ├── filmsozluk.html     # FilmSözlük tartışma sayfası
│   ├── auth.html           # Giriş & Kayıt sayfası
│   └── error.html          # 404 sayfası
├── public/
│   ├── css/                # Tasarım ve stiller
│   ├── img/                # Görseller, avatarlar ve videolar
│   └── js/
│       ├── cinebot.js      # CineBot istemci mantığı & fragman modalı
│       ├── auth.js         # Firebase Auth servisleri
│       ├── firebase-config.js
│       └── script.js       # Global topbar arama ve kullanıcı menüsü
├── index.html              # Ana sayfa (Trend filmler + Hero arama)
├── server.js               # Express sunucusu & AI API endpoint'leri
├── vercel.json             # Vercel yönlendirme ve yapılandırması
├── package.json
└── README.md
```

---

## 📄 Lisans
Bu proje açık kaynaklıdır. İstediğiniz gibi geliştirebilir ve yayınlayabilirsiniz.
