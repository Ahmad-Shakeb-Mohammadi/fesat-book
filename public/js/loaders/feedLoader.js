import { getPost, getNewFollowingPosts, getOldFollowingPosts, getNewSuggestedPosts, getMyPosts, getSinglePost } from "../api.js";
import { Feed, DissmissBtn, getIndicator, moreButton, NoPost } from "../components/Feed.js";
import { Showloader } from "../components/Showloader.js";
import { Postcreation } from "../components/Postcreation.js";
import { appState } from "../state.js";
import { router } from "../router.js";
import { InfiniteScroll } from "../refreshEvent.js"
import { setInfinitScroll } from "../utils/scrollManager.js"
import { toast } from "../utils/toast.js";
import { getCurrentSignal } from "../router.js";

let infinitScroll = null;
function getMiddleBar() {
    return document.getElementById("main-content--body");
}

export async function loadPosts(signal) {
    try {
        const middleBar = getMiddleBar()
        const data = await getPost(signal);
        middleBar.innerHTML = " ";

        if (data.followingNewPosts?.length > 0) {
            middleBar.appendChild(getIndicator("following"))
            for (let post of data.followingNewPosts) {
                let card = Feed(post, "generalFeed")
                middleBar.appendChild(card)
            }
            middleBar.appendChild(DissmissBtn())
        } else {
            if (data.suggestedPosts?.length > 0) {
                appState.suggestedCursor.createdAt = data.suggestedPosts[data.suggestedPosts.length - 1].createdAt;
                appState.suggestedCursor.postId = data.suggestedPosts[data.suggestedPosts.length - 1]._id
                middleBar.appendChild(getIndicator("suggested"))
                for (let post of data.suggestedPosts) {
                    let card = Feed(post, "generalFeed")
                    middleBar.appendChild(card)
                }
            }
        }
        if (data?.hasNewFollowing) {
            appState.upCursor.mode = "newFollowing"
            appState.upCursor.createdAt = data.followingNewPosts[0].createdAt;  // NEWEST, not oldest
            appState.upCursor.postId = data.followingNewPosts[0]._id
        } else {
            appState.upCursor.mode = "suggested";
            appState.upCursor.createdAt = null;
            appState.upCursor.postId = null;
        }

        if (data.followingOldPosts?.length > 0) {
            middleBar.appendChild(getIndicator("oldFollowing"))
            for (let post of data.followingOldPosts) {
                let card = Feed(post, "generalFeed")
                middleBar.appendChild(card)
            }
        }
        if (data?.hasOldFollowing) {
            appState.downCursor.mode = "oldFollowing";
            appState.downCursor.createdAt = data.followingOldPosts[data.followingOldPosts.length - 1].createdAt;
            appState.downCursor.postId = data.followingOldPosts[data.followingOldPosts.length - 1]._id;
        } else {
            appState.downCursor.mode = "suggested";
            appState.downCursor.createdAt = null;
            appState.downCursor.postId = null;
            middleBar.appendChild(getIndicator("downCaught"))
        }

        infinitScroll = new InfiniteScroll(middleBar, () => loadMoreInfinitScroll(getCurrentSignal()))
        infinitScroll.mount()
        setInfinitScroll(infinitScroll)
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Posts, Try again!")
    }
}

