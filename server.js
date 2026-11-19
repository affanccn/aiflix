const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Global fetch desteği (Node 18+ yerleşik fetch, aksi halde node-fetch)
const fetchFn = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Keys
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b2b675bb84525726b8c8cea1c8aed29b";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiMmI2NzViYjg0NTI1NzI2YjhjOGNlYTFjOGFlZDI5YiIsIm5iZiI6MTc0MjE5MjEwNS4zODcsInN1YiI6IjY3ZDdiZGU5NTk2M2ViZmZkZTdjMjBhYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.SHoIwfLdXe8RgMv7yzmvcYNs-JXotRhdKpK5oI1IDsw";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Genre ID haritası
const GENRE_MAP = {
    'all': null,
    'action': 28,
    'adventure': 12,
    'animation': 16,
    'comedy': 35,
    'crime': 80,
    'documentary': 99,
    'drama': 18,
    'family': 10751,
    'fantasy': 14,
    'history': 36,
    'horror': 27,
    'music': 10402,
    'mystery': 9648,
    'romance': 10749,
    'sci-fi': 878,
    'thriller': 53,
    'war': 10752,
    'western': 37
};

const GENRE_NAMES_TR = {
    28: 'Aksiyon',
    12: 'Macera',
    16: 'Animasyon',
    35: 'Komedi',
    80: 'Suç',
    99: 'Belgesel',
    18: 'Dram',
    10751: 'Aile',
    14: 'Fantastik',
    36: 'Tarih',
    27: 'Korku',
    10402: 'Müzik',
    9648: 'Gizem',
    10749: 'Romantik',
    878: 'Bilim Kurgu',
    53: 'Gerilim',
    10752: 'Savaş',
    37: 'Vahşi Batı'
};

// Güvenli ve hızlı fetch fonksiyonu
async function fetchSafe(url, options = {}, retries = 1) {
    try {
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'AiFlix/2.0 (Movie Recommendation Platform)',
            ...(options.headers || {})
        };

        if (url.includes('themoviedb.org') && TMDB_ACCESS_TOKEN && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${TMDB_ACCESS_TOKEN}`;
        }

        const response = await fetchFn(url, {
            ...options,
            headers
        });
        return response;
    } catch (error) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 300));
            return fetchSafe(url, options, retries - 1);
        }
        throw error;
    }
}

// Film detaylarını al (Optimize edilmiş tekil istek)
async function getMovieDetails(movieId) {
    try {
        const [trRes, vidRes] = await Promise.all([
            fetchSafe(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=tr-TR`, {}, 1),
            fetchSafe(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`, {}, 1)
        ]);

        const trData = trRes.ok ? await trRes.json() : {};
        const vidData = vidRes.ok ? await vidRes.json() : {};

        const trailer = (vidData.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || (vidData.results || [])[0];
        const genres = (trData.genres || []).map(g => g.name);

        return {
            id: movieId,
            title: trData.title || trData.original_title || 'İsimsiz Film',
            original_title: trData.original_title || trData.title || '',
            overview: trData.overview || 'Bu film için henüz Türkçe özet bulunmuyor.',
            poster_path: trData.poster_path || null,
            backdrop_path: trData.backdrop_path || null,
            release_date: trData.release_date || '',
            vote_average: typeof trData.vote_average === 'number' ? trData.vote_average.toFixed(1) : '7.5',
            vote_count: trData.vote_count || 0,
            runtime: trData.runtime || null,
            genres: genres.length > 0 ? genres : ['Sinema'],
            trailerKey: trailer?.key || null,
            tmdb_url: `https://www.themoviedb.org/movie/${movieId}`
        };
    } catch (error) {
        console.error(`Film #${movieId} detay hatası:`, error.message);
        return null;
    }
}

// Belirli bir filmin fragman YouTube anahtarını getir
async function getMovieTrailer(movieId) {
    try {
        const res = await fetchSafe(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=tr-TR`, {}, 1);
        const data = await res.json();
        let trailer = (data.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));

        if (!trailer) {
            const enRes = await fetchSafe(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`, {}, 1);
            const enData = await enRes.json();
            trailer = (enData.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || (enData.results || [])[0];
        }

        return trailer?.key || null;
    } catch (error) {
        console.error(`Film #${movieId} fragman hatası:`, error.message);
        return null;
    }
}

