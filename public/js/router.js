import { loadPosts, loadMyPosts, loadEditPost, loadMorePosts, remountFeedInfiniteScroll } from "./loaders/feedLoader.js";
import { loadNetwork, loadFollowing, loadFollower, loadUserProfile } from "./loaders/networkLoader.js";
import { loadProfile, loadProfileViews, loadFollowersGraph, loadFollowingGraph, loadLikes, loadComments } from "./loaders/profileLoader.js";
import { loadSettingsPage, loadPersonalInfo, loadPhotoRemovals, loadPrivacy, loadBlockedPeople, loadSecurity, loadChangePassword, loadChangeEmail, loadAccount, loadLogout, loadDeleteAccount } from "./loaders/settingsLoader.js";
import { Showloader } from "./components/Showloader.js";
import { initPullToRefresh, destroyAll } from "./utils/scrollManager.js";
import { loadMessenger, cleanupMessenger } from "./loaders/chatLoader.js";
import { closeSearchPeopleModal } from "./searchPoeple.js";
import { closeAddMembersModal } from "./chat/chatEvent.js";
// [CACHE] -------------------------------------------------------------------
import { registerCacheableRoutes, saveRoute, takeFreshRoute, restoreScroll, markDataFetched } from "./utils/routeCache.js";

registerCacheableRoutes({
    "/home": { ttl: 3 * 60 * 1000, maxAge: 5 * 60 * 1000, onRestore: remountFeedInfiniteScroll },
    "/network": { ttl: 5 * 60 * 1000, maxAge: 10 * 60 * 1000 },
});

const routes = {
    "/": loadPosts,
    "/home": loadPosts,
    "/post": loadMyPosts,
    "/network": loadNetwork,
    "/messages": loadMessenger,
    "/editPost": loadEditPost,
    "/following": loadFollowing,
    "/followers": loadFollower,
    "/profile": loadProfile,
    "/analytics/profile-views": loadProfileViews,
    "/analytics/followers": loadFollowersGraph,
    "/analytics/following": loadFollowingGraph,
    "/activities/likes": loadLikes,
    "/activities/comments": loadComments,
    "/settings": loadSettingsPage,
    "/settings/personal-info": loadPersonalInfo,
    "/settings/photos": loadPhotoRemovals,
    "/settings/privacy": loadPrivacy,
    "/settings/blocked-people": loadBlockedPeople,
    "/settings/security": loadSecurity,
    "/settings/change-password": loadChangePassword,
    "/settings/change-email": loadChangeEmail,
    "/settings/account": loadAccount,
    "/settings/logout": loadLogout,
    "/settings/delete-account": loadDeleteAccount
};

let middleBar;
let currentPath;
let currentController;
let previousController;
let lastRenderOk = false; // [CACHE] only snapshot pages whose render fully completed

/**
 * Programmatic navigation
 */
export function navigateTo(path) {
    if (location.pathname === path) return; // Already there
    history.pushState(null, '', path);
    router();
}

function setActiveNav(path) {
    const normalizedPath = path === '/' ? '/home' : path;
    document.querySelectorAll('.nav-link-modern').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === normalizedPath);
    });
}

function getMiddleBar() {
    if (!middleBar) {
        middleBar = document.getElementById("main-content--body");
    }
    return middleBar;
}

function closeOpenModals() {
    // Bootstrap modals
    const openModal = document.querySelector(".modal.show");
    if (openModal) {
        bootstrap.Modal.getInstance(openModal)?.hide();
    }

    // Left/right hamburger panels (Bootstrap Offcanvas) -
    // they live in the shell, survive routing, and trap mobile until closed manually
    document.querySelectorAll(".offcanvas.show").forEach(el => {
        bootstrap.Offcanvas.getOrCreateInstance(el).hide();
    });
}

function abortCurrentRequest() {
    if (currentController) {
        previousController = currentController;
        currentController.abort();
        currentController = null;
    }
}

export async function router() {
    const container = getMiddleBar();
    const outgoingPath = currentPath; // [CACHE] the page we are leaving

    closeOpenModals();
    closeSearchPeopleModal();
    closeAddMembersModal();
    abortCurrentRequest();

    cleanupMessenger();
    currentPath = location.pathname;
    destroyAll(); // also removes the old page's infinite-scroll sentinel -> clean snapshots

    // [CACHE] SAVE ON EXIT: snapshot the old page before it gets wiped
    if (outgoingPath && lastRenderOk) saveRoute(outgoingPath, container);
    lastRenderOk = false;

    if (currentPath === '/' || currentPath === '/home') {
        initPullToRefresh(async () => {
            await loadMorePosts(getCurrentSignal());
        });
    }

    if (currentPath.startsWith('/userProfile/')) {
        const userId = currentPath.split('/')[2];
        container.innerHTML = Showloader();
        container.firstElementChild?.setAttribute("data-route-loader", ""); // [CACHE]
        currentController = new AbortController();
        await loadUserProfile(userId, currentController.signal);
        return;
    }

    const pageLoader = routes[currentPath];

    if (!pageLoader) {
        container.innerHTML = '<div class="alert alert-warning">Page not found</div>';
        return;
    }

    setActiveNav(currentPath);
    container.innerHTML = Showloader();
    container.firstElementChild?.setAttribute("data-route-loader", ""); // [CACHE] marker,
    // wiped when the loader renders
    currentController = new AbortController();

    // [CACHE] CHECK ON ENTER: fresh snapshot? restore instantly (0 requests)
    const cached = takeFreshRoute(currentPath);
    if (cached) {
        container.innerHTML = "";
        container.appendChild(cached.fragment);
        restoreScroll(cached);
        cached.onRestore?.(); // re-attach the feed's infinite-scroll observer
        lastRenderOk = true;  // restored page is complete -> cacheable again
        return;
    }

    try {
        window.scrollTo(0, 0);
        await pageLoader(currentController.signal);
        // [CACHE] commit only if render completed (loaders swallow AbortError,
        // so the aborted signal is how we detect a cancelled half-render)
        if (!currentController.signal.aborted) {
            lastRenderOk = true;
            markDataFetched(currentPath);   // [CACHE] starts the absolute clock — real fetches only
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        console.error("Route loading failed:", err);
        container.innerHTML = '<div class="alert alert-danger">Failed to load page</div>';
    }
}

export function getCurrentSignal() {
    return currentController?.signal || null;
}


export function wasNavigatedAway() {
    return previousController?.signal?.aborted || false;
}