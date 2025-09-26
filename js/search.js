import { fetchPopularTV, fetchTrendingMovies, searchTitles } from './api.js';
import { addShowCard } from './dom.js';
import { loadTheme, setupThemeSwitcher } from './theme.js';

const MIN_QUERY_LENGTH = 2;

const state = {
	query: '',
	page: 1,
	totalPages: 0,
	totalResults: 0,
	loading: false
};

const elements = {
	form: null,
	input: null,
	feedback: null,
	resultsSection: null,
	resultsGrid: null,
	resultsTitle: null,
	resultsCount: null,
	loadMore: null,
	suggestions: null,
	suggestionsGrid: null
};

window.addEventListener('DOMContentLoaded', () => {
	loadTheme();
	setupThemeSwitcher();
	cacheElements();
	setupEventListeners();

	if (elements.input) {
		elements.input.focus({ preventScroll: true });
	}

	// if query in URL (on reload for example)
	const initialQuery = hydrateFromQuery();
	if (initialQuery && initialQuery.length >= MIN_QUERY_LENGTH) {
		performSearch(initialQuery);
	} else {
		setFeedback(`Tapez au moins ${MIN_QUERY_LENGTH} caractères pour lancer une recherche.`);
		showSuggestions();
	}
});

// Cache frequently used DOM elements, AFTER DOMContentLoaded to ensure elements are present
function cacheElements() {
	elements.form = document.getElementById('search-form');
	elements.input = document.getElementById('search-input');
	elements.feedback = document.getElementById('search-feedback');
	elements.resultsSection = document.getElementById('results-section');
	elements.resultsGrid = document.getElementById('results-grid');
	elements.resultsTitle = document.getElementById('results-title');
	elements.resultsCount = document.getElementById('results-count');
	elements.loadMore = document.getElementById('load-more');
	elements.suggestions = document.getElementById('suggestions');
	elements.suggestionsGrid = document.getElementById('suggestions-grid');
}

// Setup event listeners for form submission, input changes, and load more button
function setupEventListeners() {
	if (!elements.form || !elements.input) return;

	const debouncedLiveSearch = debounce((value) => {
		performSearch(value);
	}, 100);

	elements.form.addEventListener('submit', (event) => {
		event.preventDefault();
		debouncedLiveSearch.cancel();
		performSearch(elements.input.value);
	});

	elements.input.addEventListener('input', (event) => {
		const value = event.target.value;
		// ''
		if (!value.trim()) {
			debouncedLiveSearch.cancel();
			updateQueryParams('');
			resetResults();
			showSuggestions();
			setFeedback(`Tapez au moins ${MIN_QUERY_LENGTH} caractères pour lancer une recherche.`);
			return;
		}

		// >= 2 chars
		if (value.trim().length >= MIN_QUERY_LENGTH) {
			debouncedLiveSearch(value);
			// < 2 chars
		} else {
			debouncedLiveSearch.cancel();
			resetResults({ keepFeedback: true });
			setFeedback(`Tapez au moins ${MIN_QUERY_LENGTH} caractères pour lancer une recherche.`, 'warning');
			showSuggestions();
		}
	});

	elements.loadMore?.addEventListener('click', () => {
		if (state.loading) return;
		elements.loadMore.disabled = true;
		performSearch(state.query, { page: state.page + 1, append: true });
	});
}

function hydrateFromQuery() {
	const params = new URLSearchParams(window.location.search);
	const query = (params.get('q') || '').trim();
	if (elements.input) {
		elements.input.value = query;
	}
	return query;
}

