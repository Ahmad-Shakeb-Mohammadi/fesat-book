
const CONTAINER_ID = "main-content--body";
const MAX_ENTRIES = 5;
const DEFAULT_TTL = 5 * 60 * 1000;
const DEFAULT_MAX_AGE = 15 * 60 * 1000;

const cache = new Map();     // key -> { fragment, scrollTop, savedAt }
const fetchedAt = new Map(); // key -> when this page's data was originally fetched
let routes = {};             // normalizedPath -> { ttl, maxAge, onRestore }

export function normalizePath(path) {
    if (!path) return path;
    if (path === "/") return "/home";
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function registerCacheableRoutes(config) {
    routes = {};
    for (const [path, opts] of Object.entries(config)) {
        routes[normalizePath(path)] = { ttl: DEFAULT_TTL, maxAge: DEFAULT_MAX_AGE, onRestore: null, ...opts };
    }
}

export function isCacheable(path) {
    return normalizePath(path) in routes;
}

/** Called by the router ONLY after a real (non-cached) fetch+render. */
export function markDataFetched(path) {
    fetchedAt.set(normalizePath(path), Date.now());
}

export function saveRoute(path, container = null) {
    const key = normalizePath(path);
    if (!(key in routes)) return false;

    const el = container || document.getElementById(CONTAINER_ID);
    if (!el || el.childElementCount === 0) return false;
    if (el.querySelector("[data-route-loader]")) return false;
    if (el.querySelector(".alert-danger, .alert-warning")) return false;

    // 1) READ SCROLL FIRST — before emptying (emptying collapses height -> scroll clamps)
    const scrollTop = window.scrollY || 0;

    // 2) THEN move the live nodes into the fragment
    const fragment = document.createDocumentFragment();
    while (el.firstChild) fragment.appendChild(el.firstChild);

    cache.delete(key);
    cache.set(key, { fragment, scrollTop, savedAt: Date.now() });

    while (cache.size > MAX_ENTRIES) {
        cache.delete(cache.keys().next().value);
    }
    return true;
}

export function takeFreshRoute(path) {
    const key = normalizePath(path);
    const entry = cache.get(key);
    if (!entry) return null;

    const { ttl, maxAge, onRestore } = routes[key] || { ttl: DEFAULT_TTL, maxAge: DEFAULT_MAX_AGE, onRestore: null };

    // Clock 1 — idle: how long since the user left the page
    if (Date.now() - entry.savedAt > ttl) {
        cache.delete(key);
        return null;
    }

    // Clock 2 — absolute: how old the DATA is (survives re-saves; only a real refetch resets it)
    const born = fetchedAt.get(key);
    if (born && Date.now() - born > maxAge) {
        cache.delete(key); // data too old -> force a fresh load
        return null;
    }

    cache.delete(key);
    return { fragment: entry.fragment, scrollTop: entry.scrollTop, onRestore };
}

/** Restore window scroll. "instant" overrides html { scroll-behavior: smooth }. */
export function restoreScroll(entry) {
    if (!entry) return;
    const setScroll = () => window.scrollTo({ top: entry.scrollTop, behavior: "instant" });
    setScroll();
    requestAnimationFrame(setScroll);
}

export function invalidateRoute(...paths) {
    for (const p of paths) {
        const key = normalizePath(p);
        cache.delete(key);
        fetchedAt.delete(key);
    }
}

export function invalidateAll() {
    cache.clear();
    fetchedAt.clear();
}

export function getCacheSize() {
    return cache.size;
}