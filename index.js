import { initHome } from "./js/dom.js";
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