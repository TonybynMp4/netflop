import { imageUrl } from './api.js';

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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
