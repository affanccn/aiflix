// AiFlix - Safe Search Icon Toggle
if (typeof window.searchIconAttached === 'undefined') {
    window.searchIconAttached = true;
    const sIcon = document.getElementById('searchIcon');
    const sEngine = document.getElementById('searchEngine');

    if (sIcon && sEngine) {
        sIcon.addEventListener('click', () => {
            sEngine.classList.toggle('active');
        });
    }
}