// -------------------------------------------------------------------
// AI Öneri Motoru (Gemini veya OpenAI) - Hızlı ve Zaman Aşımı Korumalı
// -------------------------------------------------------------------
async function getAiRecommendations(promptText, numberOfSuggestions, genreName) {
    // 1. Google Gemini API
    if (GEMINI_API_KEY) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // En fazla 4 saniye bekle

            const systemPrompt = `Sen sinema eleştirmeni ve AI film öneri uzmanısın. Kullanıcıya en uygun ${numberOfSuggestions} filmi öner. ${genreName && genreName !== 'all' ? `Tür: ${genreName}.` : ''}
Yanıtını YALNIZCA geçerli bir JSON array olarak ver. Örnek: [{"title": "Başlangıç", "original_title": "Inception", "year": 2010, "aiReason": "..."}]`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const res = await fetchSafe(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\nİstek: "${promptText}"` }] }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800
                    }
                })
            }, 0);

            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = rawText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return { source: 'gemini', list: parsed };
                    }
                }
            }
        } catch (e) {
            console.warn('[AiFlix] Gemini önerisi atlandı (Zaman aşımı veya hata):', e.message);
        }
    }

    // 2. OpenAI API
    if (OPENAI_API_KEY) {
        try {
            const res = await fetchSafe('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Sen AI film öneri uzmanısın. Kullanıcıya en uygun ${numberOfSuggestions} filmi JSON array olarak öner. Her eleman: { "title": "...", "original_title": "...", "year": 2020, "aiReason": "..." } içersin. Sadece saf JSON dön.`
                        },
                        {
                            role: 'user',
                            content: `İstek: "${promptText}". ${genreName && genreName !== 'all' ? 'Tür: ' + genreName : ''}`
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (res.ok) {
                const data = await res.json();
                let raw = data.choices?.[0]?.message?.content || '';
                raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return { source: 'openai', list: parsed };
                }
            }
        } catch (e) {
            console.error('OpenAI öneri hatası:', e.message);
        }
    }

    return null;
}

// -------------------------------------------------------------------
// Statik Dosyalar ve Sayfa Yönlendirmeleri
// -------------------------------------------------------------------
app.use('/public', express.static(path.join(__dirname, 'public'), {
    maxAge: '1h'
}));

app.use('/pages', express.static(path.join(__dirname, 'pages')));

function sendNoCacheHtml(res, filePath) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(filePath);
}

// Ana sayfa
app.get('/', (req, res) => {
    sendNoCacheHtml(res, path.join(__dirname, 'index.html'));
});

// Cinebot sayfası
app.get('/cinebot', (req, res) => {
    sendNoCacheHtml(res, path.join(__dirname, 'pages', 'cinebot.html'));
});

// FilmSözlük sayfası
app.get(['/filmsozluk', '/filmsözlük'], (req, res) => {
    sendNoCacheHtml(res, path.join(__dirname, 'pages', 'filmsozluk.html'));
});

// Giriş / Kayıt sayfası
app.get('/auth', (req, res) => {
    sendNoCacheHtml(res, path.join(__dirname, 'pages', 'auth.html'));
});

// -------------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------------

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'AiFlix Backend',
        hasGemini: !!GEMINI_API_KEY,
        hasOpenAI: !!OPENAI_API_KEY,
        hasTmdb: !!TMDB_API_KEY,
        uptime: process.uptime()
    });
});