export async function loadMorePosts(signal) {
    const middleBar = getMiddleBar()

    let data;
    try {
        data = await getNewFollowingPosts(signal)
    } catch (err) {
        if (err.name === "AbortError") {
            toast.info("Cancelled new Following Posts!", 1000)
            return;
        }
        toast.error("Failed to load new Posts, Try again!")
        return;
    }

    appState.upCursor.mode = data?.hasNewFollowing ? "newFollowing" : "suggested";
    // NOTE: cursor is NOT cleared on an empty response anymore —
    // it stays as the watermark of the newest post we have.

    // Dedupe: skip posts already on the page (also protects the plain
    // endpoint case when dismiss was never pressed)
    const seenIds = new Set(
        [...middleBar.querySelectorAll(".containerId[data-post-id]")].map(el => el.dataset.postId)
    );
    const freshPosts = (data?.followingNewPosts || []).filter(p => !seenIds.has(p._id));

    if (freshPosts.length > 0) {
        // advance the watermark to the NEWEST post we now have
        appState.upCursor.createdAt = freshPosts[0].createdAt;
        appState.upCursor.postId = freshPosts[0]._id;

        ["#topIndicator", "#dismissBtn"].forEach(el => {
            middleBar.querySelector(el)?.remove()
        })
        middleBar.prepend(DissmissBtn())
        for (let post of freshPosts) {
            let card = Feed(post, "generalFeed")
            middleBar.prepend(card)
        }
        middleBar.prepend(getIndicator("following"))
        return;
    } else if (appState.upCursor.mode == "suggested") {
        let data;
        try {
            data = await getNewSuggestedPosts(signal)
        } catch (err) {
            if (err.name === "AbortError") {
                toast.info("Cancelled new Posts!", 1000)
                return;
            }
            toast.error("Failed to load new Posts, Try again!")
            return;
        }
        if (data?.suggestedPosts?.length > 0) {
            appState.suggestedCursor.createdAt = data.suggestedPosts[data.suggestedPosts.length - 1].createdAt;
            appState.suggestedCursor.postId = data.suggestedPosts[data.suggestedPosts.length - 1]._id;
            middleBar.querySelector("#topIndicator")?.remove()
            for (let post of data.suggestedPosts) {
                let card = Feed(post, "generalFeed")
                middleBar.prepend(card)
            }
            middleBar.prepend(getIndicator("suggested"))
        } else {
            middleBar.querySelector("#topIndicator")?.remove()
            middleBar.prepend(getIndicator("topEnd"))
        }
    }
}

export async function loadMoreInfinitScroll(signal) {
    if (appState.downCursor.mode === "end") return;
    const middleBar = getMiddleBar()
    if (appState.downCursor.mode === "oldFollowing") {
        let showDiv = document.createElement("div")
        showDiv.innerHTML = Showloader()
        middleBar.appendChild(showDiv)
        let data;
        try {
            data = await getOldFollowingPosts(signal);
        } catch (err) {
            if (err.name === "AbortError") {
                toast.info("Cancelled old Following Posts!", 1000)
                return;
            }
            toast.error("Failed to load new Posts, scroll again!")
            return;
        } finally {
            if (showDiv && showDiv.parentNode) {
                middleBar.removeChild(showDiv)
            }
        }
        if (data?.hasOldFollowing) {
            appState.downCursor.createdAt = data.followingOldPosts[data.followingOldPosts.length - 1].createdAt;
            appState.downCursor.postId = data.followingOldPosts[data.followingOldPosts.length - 1]._id;
        } else {
            appState.downCursor.mode = "suggested";
            appState.downCursor.createdAt = null;
            appState.downCursor.postId = null;
        }
        if (data?.followingOldPosts?.length > 0) {
            for (let post of data.followingOldPosts) {
                let card = Feed(post, "generalFeed")
                middleBar.appendChild(card)
            }
        }
        infinitScroll.updateSentinelPosition();
    } else if (appState.downCursor.mode === "suggested") {
        let showDiv = document.createElement("div")
        showDiv.innerHTML = Showloader()
        middleBar.appendChild(showDiv)
        let data;
        try {
            data = await getNewSuggestedPosts(signal);
        } catch (err) {
            if (err.name === "AbortError") {
                toast.info("Cancelled new Posts!", 1000)
                return;
            }
            toast.error("Failed to load new Posts, Try again!")
            return;
        } finally {
            if (showDiv && showDiv.parentNode) {
                middleBar.removeChild(showDiv)
            }
        }
        if (data?.suggestedPosts?.length > 0) {
            appState.suggestedCursor.createdAt = data.suggestedPosts[data.suggestedPosts.length - 1].createdAt;
            appState.suggestedCursor.postId = data.suggestedPosts[data.suggestedPosts.length - 1]._id;
            for (let post of data.suggestedPosts) {
                let card = Feed(post, "generalFeed")
                middleBar.appendChild(card)
            }
            infinitScroll.updateSentinelPosition();
        } else {
            // Server confirmed: no more suggested posts — stop asking, permanently
            appState.downCursor.mode = "end";
            middleBar.appendChild(getIndicator("downCaught"));
            infinitScroll.destroy(); // removes the sentinel + disconnects the observer
        }
    }
}