// limit how often a function can run (used for live search input)
function debounce(fn, delay = 300) {
	let timeout;
	const wrapper = (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
	// Allow cancelling a pending call
	wrapper.cancel = () => clearTimeout(timeout);
	return wrapper;
}

function updateQueryParams(query) {
	const url = new URL(window.location.href);
	if (query) {
		url.searchParams.set('q', query);
	} else {
		url.searchParams.delete('q');
	}
	window.history.replaceState({}, '', url);
}

function resetResults({ keepFeedback = false } = {}) {
	state.page = 1;
	state.totalPages = 0;
	state.totalResults = 0;
	if (elements.resultsGrid) {
		elements.resultsGrid.innerHTML = '';
	}
	if (elements.resultsSection) {
		elements.resultsSection.hidden = true;
	}
	updateLoadMoreVisibility(true);
	if (!keepFeedback) {
		setFeedback('');
	}
}

function setFeedback(message, tone = 'info') {
	if (!elements.feedback) return;
	elements.feedback.textContent = message || '';
	elements.feedback.dataset.tone = tone;
}

function toggleFormLoading(isLoading) {
	if (!elements.form) return;
	elements.form.classList.toggle('is-loading', isLoading);
}

function updateResultsHeader() {
	if (elements.resultsTitle) {
		elements.resultsTitle.textContent = state.query ? `Résultats pour « ${state.query} »` : 'Résultats';
	}
	if (!elements.resultsCount) return;

	const displayed = elements.resultsGrid?.querySelectorAll('.media-card').length || 0;
	const total = state.totalResults;
	if (displayed === 0 && total === 0) {
		elements.resultsCount.hidden = true;
		return;
	}

	elements.resultsCount.textContent = total ? `${Math.min(displayed, total)} / ${total}` : String(displayed);
	elements.resultsCount.hidden = false;
}

function updateLoadMoreVisibility(forceHide = false) {
	if (!elements.loadMore) return;
	const shouldShow = !forceHide && state.page < state.totalPages;
	elements.loadMore.hidden = !shouldShow;
	if (!shouldShow) {
		elements.loadMore.disabled = false;
	}
}

function hideSuggestions() {
	if (elements.suggestions) {
		elements.suggestions.hidden = true;
	}
}

async function showSuggestions(forceReload = false) {
	if (!elements.suggestions || !elements.suggestionsGrid) return;
	elements.suggestions.hidden = false;

	const alreadyLoaded = elements.suggestionsGrid.dataset.loaded === 'true';
	if (alreadyLoaded && !forceReload) {
		return;
	}

	elements.suggestionsGrid.dataset.loaded = 'loading';
	elements.suggestionsGrid.innerHTML = '<p class="placeholder">Chargement des suggestions…</p>';

	try {
		const [movies, shows] = await Promise.all([
			fetchTrendingMovies({ time_window: 'day', page: 1, language: 'fr-FR' }),
			fetchPopularTV({ page: 1, language: 'fr-FR' })
		]);

		const picks = [...movies.slice(0, 6), ...shows.slice(0, 6)];
		elements.suggestionsGrid.innerHTML = '';
		const seen = new Set();

		picks.forEach(item => {
			const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
			const key = `${type}-${item.id}`;
			if (seen.has(key) || !item.id) return;
			seen.add(key);
			addShowCard(elements.suggestionsGrid, { ...item, media_type: type });
		});

		if (!elements.suggestionsGrid.children.length) {
			elements.suggestionsGrid.innerHTML = '<p class="placeholder">Aucune suggestion pour le moment.</p>';
			elements.suggestionsGrid.dataset.loaded = 'empty';
		} else {
			elements.suggestionsGrid.dataset.loaded = 'true';
		}
	} catch (error) {
		console.error('Suggestions error', error);
		elements.suggestionsGrid.innerHTML = '<p class="placeholder">Impossible de charger les suggestions pour le moment.</p>';
		elements.suggestionsGrid.dataset.loaded = 'error';
	}
}

async function performSearch(query, { page = 1, append = false } = {}) {
	const trimmed = (query || '').trim();

	//vide
	if (!trimmed) {
		updateQueryParams('');
		resetResults();
		showSuggestions();
		return;
	}

	// < 2 chars
	if (trimmed.length < MIN_QUERY_LENGTH) {
		updateQueryParams(trimmed);
		resetResults({ keepFeedback: true });
		setFeedback(`Tapez au moins ${MIN_QUERY_LENGTH} caractères pour lancer une recherche.`, 'warning');
		showSuggestions();
		return;
	}

	state.loading = true;
	toggleFormLoading(true);
	hideSuggestions();

	if (!append) {
		// clear existing results
		if (elements.resultsGrid) {
			elements.resultsGrid.innerHTML = '';
		}
		if (elements.resultsSection) {
			elements.resultsSection.hidden = false;
		}
	}

	setFeedback('Recherche en cours…', 'info');

	try {
		const data = await searchTitles(trimmed, { page });
		const results = data.results || [];

		state.query = trimmed;
		state.page = data.page || page;
		state.totalPages = data.total_pages || 0;
		state.totalResults = data.total_results || results.length;

		if (!append && results.length === 0) {
			if (elements.resultsGrid) {
				elements.resultsGrid.innerHTML = '';
			}
			updateResultsHeader();
			updateQueryParams(trimmed);
			setFeedback(`Aucun résultat pour « ${trimmed} ».`, 'warning');
			updateLoadMoreVisibility(true);
			if (elements.resultsSection) {
				elements.resultsSection.hidden = true;
			}
			await showSuggestions();
			return;
		}

		if (!elements.resultsGrid) return;

		// clear existing results for the new search
		if (!append) {
			elements.resultsGrid.innerHTML = '';
		}

		results.forEach(item => addShowCard(elements.resultsGrid, item));

		updateResultsHeader();
		updateQueryParams(trimmed);
		updateLoadMoreVisibility();

		const displayed = elements.resultsGrid.querySelectorAll('.media-card').length || results.length;
		const total = state.totalResults;
		const summary = total
			? `Affichage de ${displayed} titres sur ${total}.`
			: `Affichage de ${displayed} titres.`;
		setFeedback(summary, 'success');
	} catch (error) {
		console.error('Search error', error);
		if (!append && elements.resultsGrid) {
			elements.resultsGrid.innerHTML = '';
		}
		if (elements.resultsSection) {
			elements.resultsSection.hidden = !append;
		}
		setFeedback(`Une erreur est survenue : ${error.message || error}.`, 'error');
		updateLoadMoreVisibility(true);
	} finally {
		state.loading = false;
		toggleFormLoading(false);
		if (elements.loadMore) {
			elements.loadMore.disabled = false;
		}
	}
}