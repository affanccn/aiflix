// AiFlix - CineBot Client Logic

let currentMode = 'movie';

// Mod değiştirme
function setMode(mode) {
    currentMode = mode;
    const btnMovie = document.getElementById('btnModeMovie');
    const btnVibe = document.getElementById('btnModeVibe');
    const inputLabel = document.getElementById('inputLabel');
    const movieInput = document.getElementById('movieInput');

    if (mode === 'movie') {
        btnMovie?.classList.add('active');
        btnVibe?.classList.remove('active');
        if (inputLabel) inputLabel.textContent = 'Film Adı:';
        if (movieInput) movieInput.placeholder = 'Örn: Inception, Interstellar, Fight Club, Gora...';
    } else {
        btnVibe?.classList.add('active');
        btnMovie?.classList.remove('active');
        if (inputLabel) inputLabel.textContent = 'Ruh Haliniz veya İstediğiniz Konu:';
        if (movieInput) movieInput.placeholder = 'Örn: Yağmurlu havada battaniye altında izlenecek sıcacık bir film...';
    }
}

// Hızlı ilham etiketine tıklandığında
function applyTag(text, genre) {
    setMode('ai');
    const input = document.getElementById('movieInput');
    const genreSelect = document.getElementById('genreSelect');

    if (input) input.value = text;
    if (genreSelect && genre) genreSelect.value = genre;

    getMovieSuggestions();
}

// Film önerilerini backend'den al
async function getMovieSuggestions() {
    const movieInput = document.getElementById('movieInput');
    const numberOfSuggestionsSelect = document.getElementById('numberOfSuggestions');
    const genreSelect = document.getElementById('genreSelect');
    const submitBtn = document.getElementById('submitBtn');
    const loadingContainer = document.getElementById('loadingContainer');
    const suggestionsContainer = document.getElementById('suggestionsContainer');

    const queryText = movieInput ? movieInput.value.trim() : '';
    const numberOfSuggestions = parseInt(numberOfSuggestionsSelect ? numberOfSuggestionsSelect.value : 4) || 4;
    const genre = genreSelect ? genreSelect.value : 'all';

    if (!queryText) {
        alert(currentMode === 'movie' ? 'Lütfen bir film adı girin.' : 'Lütfen aradığınız film konusunu veya ruh halinizi açıklayın.');
        if (movieInput) movieInput.focus();
        return;
    }

    // UI'ı yükleniyor durumuna al
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yapay Zeka Düşünüyor...';
    }
    if (loadingContainer) loadingContainer.style.display = 'block';
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';

    // Yükleme mesajlarını periyodik değiştir
    const loadingText = document.getElementById('loadingText');
    const messages = [
        'Yapay zeka film arşivini tarıyor...',
        'Sinematik atmosfer ve temalar karşılaştırılıyor...',
        'En uygun eşleşmeler puanlanıyor...',
        'Film afişleri ve detayları getiriliyor...'
    ];
    let msgIdx = 0;
    const intervalId = setInterval(() => {
        msgIdx = (msgIdx + 1) % messages.length;
        if (loadingText) loadingText.textContent = messages[msgIdx];
    }, 1800);

    try {
        const response = await fetch('/api/movie-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                movieName: queryText,
                numberOfSuggestions: numberOfSuggestions,
                genre: genre,
                mode: currentMode
            })
        });

        clearInterval(intervalId);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Film önerileri alınırken bir sorun oluştu.');
        }

        const data = await response.json();
        displaySuggestions(data, queryText);

        // Sonuçlara yumuşak kaydır
        setTimeout(() => {
            suggestionsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);

    } catch (error) {
        clearInterval(intervalId);
        console.error('CineBot Hatası:', error);
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = `
                <div style="background: rgba(235, 30, 30, 0.15); border: 1px solid rgba(235, 30, 30, 0.3); border-radius: 12px; padding: 25px; text-align: center; color: #ffb4b4;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 2.5rem; margin-bottom: 12px; color: #ff6b6b;"></i>
                    <h3 style="margin: 0 0 8px; color: #fff;">Öneriler Alınamadı</h3>
                    <p style="margin: 0 0 15px;">${error.message || 'Lütfen arama teriminizi değiştirip tekrar deneyin.'}</p>
                    <button onclick="getMovieSuggestions()" style="padding: 10px 20px; background: #e50914; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Tekrar Dene</button>
                </div>
            `;
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-sparkles"></i> Yapay Zeka İle Öneri Getir';
        }
        if (loadingContainer) loadingContainer.style.display = 'none';
    }
}

