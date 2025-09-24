import { loadTheme, setupThemeSwitcher } from "./js/theme.js";

window.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupThemeSwitcher();
    setupNavIndicator();
    setupHeaderAndActiveSection();
/* 	shows.forEach(show => {
		const el = document.getElementById('series').getElementsByClassName('media-row')[0];
		addShowCard(el, show);
	});
 */
    // If URL has a hash, ensure correct section is active and visible
    const hash = window.location.hash;
    if (hash) {
        const target = document.getElementById(hash.substring(1));
        if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }
});

function setupNavIndicator() {
    const nav = document.getElementsByClassName('primary-nav')[0];
    const indicator = nav?.getElementsByClassName('nav-indicator')[0];
    if (!nav || !indicator) return;

    function positionIndicator(el) {
        const rect = el.getBoundingClientRect();
        const parentRect = nav.getBoundingClientRect();
        const x = rect.left - parentRect.left;
        indicator.style.width = rect.width + 'px';
        indicator.style.transform = `translateX(${x}px)`;
    }

    const tabs = [...nav.querySelectorAll('.nav-tab')];
    const active = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
    positionIndicator(active);

    tabs.forEach(tab => tab.addEventListener('click', (e) => {
        const href = tab.getAttribute('href');
        if (!href?.startsWith('#')) return;
        e.preventDefault();
        const targetEl = document.querySelector(href);
        if (!targetEl) return;
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        positionIndicator(tab);
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', href);
    }));

    window.addEventListener('resize', () => {
        const current = nav.querySelector('.nav-tab.is-active') || tabs[0];
        positionIndicator(current);
    });
}

function setupHeaderAndActiveSection() {
    const sections = document.querySelectorAll('main .section');

    // Active section tracking using IntersectionObserver style behavior
    const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.getAttribute('id');

        // update nav active tab
        const tab = document.querySelector(`.primary-nav .nav-tab[data-target="#${id}"]`);
        if (tab) {
            document.querySelectorAll('.primary-nav .nav-tab').forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');
            const indicator = document.querySelector('.primary-nav .nav-indicator');
            if (indicator) {
                const rect = tab.getBoundingClientRect();
                const parentRect = tab.parentElement.getBoundingClientRect();
                indicator.style.width = rect.width + 'px';
                indicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
            }
        }

        // breadcrumb current
        const title = visible.target.querySelector('h2, h1')?.textContent?.trim() || id;
        const crumb = document.getElementById('breadcrumb-current');
        if (crumb) crumb.textContent = title;
    }, { rootMargin: '-40% 0px -55% 0px', threshold: [0.1, 0.25, 0.5, 0.75, 1] });

    sections.forEach(sec => observer.observe(sec));
}
