import { fetchPopularTV, fetchTrendingMovies } from "./js/api.js";
import { renderList } from "./js/dom.js";
import { loadTheme, setupThemeSwitcher } from "./js/theme.js";

window.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupThemeSwitcher();
    initHome();
    // If URL has a hash, ensure correct section is active and visible
    const hash = window.location.hash;
    if (hash) {
        const target = document.getElementById(hash.substring(1));
        if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }
});

async function initHome() {
    try {
        const [tv, movies] = await Promise.all([
            fetchPopularTV({ page: 1, language: 'fr-FR' }),
            fetchTrendingMovies({ time_window: 'week', page: 1, language: 'fr-FR' })
        ]);

        const tvContainer = document.querySelector('#series .media-row');
        renderList(tvContainer, tv);

        const moviesContainer = document.querySelector('#films .media-row');
        renderList(moviesContainer, movies);

        // Hero: première tendance
        const hero = document.querySelector('#home');
        if (hero && movies && movies.length) {
            const top = movies[2];
			console.log(top);
            const backdrop = top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : '';
            hero.style.background = backdrop ? `url('${backdrop}') center/cover no-repeat` : 'var(--bg-elev)';
			hero.innerHTML = `
                <div class="hero-content">
                    <h1>${(top.title || top.name || 'Tendances')}</h1>
                </div>
            `;
        }
    } catch (err) {
        console.error('Erreur de chargement TMDB:', err);
    }
}