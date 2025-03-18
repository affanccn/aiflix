const API_KEY = "b2b675bb84525726b8c8cea1c8aed29b"; // TMDB API anahtarınız
const BASE_URL = "https://api.themoviedb.org/3";
const openAI_API_KEY = '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'; // OpenAI API anahtarınız

// Film önerisi fonksiyonu
async function getMovieSuggestions() {
    const movieInput = document.getElementById("movieInput").value.trim();
    const numberOfSuggestions = parseInt(document.getElementById("numberOfSuggestions").value);
    const genreSelect = document.getElementById("genreSelect").value;

    if (movieInput === "") {
        alert("Lütfen bir film adı girin.");
        return;
    }

    if (isNaN(numberOfSuggestions) || numberOfSuggestions < 1 || numberOfSuggestions > 10) {
        alert("Lütfen 1 ile 10 arasında bir sayı seçin.");
        return;
    }

    // Konteyner genişletme
    document.querySelector('.cinebot-container').classList.add('expanded');

    try {
        const response = await fetch('/api/movie-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                movieName: movieInput,
                numberOfSuggestions: numberOfSuggestions,
                genre: genreSelect
            })
        });

        if (!response.ok) {
            throw new Error('Film önerileri alınamadı');
        }

        const data = await response.json();
        displaySuggestions(data);

    } catch (error) {
        console.error('Error:', error);
        alert('Film önerileri alınırken bir hata oluştu.');
        // Hata durumunda konteyner boyutunu küçült
        document.querySelector('.cinebot-container').classList.remove('expanded');
    }
}

// Film açıklamasını almak için TMDB API'yi kullanalım
function getMovieDescription(movieName, genreId, numberOfSuggestions) {
    fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${movieName}`)
        .then(response => response.json())
        .then(data => {
            if (data.results.length > 0) {
                let movieId = data.results[0].id;
                fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=tr`)
                    .then(response => response.json())
                    .then(movieData => {
                        let movieDescription = movieData.overview;
                        fetchMovieSuggestions(genreId, numberOfSuggestions, movieDescription);
                    });
            }
        })
        .catch(error => console.error('Error fetching movie details:', error));
}

// Önerilen filmleri almak için TMDB API'yi kullanalım
function fetchMovieSuggestions(genreId, numberOfSuggestions, userMovieDescription) {
    fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`)
        .then(response => response.json())
        .then(data => {
            let suggestions = [];
            for (let i = 0; i < numberOfSuggestions; i++) {
                let randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
                suggestions.push(randomMovie);
            }
            displaySuggestions(suggestions, userMovieDescription);
        })
        .catch(error => console.error('Error fetching movie data:', error));
}

// Önerileri görüntüle
function displaySuggestions(data) {
    const suggestionsContainer = document.getElementById("suggestionsContainer");
    suggestionsContainer.innerHTML = `
        <div class="movie-details">
            <h3 class="selected-movie-title">Seçilen Film:</h3>
            <h2>${data.originalMovie.title}</h2>
            <div class="movie-details-content">
                <img src="https://image.tmdb.org/t/p/w500${data.originalMovie.poster_path}" 
                     alt="${data.originalMovie.title}"
                     onerror="this.src='/public/img/no-poster.jpg'">
                <div class="movie-details-text">
                    <p>${data.originalMovie.overview || 'Özet bulunamadı.'}</p>
                </div>
            </div>
        </div>
        <div class="suggestions-container">
            <div class="suggestions-text">
                <h3>Benzer Filmler</h3>
                ${formatSuggestions(data.suggestions)}
            </div>
        </div>
    `;
    
    // Önerileri göster
    setTimeout(() => {
        suggestionsContainer.classList.add('visible');
    }, 100);
}

// OpenAI'dan gelen önerileri formatla
function formatSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
        return '<p>Öneri bulunamadı.</p>';
    }

    return suggestions.map(movie => `
        <div class="suggestion-item">
            <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" 
                 alt="${movie.title}"
                 onerror="this.src='/public/img/no-poster.jpg'">
            <div class="suggestion-content">
                <strong>${movie.title}</strong>
                <div class="movie-description">
                    <span class="description-title">Film Açıklaması:</span>
                    <span class="description-text">${movie.overview || 'Film açıklaması bulunamadı.'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Kullanıcı filmi ile önerilen filmi karşılaştır ve benzerlik yazısını al
function compareWithUserMovie(userMovieDescription, movieDescription, movieElement) {
    fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "text-davinci-003",
            prompt: `The following is a comparison between two movies: one with the description "${userMovieDescription}" and the other with the description "${movieDescription}". Describe the similarities between the two movies.`,
            max_tokens: 150
        })
    })
    .then(response => response.json())
    .then(data => {
        let similarityText = data.choices[0].text.trim();
        
        // Eğer benzerlik yazısı boş gelirse, bunu belirtiyoruz.
        if (!similarityText) {
            similarityText = "Benzerlik açıklaması bulunamadı.";
        }

        // Benzerlik yazısını HTML olarak ekleyelim
        let similarityElement = document.createElement("p");
        similarityElement.textContent = `Benzerlik: ${similarityText}`;
        movieElement.appendChild(similarityElement);
    })
    .catch(error => console.error('Error comparing movies:', error));
}