// Trend Filmler (Ana sayfa için)
app.get('/api/trending', async (req, res) => {
    try {
        const response = await fetchSafe(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (!response.ok) {
            return res.status(500).json({ error: 'Trend filmler alınamadı' });
        }
        const data = await response.json();
        const movies = (data.results || []).slice(0, 12).map(m => ({
            id: m.id,
            title: m.title || m.original_title,
            original_title: m.original_title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            vote_average: m.vote_average ? m.vote_average.toFixed(1) : null,
            release_date: m.release_date,
            overview: m.overview || 'Özet bulunamadı.'
        }));
        res.json({ results: movies });
    } catch (error) {
        console.error('Trend filmler hatası:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Belirli bir filmin fragmanını getir
app.get(['/api/trailer/:movieId', '/api/trailer'], async (req, res) => {
    try {
        const movieId = req.params.movieId || req.query.movieId || req.query.id;
        if (!movieId) return res.status(400).json({ error: 'Film ID gerekli' });
        const trailerKey = await getMovieTrailer(movieId);
        res.json({ trailerKey, youtubeUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Film Arama
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Arama terimi girilmedi' });

        const response = await fetchSafe(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ana Film Önerisi Endpoint'i (POST ve GET destekli)
app.all('/api/movie-suggestions', async (req, res) => {
    try {
        const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
        const movieName = body.movieName || body.movie || req.query.movieName || req.query.movie;
        const numberOfSuggestions = body.numberOfSuggestions || body.limit || req.query.numberOfSuggestions || req.query.limit || 4;
        const genre = body.genre || req.query.genre || 'all';
        const mode = body.mode || req.query.mode || 'movie';

        if (!movieName || typeof movieName !== 'string' || !movieName.trim()) {
            return res.status(400).json({ error: 'Lütfen bir film adı veya aradığınız film tarzını girin.' });
        }

        const count = Math.min(Math.max(parseInt(numberOfSuggestions) || 4, 1), 10);
        const targetGenreId = GENRE_MAP[genre] || null;
        const targetGenreName = targetGenreId ? GENRE_NAMES_TR[targetGenreId] : null;

        console.log(`[AiFlix] İstek: "${movieName}", Adet: ${count}, Tür: ${genre} (${targetGenreName || 'Tümü'}), Mod: ${mode}`);

        let originalMovieData = null;
        let suggestionsList = [];
        let engineUsed = 'tmdb_smart';

        // 1. ADIM: Yapay Zeka (Gemini / OpenAI) Denemesi
        const aiResult = await getAiRecommendations(movieName, count, targetGenreName);

        if (aiResult && aiResult.list && aiResult.list.length > 0) {
            engineUsed = aiResult.source;
            console.log(`[AiFlix] AI (${engineUsed}) ${aiResult.list.length} film önerdi, TMDB ile eşleştiriliyor...`);

            // AI'ın önerdiği filmleri TMDB'den detaylandır
            const enrichedAiMovies = await Promise.all(
                aiResult.list.slice(0, count).map(async (item) => {
                    try {
                        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(item.original_title || item.title)}&language=tr-TR${item.year ? `&year=${item.year}` : ''}`;
                        const sRes = await fetchSafe(searchUrl);
                        const sData = await sRes.json();
                        const found = sData.results?.[0];

                        if (found) {
                            const details = await getMovieDetails(found.id);
                            if (details) {
                                return {
                                    ...details,
                                    aiReason: item.aiReason || `${item.title}, aradığınız temaya ve sinematik atmosfere harika uyum sağlıyor.`
                                };
                            }
                        }

                        // TMDB'de tam bulunamazsa AI verisini koru
                        return {
                            id: null,
                            title: item.title,
                            original_title: item.original_title || item.title,
                            overview: item.aiReason || 'Yapay zeka tarafından özel olarak seçilmiş öneri.',
                            poster_path: null,
                            release_date: item.year ? `${item.year}` : '',
                            vote_average: '8.0',
                            genres: targetGenreName ? [targetGenreName] : ['Özel Seçim'],
                            aiReason: item.aiReason
                        };
                    } catch (e) {
                        return null;
                    }
                })
            );

            suggestionsList = enrichedAiMovies.filter(Boolean);
        }

        // 2. ADIM: AI yoksa veya yetersiz sonuç verdiyse Akıllı TMDB Algoritması
        if (suggestionsList.length === 0) {
            console.log('[AiFlix] TMDB Akıllı Algoritması devreye giriyor...');
            engineUsed = 'tmdb_smart';

            // Kullanıcının yazdığı filmi TMDB'de ara
            const movieSearchRes = await fetchSafe(
                `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieName)}&language=tr-TR`
            );
            const movieSearchData = await movieSearchRes.json();
            const foundMovie = movieSearchData.results?.[0];

            let candidateMovies = [];

            if (foundMovie) {
                // Bulunan film detayları
                originalMovieData = await getMovieDetails(foundMovie.id);

                // Hem recommendations hem similar uç noktalarını birleştirerek zengin bir havuz elde et
                const [recRes, simRes] = await Promise.all([
                    fetchSafe(`${TMDB_BASE_URL}/movie/${foundMovie.id}/recommendations?api_key=${TMDB_API_KEY}&language=tr-TR`),
                    fetchSafe(`${TMDB_BASE_URL}/movie/${foundMovie.id}/similar?api_key=${TMDB_API_KEY}&language=tr-TR`)
                ]);

                const recData = recRes.ok ? await recRes.json() : { results: [] };
                const simData = simRes.ok ? await simRes.json() : { results: [] };

                const pool = [...(recData.results || []), ...(simData.results || [])];
                const seen = new Set([foundMovie.id]);

                pool.forEach(m => {
                    if (!seen.has(m.id)) {
                        seen.add(m.id);
                        candidateMovies.push(m);
                    }
                });
            }

            // Eğer spesifik film bulunamadıysa veya havuz azsa, türe veya popülerliğe göre keşfet
            if (candidateMovies.length === 0 || candidateMovies.length < count) {
                const genreFilter = targetGenreId ? `&with_genres=${targetGenreId}` : '';
                const discRes = await fetchSafe(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=tr-TR&sort_by=popularity.desc&page=1${genreFilter}`
                );
                if (discRes.ok) {
                    const discData = await discRes.json();
                    (discData.results || []).forEach(m => {
                        if (!candidateMovies.some(c => c.id === m.id)) {
                            candidateMovies.push(m);
                        }
                    });
                }
            }

            // Tür filtresi varsa uygula
            let filtered = candidateMovies;
            if (targetGenreId) {
                const genreMatches = candidateMovies.filter(m => m.genre_ids && m.genre_ids.includes(targetGenreId));
                if (genreMatches.length > 0) {
                    filtered = genreMatches;
                }
            }

            // Puan ve popülerliğe göre sırala
            filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

            const selectedCandidates = filtered.slice(0, count);

            if (selectedCandidates.length === 0) {
                return res.status(404).json({ error: 'Aradığınız kriterlere uygun film önerisi bulunamadı.' });
            }

            // Her film için detayları ve AI tarzı nedenini oluştur
            suggestionsList = await Promise.all(
                selectedCandidates.map(async (movie) => {
                    const details = await getMovieDetails(movie.id);
                    if (!details) return null;

                    const matchReason = originalMovieData
                        ? `"${originalMovieData.title}" filmindeki atmosfer, konu derinliği ve ${targetGenreName || (details.genres[0] || 'sinematik')} unsurları seven izleyiciler için yüksek eşleşme puanına (${details.vote_average || '8.0'}/10) sahip.`
                        : `"${movieName}" arayışınıza ve ${targetGenreName || 'film'} tutkunuzun beklentilerine hitap eden, güçlü anlatımıyla öne çıkan bir yapım.`;

                    return {
                        ...details,
                        aiReason: matchReason
                    };
                })
            );

            suggestionsList = suggestionsList.filter(Boolean);
        }

        // Eğer orijinal film varsa ama detay alınmadıysa ilk aramadan çek
        if (!originalMovieData) {
            originalMovieData = {
                title: movieName,
                overview: `"${movieName}" için yapay zeka ve TMDB analizleri tamamlandı.`,
                poster_path: suggestionsList[0]?.backdrop_path || null
            };
        }

        res.json({
            originalMovie: originalMovieData,
            suggestions: suggestionsList,
            engine: engineUsed,
            count: suggestionsList.length
        });

    } catch (error) {
        console.error('[AiFlix] Film önerisi genel hatası:', error);
        res.status(500).json({
            error: 'Film önerileri alınırken bir hata oluştu: ' + error.message
        });
    }
});

// Port ve Başlatma
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎬 AiFlix sunucusu http://localhost:${PORT} adresinde hazır!`);
    });
}

module.exports = app;
