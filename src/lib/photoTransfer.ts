/**
 * Module-level photo transfer store.
 *
 * JavaScript module variables persist for the entire browser session — they
 * survive React re-renders, component unmounts, React Strict Mode double-
 * invokes, and Next.js App Router navigation.  Unlike React context (which
 * may reset across sibling route segments) or sessionStorage (which has
 * Strict Mode timing issues), this store is synchronously readable on the
 * very first render of any component.
 */

let _photos: string[] = [];
let _videos: string[] = [];

export const photoTransfer = {
    set(photos: string[], videos: string[]) {
        _photos = [...photos];
        _videos = [...videos];
        // Mirror to sessionStorage as a fallback for hard refreshes
        if (typeof window !== "undefined") {
            try {
                sessionStorage.setItem("lh_photos", JSON.stringify(_photos));
                sessionStorage.setItem("lh_videos", JSON.stringify(_videos));
            } catch {}
        }
    },

    get(): { photos: string[]; videos: string[] } {
        // Primary: in-memory store
        if (_photos.length > 0 || _videos.length > 0) {
            return { photos: _photos, videos: _videos };
        }
        // Fallback: sessionStorage (survives hard refreshes)
        if (typeof window !== "undefined") {
            try {
                const sp = sessionStorage.getItem("lh_photos");
                const sv = sessionStorage.getItem("lh_videos");
                const photos = sp ? JSON.parse(sp) : [];
                const videos = sv ? JSON.parse(sv) : [];
                if (photos.length > 0 || videos.length > 0) {
                    _photos = photos;
                    _videos = videos;
                    return { photos: _photos, videos: _videos };
                }
            } catch {}
        }
        return { photos: [], videos: [] };
    },

    clear() {
        _photos = [];
        _videos = [];
        if (typeof window !== "undefined") {
            try {
                sessionStorage.removeItem("lh_photos");
                sessionStorage.removeItem("lh_videos");
            } catch {}
        }
    },
};
