const API_KEY = 'e4b90327227c88daac14c0bd0c1f93cd';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlNGI5MDMyNzIyN2M4OGRhYWMxNGMwYmQwYzFmOTNjZCIsIm5iZiI6MTc1ODY0ODMyMS43NDg5OTk4LCJzdWIiOiI2OGQyZDgwMTJhNWU3YzBhNDVjZWNmZWUiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.aylEitwtAH0w4XRk8izJNNkF_bet8sxiC9iI-zSdHbU';

function buildUrl(path, params = {}) {
	const url = new URL(`${BASE_URL}/${path}`);
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
	});
	return url.toString();
}

async function tmdb(path, params) {
	const url = buildUrl(path, params);
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${BEARER_TOKEN}`,
			'Content-Type': 'application/json;charset=utf-8'
		}
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`TMDB ${res.status}: ${text || res.statusText}`);
	}
	return res.json();
}

export function imageUrl(path, size = 'w342') {
	if (!path) return null;
	return `${IMAGE_BASE_URL}/${size}${path}`;
}

export async function getTrailer(id, type = 'movie') {
	const { results: videos } = await tmdb(`${type}/${id}/videos`, { language: 'en-US' });
	return videos.find(v => v.type === 'Trailer' && v.official) || null;
}

export async function fetchTrendingMovies({ time_window = 'week', page = 1, language = 'fr-FR' } = {}) {
	const data = await tmdb(`trending/movie/${time_window}`, { page, language });
	return data.results || [];
}

export async function fetchPopularTV({ page = 1, language = 'fr-FR' } = {}) {
	const data = await tmdb('tv/popular', { page, language, region: 'FR' });
	return data.results || [];
}

export async function fetchMovieDetails(id, { language = 'fr-FR', append = '' } = {}) {
	const params = { language };
	if (append) params.append_to_response = append;
	return tmdb(`movie/${id}`, params);
}

export async function fetchTvDetails(id, { language = 'fr-FR', append = '' } = {}) {
	const params = { language };
	if (append) params.append_to_response = append;
	return tmdb(`tv/${id}`, params);
}

export async function fetchTvSeason(tvId, seasonNumber, { language = 'fr-FR' } = {}) {
	return tmdb(`tv/${tvId}/season/${seasonNumber}`, { language });
}

export async function fetchMovieCredits(id, { language = 'fr-FR' } = {}) {
	return tmdb(`movie/${id}/credits`, { language });
}

export async function fetchTvCredits(id, { language = 'fr-FR' } = {}) {
	return tmdb(`tv/${id}/credits`, { language });
}

export const TMDB = {
	API_KEY,
	BASE_URL,
	IMAGE_BASE_URL,
	imageUrl
};