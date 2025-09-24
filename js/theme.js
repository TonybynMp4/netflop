const root = document.documentElement;
const THEME_KEY = 'netflop:theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--theme', theme);
    document.querySelectorAll('.theme-switcher .chip').forEach(btn => {
        const isActive = btn.dataset.value === theme;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

export function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || (prefersDark.matches ? 'dark' : 'light');
    applyTheme(theme);
}

export function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { }
}

export function setupThemeSwitcher() {
    document.querySelectorAll('.theme-switcher .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.value;
            applyTheme(theme);
            saveTheme(theme);
        });
    });
}

export default {
    loadTheme,
    saveTheme,
    applyTheme,
    setupThemeSwitcher,
}