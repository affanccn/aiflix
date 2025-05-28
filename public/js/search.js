// Eğer searchIcon zaten tanımlanmamışsa tanımla
if (typeof window.searchIcon === 'undefined') {
    window.searchIcon = document.getElementById('searchIcon');
    window.searchEngine = document.getElementById('searchEngine');

    window.searchIcon.addEventListener('click', () => {
        window.searchEngine.classList.toggle('active');
    });
}