// Önerileri ekranda göster
function displaySuggestions(data, userQuery) {
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    if (!suggestionsContainer) return;

    const original = data.originalMovie || {};
    const suggestions = data.suggestions || [];
    const engine = data.engine || 'tmdb_smart';

    const engineNameMap = {
        'gemini': '<i class="fa-solid fa-brain"></i> Gemini AI Motoru',
        'openai': '<i class="fa-solid fa-microchip"></i> OpenAI GPT Motoru',
        'tmdb_smart': '<i class="fa-solid fa-bolt"></i> TMDB Akıllı Algoritması'
    };

    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 15px;">
                <i class="fa-solid fa-film" style="font-size: 3rem; color: #ff6b08; margin-bottom: 15px;"></i>
                <h3>Uygun film bulunamadı</h3>
                <p>Kriterleri biraz genişleterek veya türü 'Tümü' seçerek tekrar deneyebilirsiniz.</p>
            </div>
        `;
        return;
    }

    const cardsHtml = suggestions.map((movie) => {
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';

        const year = movie.release_date ? movie.release_date.split('-')[0] : '';
        const rating = movie.vote_average ? `${movie.vote_average}` : '7.5';
        const genresList = (movie.genres || []).slice(0, 3);
        const encodedTitle = encodeURIComponent(movie.title);

        return `
            <div class="movie-card">
                <div class="poster-wrap">
                    <img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80'">
                    <span class="rating-pill"><i class="fa-solid fa-star"></i> ${rating}</span>
                    ${year ? `<span class="year-pill">${year}</span>` : ''}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${movie.title}</h3>
                    ${movie.original_title && movie.original_title !== movie.title ? `<div class="card-original-title">${movie.original_title}</div>` : ''}
                    
                    <div class="genres-wrap">
                        ${genresList.map(g => `<span class="genre-badge">${g}</span>`).join('')}
                    </div>

                    ${movie.aiReason ? `
                        <div class="ai-reason-box">
                            <strong><i class="fa-solid fa-lightbulb"></i> Neden Bu Film?</strong>
                            ${movie.aiReason}
                        </div>
                    ` : ''}

                    <p class="card-overview">${movie.overview || 'Bu film için henüz Türkçe özet bulunmuyor.'}</p>

                    <div class="card-actions">
                        ${movie.trailerKey ? `
                            <button class="action-btn trailer-btn" onclick="openTrailerModal('${movie.trailerKey}', '${movie.title.replace(/'/g, "\\'")}')">
                                <i class="fa-solid fa-play"></i> Fragman
                            </button>
                        ` : `
                            <a href="https://www.youtube.com/results?search_query=${encodedTitle}+fragman" target="_blank" rel="noopener" class="action-btn trailer-btn">
                                <i class="fa-brands fa-youtube"></i> Fragman Ara
                            </a>
                        `}
                        <a href="/filmsozluk?topic=${encodedTitle}" class="action-btn discuss-btn" title="FilmSözlük'te bu film hakkında tartışma başlat">
                            <i class="fa-solid fa-comments"></i> Sözlük'te Tartış
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    suggestionsContainer.innerHTML = `
        <div class="query-summary">
            <div>
                <span style="font-size: 0.85rem; color: #ff6b08; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Öneri Sonuçları</span>
                <h3>${original.title ? `"${original.title}" İçin Öneriler` : `"${userQuery}" İçin Seçilen Filmler`}</h3>
            </div>
            <div class="engine-badge">
                ${engineNameMap[engine] || engine}
            </div>
        </div>

        <div class="suggestions-grid">
            ${cardsHtml}
        </div>
    `;
}

// Fragman Modal Fonksiyonları
function openTrailerModal(trailerKey, movieTitle) {
    const modal = document.getElementById('trailerModal');
    const iframe = document.getElementById('trailerIframe');
    if (modal && iframe) {
        iframe.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1`;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeTrailerModal(event) {
    if (event && event.target && event.target.closest('.modal-inner')) {
        return;
    }
    const modal = document.getElementById('trailerModal');
    const iframe = document.getElementById('trailerIframe');
    if (modal && iframe) {
        iframe.src = '';
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Sayfa yüklendiğinde URL parametrelerini kontrol et (Örn: /cinebot?movie=Inception)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const movieParam = urlParams.get('movie') || urlParams.get('q');
    const genreParam = urlParams.get('genre');

    if (movieParam) {
        const input = document.getElementById('movieInput');
        if (input) {
            input.value = movieParam;
            if (genreParam) {
                const genreSelect = document.getElementById('genreSelect');
                if (genreSelect) genreSelect.value = genreParam;
            }
            getMovieSuggestions();
        }
    }
});
