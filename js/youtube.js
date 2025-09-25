let apiPromise;

export function loadYouTubeIframeApi() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
        // Already loaded
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        const prevCb = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prevCb && prevCb();
            resolve();
        };

        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
        document.head.appendChild(script);
    });

    return apiPromise;
}

export async function createYouTubePlayer(container, {
    videoId,
    width = '100%',
    height = '100%',
    playerVars = {},
    events = {},
    host = 'https://www.youtube-nocookie.com'
} = {}) {
    if (!container) throw new Error('container is required');
    await loadYouTubeIframeApi();

    return new Promise((resolve) => {
        const player = new window.YT.Player(container, {
            width, height,
            videoId,
            host,
            playerVars,
            events: {
                onReady: (e) => {
                    events.onReady && events.onReady(e);
                    resolve(player);
                },
                onStateChange: events.onStateChange,
                onError: events.onError
            }
        });
    });
}

// Background player: autoplay, muted, loop, controls off, branding minimal
export async function createBackgroundPlayer(container, videoId, extraVars = {}) {
    const vars = {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        // Loop requires playlist param equal to the videoId
        loop: 1,
        playlist: videoId,
        // Reduce buffering hiccups a bit
        mute: 1,
        origin: window.location.origin,
        ...extraVars
    };

    // Ensure the container is empty and is an element or id
    const target = typeof container === 'string' ? document.getElementById(container) : container;
    if (!target) throw new Error('Background container not found');

    // Create a wrapper div so we can place the iframe inside
    const wrapper = document.createElement('div');
    wrapper.className = 'yt-bg-wrapper';
    target.appendChild(wrapper);

    const player = await createYouTubePlayer(wrapper, {
        videoId,
        playerVars: vars,
        events: {
            onReady: (e) => {
                try {
                    // Mute required for autoplay on most browsers
                    e.target.mute();
                    e.target.playVideo();
					e.target.setPlaybackQuality('hd1080');
                } catch (_) { /* noop */ }
            },
            onStateChange: (e) => {
                // If video ends for some reason, restart
                if (e.data === window.YT.PlayerState.ENDED) {
                    try { e.target.playVideo(); } catch (_) { /* noop */ }
                }
				if (e.data == YT.PlayerState.PLAYING) {
					e.target.setPlaybackQuality('hd1080');
				}
            }
        }
    });

    return player;
}

// extract a videoId from a YouTube URL
export function extractYouTubeId(urlOrId) {
    if (!urlOrId) return null;
    // If it's already an id (11 chars usually), return it
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    try {
        const u = new URL(urlOrId);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        const match = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
    } catch (e) {
		console.warn('Invalid YouTube URL', e);
	}
    return null;
}