export async function loadMyPosts(signal) {
    const middleBar = getMiddleBar()
    appState.myPostsCursor.createdAt = null;
    appState.myPostsCursor.postId = null;
    let loadingDiv;
    try {
        middleBar.innerHTML = " ";
        const createPostHtml = Postcreation()
        middleBar.appendChild(createPostHtml)

        loadingDiv = document.createElement("div")
        loadingDiv.innerHTML = Showloader()
        middleBar.appendChild(loadingDiv)

        let data = await getMyPosts(signal)
        data.posts = data.posts?.map(p => {
            p.userId = appState.user
            return p
        })
        for (let post of data?.posts) {
            let card = Feed(post, "userFeed")
            middleBar.appendChild(card)
        }
        if (data.hasMore) {
            appState.myPostsCursor.createdAt = data.posts[data.posts.length - 1].createdAt;
            appState.myPostsCursor.postId = data.posts[data.posts.length - 1]._id;
            middleBar.appendChild(moreButton("myposts"))
        } else {
            appState.myPostsCursor.createdAt = null;
            appState.myPostsCursor.postId = null;
        }
        if (data.posts?.length == 0) {
            let div = document.createElement("div")
            div.innerHTML = NoPost()
            div.id = "nopost";
            middleBar.appendChild(div)
        }
    } catch (err) {
        if (err.name === "AbortError") {
            toast.info("Cancelled my Posts!", 1000)
            return;
        }
        toast.error("Failed to load new Posts, Try again!")
    } finally {
        if (loadingDiv) loadingDiv.remove();
    }
}

export async function loadEditPost(signal) {
    const middleBar = getMiddleBar()
    let postId = sessionStorage.getItem("editingPostId")
    if (!postId) { history.pushState(null, '', "/post"); router(); return; }

    try {
        let data = await getSinglePost(postId, signal)
        let edit = Postcreation(true, data)
        middleBar.innerHTML = " "
        middleBar.appendChild(edit)

        // Restore progress if upload was in background
        const uploadState = appState.activeUploads.postEditing;
        if (uploadState.isUploading && uploadState.postId === postId) {
            const progressContainer = edit.querySelector('#uploadProgress');
            const progressBar = edit.querySelector('#progressBar');
            const progressText = edit.querySelector('#progressText');
            const cancelBtn = edit.querySelector('#cancelUploadBtn');
            const submitBtn = edit.querySelector('#submit-btn');
            const photoBtn = edit.querySelector('#photo-btn');
            const videoBtn = edit.querySelector('#video-btn');

            const updateProgress = (percent) => {
                if (progressBar) progressBar.style.width = percent + '%';
                if (progressText) progressText.textContent = percent + '%';
            };

            // Push new listener so XHR updates new DOM in real time
            uploadState.listeners.push(updateProgress);

            progressContainer.classList.remove('d-none');
            progressBar.style.width = uploadState.progress + '%';
            progressText.textContent = uploadState.progress + '%';
            cancelBtn.classList.remove('d-none');
            submitBtn.disabled = true;
            photoBtn.disabled = true;
            videoBtn.disabled = true;

            cancelBtn.onclick = () => {
                uploadState.abortController?.abort();
                uploadState.isUploading = false;
                uploadState.progress = 0;
                uploadState.listeners = [];
                uploadState.abortController = null;
                uploadState.postId = null;
                progressContainer.classList.add('d-none');
                submitBtn.disabled = false;
                photoBtn.disabled = false;
                videoBtn.disabled = false;
                toast.error('Upload cancelled');
            };
        }
    } catch (err) {
        if (err.name === "AbortError") { toast.info("Cancelled edit Post!", 1000); return; }
        toast.error("Failed to load edit Post, Try again!")
        history.pushState(null, '', "/post")
        router()
    }
}

// [CACHE] Re-attach the infinite-scroll observer after a cached feed is restored.
// The snapshot holds the scrolled-to cards, and appState cursors were never
// reset (we skipped loadPosts), so pagination continues exactly where it was.
export function remountFeedInfiniteScroll() {
    if (appState.downCursor.mode === "end") return;
    const middleBar = getMiddleBar();
    infinitScroll = new InfiniteScroll(middleBar, () => loadMoreInfinitScroll(getCurrentSignal()));
    infinitScroll.mount();
    setInfinitScroll(infinitScroll);
}