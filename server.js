const express = require('express');
const path = require('path');
const app = express();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const https = require('https');
const dns = require('dns');
require('dotenv').config();

// DNS ayarları
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS sunucularını kullan

// TMDB API yapılandırması
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b2b675bb84525726b8c8cea1c8aed29b";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// HTTPS agent yapılandırması
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    timeout: 60000,
    family: 4, // IPv4'ü zorla
    proxy: null, // Proxy kullanımını devre dışı bırak
    localAddress: null // Yerel adres kısıtlamasını kaldır
});

// Fetch yapılandırması
const fetchWithRetry = async (url, options = {}, retries = 3) => {
    try {
        const response = await fetch(url, {
            ...options,
            agent: httpsAgent,
            timeout: 30000,
            headers: {
                ...options.headers,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            proxy: null // Proxy kullanımını devre dışı bırak
        });
        return response;
    } catch (error) {
        console.error(`İstek hatası (${retries} deneme kaldı):`, error.message);
        if (retries > 0) {
            console.log(`Yeniden deneniyor... Kalan deneme: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
};

// Statik dosyaların sunulması
app.use('/public', express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));

// Pages klasöründeki dosyaları sunmak için
app.use('/pages', express.static(path.join(__dirname, 'pages')));

app.use(express.json());

// MIME type ayarları
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Cinebot sayfası yönlendirmesi
app.get('/cinebot', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'cinebot.html'));
});

// İngilizce metni Türkçeye çevir
async function translateToTurkish(text) {
    try {
        // URL'yi encode et
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodedText}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Çeviri API hatası');
        }

        const data = await response.json();
        
        // Google Translate yanıtını işle
        let translatedText = '';
        if (data && data[0]) {
            translatedText = data[0]
                .map(item => item[0])
                .join('');
        }

        return translatedText || null;
    } catch (error) {
        console.error('Çeviri hatası:', error);
        return null;
    }
}

// Film detaylarını al (hem TR hem EN)
async function getMovieDetails(movieId) {
    try {
        // Türkçe detayları al
        const trResponse = await fetchWithRetry(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const trData = await trResponse.json();
        
        // İngilizce detayları al
        const enResponse = await fetchWithRetry(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`);
        const enData = await enResponse.json();
        
        let overview = trData.overview;
        let title = trData.title;
        let isTranslated = false;
        
        // Eğer Türkçe başlık yoksa, İngilizce başlığı çevir
        if (!title && enData.title) {
            const translatedTitle = await translateToTurkish(enData.title);
            title = translatedTitle || enData.title;
        }
        
        // Eğer Türkçe açıklama yoksa ve İngilizce açıklama varsa, çeviri yap
        if (!overview && enData.overview) {
            const translatedOverview = await translateToTurkish(enData.overview);
            overview = translatedOverview;
            isTranslated = true;
        }
        
        return {
            title: title || enData.title,
            overview: overview ? (isTranslated ? `${overview} <span class="translated-text">(automatically translated via google translate api)</span>` : overview) : (enData.overview || 'Film açıklaması bulunamadı.'),
            poster_path: trData.poster_path || enData.poster_path
        };
    } catch (error) {
        console.error('Film detayları alınırken hata:', error);
        return null;
    }
}

// Film önerisi endpoint'i
app.post('/api/movie-suggestions', async (req, res) => {
    try {
        const { movieName, numberOfSuggestions, genre } = req.body;

        if (!movieName) {
            return res.status(400).json({ error: 'Film adı gerekli' });
        }

        console.log('Film arama isteği:', movieName);

        // TMDB'den film detaylarını al
        const movieResponse = await fetchWithRetry(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieName)}&language=tr-TR`);
        
        if (!movieResponse.ok) {
            const errorData = await movieResponse.json();
            throw new Error(`TMDB API hatası: ${errorData.status_message || movieResponse.statusText}`);
        }

        const movieData = await movieResponse.json();
        console.log('Film arama sonucu:', movieData.results?.length || 0, 'sonuç bulundu');

        if (!movieData.results || movieData.results.length === 0) {
            return res.status(404).json({ error: 'Film bulunamadı' });
        }

        const movie = movieData.results[0];
        console.log('Seçilen film:', movie.title);
        
        // TMDB'den benzer filmler al
        const similarMoviesResponse = await fetchWithRetry(
            `${TMDB_BASE_URL}/movie/${movie.id}/similar?api_key=${TMDB_API_KEY}&language=tr-TR`
        );
        
        if (!similarMoviesResponse.ok) {
            const errorData = await similarMoviesResponse.json();
            throw new Error(`Benzer filmler alınırken hata: ${errorData.status_message || similarMoviesResponse.statusText}`);
        }

        const similarMovies = await similarMoviesResponse.json();
        console.log('Benzer filmler bulundu:', similarMovies.results?.length || 0);

        // Genre ID'sini bul
        const genreMap = {
            'action': 28,
            'adventure': 12,
            'horror': 27,
            'comedy': 35,
            'drama': 18,
            'sci-fi': 878
        };

        const targetGenreId = genreMap[genre];
        console.log('Seçilen tür ID:', targetGenreId);

        // Filmleri filtrele
        const filteredMovies = similarMovies.results
            .filter(movie => movie.genre_ids.includes(targetGenreId))
            .slice(0, numberOfSuggestions);

        console.log('Filtrelenmiş film sayısı:', filteredMovies.length);

        if (filteredMovies.length === 0) {
            return res.status(404).json({ error: 'Seçilen türde benzer film bulunamadı' });
        }

        // Her film için detaylı bilgi al
        const detailedMovies = await Promise.all(
            filteredMovies.map(async (movie) => {
                const details = await getMovieDetails(movie.id);
                return details || movie;
            })
        );

        // Orijinal film için detaylı bilgi al
        const originalMovieDetails = await getMovieDetails(movie.id);

        res.json({
            originalMovie: originalMovieDetails || movie,
            suggestions: detailedMovies || []
        });

    } catch (error) {
        console.error('Film önerisi hatası:', error);
        res.status(500).json({ 
            error: error.message || 'Bilinmeyen bir hata oluştu',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
}); 