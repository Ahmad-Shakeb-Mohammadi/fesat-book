import { getUser, getUsers, getFollowing, getFollower, getUserProfile, getUserPosts } from "../api.js";
import { Totalshow, Peoplecard, Followerfollowing, Nopeople } from "../components/Network.js";
import { Showloader } from "../components/Showloader.js";
import { moreButton, Feed, NoPost } from "../components/Feed.js";
import { newLoadMoreBtn } from "../components/setting.js";
import { Profile, ProfileButtons } from "../components/Profile.js";
import { appState } from "../state.js";
import { toast } from "../utils/toast.js";

function getMiddleBar() {
    return document.getElementById("main-content--body");
}

export async function loadNetwork(signal) {
    const middleBar = getMiddleBar()
    appState.peopleCursor.createdAt = null;
    appState.peopleCursor._id = null;
    try {
        let user = await getUser(signal)
        appState.user = user
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Network, Try again!")
        return;
    }
    middleBar.innerHTML = Totalshow(appState.user.followerCount || 0, appState.user.followingCount || 0)
    let loadingDiv = document.createElement("div")
    loadingDiv.innerHTML = Showloader()
    middleBar.appendChild(loadingDiv)
    try {
        let data = await getUsers(signal);
        const peopleFlexContainer = document.createElement("div");
        peopleFlexContainer.classList.add(
            "container-fluid",
            "p-0",
            "peopleTotalContainer",
            "d-flex",
            "flex-wrap",
            "justify-content-center",
            "gap-3"
        );
        data.users?.forEach(el => {
            peopleFlexContainer.appendChild(Peoplecard(el))
        })
        middleBar.appendChild(peopleFlexContainer)
        if (data.hasMore && data.users?.length > 0) {
            appState.peopleCursor.createdAt = data.users[data.users.length - 1].createdAt;
            appState.peopleCursor._id = data.users[data.users.length - 1]._id;
            middleBar.appendChild(moreButton("people"))
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Users, Try again!")
    } finally {
        if (loadingDiv) loadingDiv.remove();
    }
}

export async function loadFollowing(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await getFollowing(null, signal)
        middleBar.innerHTML = "";
        if (data.following?.length > 0) {
            data.following.forEach(el => {
                let containerDiv = document.createElement("div")
                containerDiv.classList.add("followingCards")
                containerDiv.dataset.userId = el._id;
                containerDiv.innerHTML = Followerfollowing(el, "following")
                middleBar.appendChild(containerDiv)
            })
            if (data.hasMore) middleBar.appendChild(newLoadMoreBtn(data.lastId, 'following'));
        } else {
            middleBar.innerHTML = Nopeople()
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Followings, Try again!")
    }
}

export async function loadFollower(signal) {
    const middleBar = getMiddleBar()
    try {
        let data = await getFollower(null, signal)
        middleBar.innerHTML = "";
        if (data.followers?.length > 0) {
            data.followers.forEach(el => {
                let containerDiv = document.createElement("div")
                containerDiv.classList.add("container", "mt-4", "followingCards")
                containerDiv.dataset.userId = el._id;
                containerDiv.innerHTML = Followerfollowing(el, "follower")
                middleBar.appendChild(containerDiv)
            })
            if (data.hasMore) middleBar.appendChild(newLoadMoreBtn(data.lastId, 'follower'));
        } else {
            middleBar.innerHTML = Nopeople()
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load Followers, Try again!")
    }

}

export async function loadUserProfile(userId, signal) {
    const middleBar = getMiddleBar()
    appState.userPostsCursor.createdAt = null;
    appState.userPostsCursor.postId = null;
    appState.userPostsCursor.userId = null;
    let loadingDiv;
    if (!userId) return;
    try {
        let data = await getUserProfile(userId, signal)
        appState.userPostsCursor.userId = data;
        middleBar.innerHTML = Profile(data)
        middleBar.querySelector("#profileBtns").innerHTML = ProfileButtons(data.isFollowing)
        loadingDiv = document.createElement("div")
        loadingDiv.innerHTML = Showloader()
        middleBar.appendChild(loadingDiv)
        let userPosts = await getUserPosts(signal)
        if (userPosts?.posts?.length > 0) {
            for (let post of userPosts.posts) {
                post.userId = data;
                let card = Feed(post, "NoButtonFeed")
                middleBar.appendChild(card)
            }
            if (userPosts.hasMore) {
                appState.userPostsCursor.createdAt = userPosts.posts[userPosts.posts.length - 1].createdAt;
                appState.userPostsCursor.postId = userPosts.posts[userPosts.posts.length - 1]._id;
                let btn = moreButton("peoplePosts")
                btn.classList.add("mt-0")
                middleBar.appendChild(btn)
            } else {
                appState.userPostsCursor.createdAt = null;
                appState.userPostsCursor.postId = null;
                appState.userPostsCursor.userId = null;
            }
        } else {
            let div = document.createElement("div")
            div.innerHTML = NoPost()
            middleBar.appendChild(div)
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load User, Try again!")
    } finally {
        if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
    }

}
