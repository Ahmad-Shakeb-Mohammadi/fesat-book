import { getAnalytics, getProfileViews, FollowerStats, FollowingStats, getMoreLikes, getMoreComments } from "../api.js"
import { Profile, attachPhotoButtons, AnalyticsSection, ActivitiesSection, ProfileViewers, FollowersSimpleStats, NoActivity } from "../components/Profile.js";
import { Showloader } from "../components/Showloader.js";
import { Feed, moreButton } from "../components/Feed.js";
import { appState } from "../state.js";
import { toast } from "../utils/toast.js";

function getMiddleBar() {
    return document.getElementById("main-content--body");
}

export async function loadProfile(signal) {
    const middleBar = getMiddleBar()
    let loadingDiv;
    try {
        const openOffcanvas = document.querySelector('.offcanvas.show');
        if (openOffcanvas) {
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(openOffcanvas);
            if (offcanvasInstance) offcanvasInstance.hide();
        }
        middleBar.innerHTML = Profile(appState.user)
        attachPhotoButtons()

        let analyticsDiv = document.createElement("div")
        analyticsDiv.classList.add("container", "mt-4")

        loadingDiv = document.createElement("div")
        loadingDiv.innerHTML = Showloader()
        middleBar.appendChild(loadingDiv)
        let analytics = await getAnalytics(signal)
        analyticsDiv.innerHTML = AnalyticsSection(appState.user, analytics)
        middleBar.appendChild(analyticsDiv)
        let activitiesDiv = document.createElement("div")
        activitiesDiv.classList.add("container", "mt-4")
        activitiesDiv.innerHTML = ActivitiesSection(appState.user, analytics)
        middleBar.appendChild(activitiesDiv)
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Profile, Try again!")
    } finally {
        if (loadingDiv && loadingDiv.parentNode) {
            middleBar.removeChild(loadingDiv)
        }
    }
}

export async function loadProfileViews(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await getProfileViews(signal)
        middleBar.innerHTML = ProfileViewers(data.lastViews)
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Profile Views, Try again!")
    }
}

export async function loadFollowersGraph(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await FollowerStats(signal)
        middleBar.innerHTML = FollowersSimpleStats(data, 'followers')
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Followers Graph, Try again!")
    }
}

export async function loadFollowingGraph(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await FollowingStats(signal)
        middleBar.innerHTML = FollowersSimpleStats(data, 'following')
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Followings Graph, Try again!")
    }
}

export async function loadLikes(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await getMoreLikes(null, signal)
        middleBar.innerHTML = " "
        if (data.data?.length == 0) {
            middleBar.innerHTML = NoActivity('like')
            return;
        }
        for (let post of data.data) {
            let card = Feed(post.postId, "likeFeed")
            middleBar.appendChild(card)
        }
        if (data.hasMore) {
            appState.likeCursor = data.nextCursor;
            let btn = moreButton('like')
            middleBar.appendChild(btn)
        } else {
            appState.likeCursor = null;
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Likes, Try again!")
    }
}

export async function loadComments(signal) {
    const middleBar = getMiddleBar()
    try {
        const data = await getMoreComments(null,signal)
        middleBar.innerHTML = " ";
        if (data.data?.length == 0) {
            middleBar.innerHTML = NoActivity('comment')
            return;
        }
        for (let post of data.data) {
            let comment = {               
                comment: post.comment,
                userId: appState.user,
                _id: post._id
            };
            let card = Feed(post.postId, "commentFeed", comment)
            middleBar.appendChild(card)
        }
        if (data.hasMore) {
            appState.commentCursor = data.nextCursor;
            let btn = moreButton('comment')
            middleBar.appendChild(btn)
        } else {
            appState.commentCursor = null;
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Comments, Try again!")
    }
}