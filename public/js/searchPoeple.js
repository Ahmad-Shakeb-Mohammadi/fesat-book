import { searchUsers } from "./api.js";
import { SearchPeopleModal, SearchPeopleCards, SearchPeopleLoadMore } from "./components/SearchPeopleModal.js";
import { toast } from "./utils/toast.js"

let searchTimeout = null;
let searchAbortController = null;
let currentSearchQuery = "";

// ─── Open / Close ────────────────────────────────────────────

export function openSearchPeopleModal() {
    if (document.getElementById("searchPeopleOverlay")) return;

    const middleBar = document.getElementById("main-content--body");
    if (!middleBar) return;

    middleBar.insertAdjacentHTML("beforeend", SearchPeopleModal());

    requestAnimationFrame(() => {
        document.getElementById("searchPeopleInput")?.focus();
    });
}

export function closeSearchPeopleModal() {
    clearSearchTimeout();
    cancelSearchRequest();
    currentSearchQuery = "";
    document.getElementById("searchPeopleOverlay")?.remove();
}

// ─── Called from FeedDelegation input handler ────────────────

export function handleSearchPeopleInput(value) {
    const q = value.trim();
    currentSearchQuery = q;

    clearSearchTimeout();
    cancelSearchRequest();

    if (!q) {
        resetSearchResults();
        return;
    }

    searchTimeout = setTimeout(() => {
        performSearch(q, {}, true);
    }, 350);
}

// ─── Called from FeedDelegation click handler ────────────────

export function handleSearchLoadMore(btn) {
    const createdAt = btn.dataset.createdAt;
    const _id = btn.dataset.id;
    if (!currentSearchQuery || !createdAt || !_id) return;
    performSearch(currentSearchQuery, { createdAt, _id }, false);
}

// ─── Core Search ─────────────────────────────────────────────

async function performSearch(q, cursor, isFresh) {
    const resultsContainer = document.getElementById("searchPeopleResults");
    if (!resultsContainer) return;

    cancelSearchRequest();
    searchAbortController = new AbortController();

    if (isFresh) {
        resultsContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center p-4">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2 text-muted">Searching...</span>
            </div>
        `;
    } else {
        const wrapper = document.getElementById("searchLoadMoreWrapper");
        if (wrapper) {
            wrapper.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-3 gap-2">
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <span class="text-muted">Loading more...</span>
                </div>
            `;
        }
    }

    try {
        const data = await searchUsers(q, cursor, searchAbortController.signal);

        // modal was closed while fetching
        if (!document.getElementById("searchPeopleOverlay")) return;

        if (isFresh) {
            if (!data.users || data.users.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="text-center text-muted p-4">
                        <p class="mb-0" style="font-size: 0.9rem;">
                            No people found for "<strong>${escapeHtml(q)}</strong>"
                        </p>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = `
                <div class="d-flex flex-wrap justify-content-center gap-3" id="searchPeopleGrid">
                    ${SearchPeopleCards(data.users)}
                </div>
            `;
        } else {
            document.getElementById("searchLoadMoreWrapper")?.remove();
            const grid = document.getElementById("searchPeopleGrid");
            if (grid) {
                grid.insertAdjacentHTML("beforeend", SearchPeopleCards(data.users));
            }
        }

        if (data.hasMore && data.users.length > 0) {
            const last = data.users[data.users.length - 1];
            resultsContainer.insertAdjacentHTML("beforeend",
                SearchPeopleLoadMore({ createdAt: last.createdAt, _id: last._id })
            );
        }

    } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        toast.error("Search failed, try again.");
        if (isFresh) resetSearchResults();
    }
}

// ─── Helpers ─────────────────────────────────────────────────

function resetSearchResults() {
    const resultsContainer = document.getElementById("searchPeopleResults");
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="text-center text-muted p-4">
            <p class="mb-0" style="font-size: 0.9rem;">Search for people to connect with</p>
        </div>
    `;
}

function clearSearchTimeout() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
}

function cancelSearchRequest() {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }
}

function escapeHtml(text = "") {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}