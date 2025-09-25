import { fetchMovieDetails, fetchPopularTV, fetchTrendingMovies, getTrailer, imageUrl } from './api.js';
import { createBackgroundPlayer } from './youtube.js';

export function addShowCard(container, item, { wide = false } = {}) {
	if (!container) throw new Error('Container element is required');
	if (!item) return;
	const existingCards = container.getElementsByClassName('media-card').length;
	const card = document.createElement('article');
	card.className = `media-card${wide ? ' wide' : ''}`;
	card.tabIndex = existingCards;

	const title = item.title || item.name || 'Sans titre';
	const posterPath = item.poster_path || item.backdrop_path;
	const poster = imageUrl(posterPath, wide ? 'w780' : 'w342') || 'https://placehold.co/400x600?text=No+Image';

	card.innerHTML = `
        <img class="poster shimmer" alt="${escapeHtml(title)}" loading="lazy" src="${poster}" />
        <div class="info">
            <h3 class="title">${escapeHtml(title)}</h3>
        </div>
    `;
	container.appendChild(card);
}

export function renderList(container, items, { wide = false } = {}) {
	if (!container) return;
	container.innerHTML = '';
	(items || []).forEach(item => addShowCard(container, item, { wide }));
}

export async function initHome() {
	try {
		const [tv, movies] = await Promise.all([
			fetchPopularTV({ page: 1, language: 'fr-FR' }),
			fetchTrendingMovies({ time_window: 'week', page: 1, language: 'fr-FR' })
		]);

		const containers = {
			tv: document.querySelector('#series .media-row'),
			movies: document.querySelector('#films .media-row')
		};
		renderList(containers.tv, tv);
		renderList(containers.movies, movies);

		const hero = document.getElementById('home');
		if (!hero || !movies || !movies.length) {
			return;
		}
		const top = movies[0];
		// Récupère des détails supplémentaires pour enrichir le hero
		let details = null;
		try {
			details = await fetchMovieDetails(top.id);
		} catch (e) {
			console.warn('Impossible de charger les détails du film, fallback minimal', e);
		}

		const title = (top.title || top.name || '');
		const backdrop = top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : '';
		const year = (details?.release_date || top.release_date || '')?.slice(0, 4) || '';
		const runtimeMin = details?.runtime || null;
		const runtime = `${Math.floor(runtimeMin / 60)}h ${runtimeMin % 60}min`.trim() || '';
		const vote = (top.vote_average && top.vote_average > 0) ? top.vote_average.toFixed(1) : null;
		const genres = (details?.genres || [])
			.slice(0, 3)
			.map(g => g.name)
			.filter(Boolean);
		const overview = (details?.overview || top.overview || '').trim();

		hero.innerHTML = `
                <div class="hero-video" aria-hidden="true"></div>
                <div class="hero-content">
                    <h1>${title}</h1>
                    <div class="hero-meta">
                        ${year ? `<span class="meta">${year}</span>` : ''}
                        ${year && runtime ? `<span class="dot">•</span>` : ''}
                        ${runtime ? `<span class="meta">${runtime}</span>` : ''}
                        ${(year || runtime) && genres.length ? `<span class="dot">•</span>` : ''}
                        ${genres.length ? `<span class="meta genres">${genres.map(g => `<span class="badge">${g}</span>`).join('')}</span>` : ''}
						${vote ? `<span class="badge rating">★ ${vote}</span>` : ''}
					</div>
                    ${overview ? `<p class="hero-overview">${overview.length > 220 ? overview.slice(0, 217) + '…' : overview}</p>` : ''}
                    <div class="hero-actions">
                        <a class="button primary" data-action="play" rel="noopener">Lecture</a>
                        <a class="button" href="/movie.html?id=${top.id}" rel="noopener">Plus d'infos</a>
                    </div>
                </div>
            `;

		// Fallback image while loading
		hero.style.background = backdrop ? `url('${backdrop}') center/cover no-repeat` : 'var(--bg-elev)';

		const trailer = await getTrailer(top.id, 'movie');
		const videoContainer = hero.querySelector('.hero-video');
		const videoId = trailer?.key || null;
		if (videoContainer && videoId) {
			try {
				await createBackgroundPlayer(videoContainer, videoId);
			} catch (e) {
				console.warn('YT background failed, keeping image backdrop', e);
			}
		}

		const playBtn = hero.querySelector('.hero-actions .btn.btn-primary[data-action="play"]');
		if (playBtn) {
			if (videoId) {
				playBtn.href = `https://www.youtube.com/watch?v=${videoId}`;
				playBtn.setAttribute('aria-label', `Lecture: bande-annonce de ${title}`);
			} else {
				playBtn.href = '#';
				playBtn.classList.add('is-disabled');
				playBtn.setAttribute('aria-disabled', 'true');
			}
		}
	} catch (err) {
		console.error('Erreur de chargement TMDB:', err);
	}
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
