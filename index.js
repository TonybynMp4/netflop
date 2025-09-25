import { fetchPopularTV, fetchTrendingMovies, getTrailer } from "./js/api.js";
import { renderList } from "./js/dom.js";
import { loadTheme, setupThemeSwitcher } from "./js/theme.js";
import { createBackgroundPlayer } from "./js/youtube.js";

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

        const hero = document.querySelector('#home');
        if (hero && movies && movies.length) {
            const top = movies[0];
			//const details = await fetchMovieDetails(top.id);
            const title = (top.title || top.name || 'Tendances');
            const backdrop = top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : '';

            hero.innerHTML = `
                <div class="hero-video" aria-hidden="true"></div>
                <div class="hero-content">
                    <h1>${title}</h1>
                </div>
            `;

            // Fallback image while loading
            hero.style.background = backdrop ? `url('${backdrop}') center/cover no-repeat` : 'var(--bg-elev)';

            const trailer = await getTrailer(top.id);
            const videoContainer = hero.querySelector('.hero-video');
            const videoId = trailer?.key || null;
            if (videoContainer && videoId) {
                try {
                    await createBackgroundPlayer(videoContainer, videoId);
                } catch (e) {
                    console.warn('YT background failed, keeping image backdrop', e);
                }
            }
        }
    } catch (err) {
        console.error('Erreur de chargement TMDB:', err);
    }
}