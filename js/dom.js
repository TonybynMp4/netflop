export function addShowCard(container, show) {
	if (!container) throw new Error('Container element is required');
	const existingCards = container.getElementsByClassName('media-card').length;
    const card = document.createElement('div');
    card.className = 'media-card';
	card.tabIndex = existingCards;
    card.innerHTML = `
        <img class="poster shimmer" src="https://placehold.co/400x600" />
    `;
    container.appendChild(card);
}
