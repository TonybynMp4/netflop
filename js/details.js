import { fetchMovieCredits, fetchMovieDetails, fetchTvCredits, fetchTvDetails, fetchTvSeason, getTrailer, imageUrl } from './api.js';
import { loadTheme, setupThemeSwitcher } from './theme.js';
import { createBackgroundPlayer } from './youtube.js';

function getQuery() {
    const p = new URLSearchParams(window.location.search);
    const type = (p.get('type') || '').toLowerCase();
    const id = Number(p.get('id'));
    return { type: (type === 'tv' ? 'tv' : 'movie'), id: isFinite(id) ? id : null };
}

window.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    setupThemeSwitcher();

    const { type, id } = getQuery();
    if (!id) {
        renderError('Identifiant manquant.');
        return;
    }

    document.getElementById('breadcrumb-type').textContent = type === 'tv' ? 'Séries' : 'Films';

    try {
        const details = type === 'tv' ? await fetchTvDetails(id) : await fetchMovieDetails(id);
        await renderHeroWithDetails(type, details);
        if (type === 'tv') {
            await loadSeasons(details);
        }
        await loadCast(type, details.id);
    } catch (e) {
        console.error(e);
        renderError(`Impossible de charger les détails (${e.message || e}).`);
    }
});

function renderError(msg) {
    const main = document.getElementById('main');
    main.innerHTML = `<section class="section"><p>${msg}</p></section>`;
}

async function renderHeroWithDetails(type, d) {
    const hero = document.getElementById('hero');
    const title = d.title || d.name || '';
    const backdrop = d.backdrop_path ? imageUrl(d.backdrop_path, 'w1280') : null;

    const year = (d.release_date || d.first_air_date || '').slice(0, 4);
    const runtimeMin = type === 'movie' ? d.runtime : (d.episode_run_time?.[0] || null);
    const runtime = runtimeMin ? `${Math.floor(runtimeMin / 60)}h ${runtimeMin % 60}min` : '';
    const vote = d.vote_average ? d.vote_average.toFixed(1) : '';
    const meta = [year, runtime].join(' • ');

    const posterPath = d.poster_path || d.backdrop_path;
    const poster = imageUrl(posterPath, 'w342');



    hero.innerHTML = `
        <div class="hero-video" aria-hidden="true"></div>
        <div class="hero-content">
            ${poster ? `<img src="${poster}" alt="${title}" class="details-poster" />` : ''}
            <article>
                <h1>${title}</h1>
                <div class="hero-meta">
                    ${meta ? `<span class="meta">${meta}</span>` : ''}
                    ${type==='tv' && d.number_of_seasons ? `<span class="dot">•</span><span class="meta">${d.number_of_seasons} saison${d.number_of_seasons>1?'s':''}</span>` : ''}
                    ${type==='tv' && d.number_of_episodes ? `<span class="dot">•</span><span class="meta">${d.number_of_episodes} épisodes</span>` : ''}
                    ${d.vote_average ? `<span class="badge rating">★ ${vote}</span>` : ''}
                </div>
                ${(d.genres||[]).length ? `<div class="genres-badges">${d.genres.map(g=>`<span class='badge'>${g.name}</span>`).join('')}</div>` : ''}
                ${d.tagline ? `<p class="hero-overview">${d.tagline}</p>` : ''}
            </article>
        </div>
	`;
	document.body.style.background = backdrop ? `url('${backdrop}') no-repeat` : 'var(--bg-elev)';
	const overview = document.getElementById('overview');
	overview.textContent = d.overview || 'Aucun synopsis disponible.';

	// Trailer
    const trailer = await getTrailer(d.id, type);
    const videoId = trailer?.key || null;
    if (videoId) {
        try {
            const videoContainer = hero.querySelector('.hero-video');
            await createBackgroundPlayer(videoContainer, videoId);
        } catch (e) {
            console.warn('YT background failed', e);
        }
    }
    document.getElementById('episodes').hidden = (type !== 'tv');
}

async function loadSeasons(tv) {
    const select = document.getElementById('season-select');
    const list = document.getElementById('episodes-list');
    select.innerHTML = '';

    (tv.seasons || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = String(s.season_number);
        opt.textContent = s.name || `Saison ${s.season_number}`;
        select.appendChild(opt);
    });

    async function updateSeason() {
        const season = Number(select.value);
        const data = await fetchTvSeason(tv.id, season, { language: 'fr-FR' }).catch(() => null);
        list.innerHTML = '';
        if (!data || !data.episodes || data.episodes.length === 0) { list.innerHTML = '<p>Aucun épisode pour le moment.</p>'; return; }
        for (const ep of data.episodes) {
            const card = document.createElement('div');
			card.className = 'episode-card';
			card.innerHTML = `
				<img class="episode-thumb" alt="${ep.name || `Épisode ${ep.episode_number}`}" src="${imageUrl(ep.still_path, 'w300') || 'https://placehold.co/320x180?text=Episode'}" />
				<div class="episode-body">
					<h4 class="episode-title">${ep.episode_number}. ${ep.name || 'Sans titre'}</h4>
					<div class="episode-meta">${[ep.air_date, ep.runtime ? `${ep.runtime}min` : 'Durée Inconnue'].join(' • ')}</div>
					<p class="episode-overview">${ep.overview || ''}</p>
				</div>
			`
            list.append(card);
        }
    }

    select.addEventListener('change', updateSeason);
    if (select.options.length) {
        select.value = select.options[select.options.length - 1].value; // dernière saison par défaut
        updateSeason();
    }
}

async function loadCast(type, id) {
    let data;
    try {
        data = type === 'tv' ? await fetchTvCredits(id) : await fetchMovieCredits(id);
    } catch (e) {
        console.warn('Credits load failed', e);
        return;
    }
	console.log(data);
    const cast = (data?.cast || []).slice(0, 20);
    if (!cast.length) return;
    const section = document.getElementById('cast');
    const grid = document.getElementById('cast-grid');
    grid.innerHTML = '';
    const urlImg = (p) => p ? imageUrl(p, 'w185') : 'https://placehold.co/240x360?text=No+Photo';
    cast.forEach(person => {
        const card = document.createElement('article');
		card.className = 'cast-card';
		card.innerHTML = `
			<img class="cast-photo" alt="${person.name || 'Acteur'}" src="${urlImg(person.profile_path)}" />
			<div class="cast-body">
				<div class="cast-name">${person.name || ''}</div>
				<div class="cast-role">${person.character || ''}</div>
			</div>
		`;
		grid.append(card);
    });
    section.hidden = false;
}