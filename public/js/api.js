import { appState } from "./state.js"
import { tokenManager } from "./tokenManager.js"


let refreshPromise = null
// Called ONCE on boot, and whenever a request gets 401
export async function refreshAccessToken() {
    try {
        const res = await fetch('/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        })

        if (!res.ok) return null  // refresh token expired/invalid

        const data = await res.json()
        return data.accessToken   // return raw token, boot() will store it

    } catch (err) {
        return null
    }
}
function buildHeaders(customHeaders = {}, body, token) {
    const headers = {
        ...customHeaders,
        'Authorization': `Bearer ${token}`
    }
    // Only add Content-Type if there's a body and it's not FormData
    if (body && !(body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
    }

    return headers
}
// Central fetch wrapper for ALL API calls after login
export async function apiFetch(url, options = {}) {
    const token = tokenManager.get()
    options.headers = buildHeaders(options.headers, options.body, token)

    let res = await fetch(url, options)

    // Handle token expiration
    if (res.status === 401) {
        try {
            // Deduplicate concurrent refresh requests - share single promise
            if (!refreshPromise) {
                refreshPromise = refreshAccessToken()
            }

            const newToken = await refreshPromise
            refreshPromise = null // Reset after resolution

            if (!newToken) {
                throw new Error("Refresh failed")
            }

            tokenManager.set(newToken)

            // Rebuild headers with new token and retry ONCE
            options.headers = buildHeaders(options.headers, options.body, newToken)
            res = await fetch(url, options)

        } catch (err) {
            refreshPromise = null
            tokenManager.clear()
            window.location.href = '/hero'
            return
        }
    }
    if (!res.ok) {
        let messageData = await res.json().catch(() => ({}))
        throw new Error(messageData.message || 'Failed!')
    }
    return res
}

export async function getCloudinarySignature(folder, conversationId = null) {
    const body = { folder };
    if (conversationId) body.conversationId = conversationId;
    const res = await apiFetch("/api/cloudinary/signature", {
        method: "POST",
        body: JSON.stringify(body)
    });
    return res.json();
}

export function uploadDirectToCloudinary(file, sigData, onProgress = null, abortSignal = null, uploadState = null) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (abortSignal) abortSignal.addEventListener('abort', () => xhr.abort());

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                if (uploadState) {
                    uploadState.progress = percent;
                    uploadState.listeners.forEach(fn => fn(percent));
                }
                if (onProgress) onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.error) reject(new Error(data.error.message));
                    else resolve(data);
                } catch (err) { reject(err); }
            } else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sigData.apiKey);
        form.append("timestamp", sigData.timestamp);
        form.append("signature", sigData.signature);
        form.append("folder", sigData.folder);
        form.append("type", sigData.type);
        form.append("allowed_formats", sigData.allowed_formats.join(","));
        form.append("use_filename", "true");
        form.append("unique_filename", "true");
        form.append("overwrite", "false");

        xhr.open("POST", sigData.uploadUrl);
        xhr.send(form);
    });
}

export async function getUser(signal = null) {
    let result = await apiFetch("/api/user", { signal })
    return result.json()
}

export async function getPost(signal = null) {
    let result = await apiFetch("/api/posts", { signal })
    return result.json()
}

export async function getNewFollowingPosts(signal = null) {
    let url = appState.upCursor.createdAt && appState.upCursor.postId ? `/api/newFollowingPosts?createdAt=${appState.upCursor.createdAt}&postId=${appState.upCursor.postId}` : "/api/newFollowingPosts";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function postDismiss() {
    let result = await apiFetch("/api/dismissNewFollowingPosts", {
        method: 'POST',
    })
    return result.json()
}

export async function getNewSuggestedPosts(signal = null) {
    let url = appState.suggestedCursor.createdAt && appState.suggestedCursor.postId ? `/api/suggestedPosts?createdAt=${appState.suggestedCursor.createdAt}&postId=${appState.suggestedCursor.postId}` : "/api/suggestedPosts";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getOldFollowingPosts(signal = null) {
    let url = appState.downCursor.createdAt && appState.downCursor.postId ? `/api/oldFollowingPosts?createdAt=${appState.downCursor.createdAt}&postId=${appState.downCursor.postId}` : '/api/oldFollowingPosts'
    let result = await apiFetch(url, { signal })
    return result.json()
}


// export async function postPost({ caption, file }) {
//     let public_id = null;
//     if (file) {
//         const folder = file.type.startsWith("image/") ? "social-app/posts/images" : "social-app/posts/videos";
//         const sig = await getCloudinarySignature(folder);
//         const result = await uploadDirectToCloudinary(file, sig);
//         public_id = result.public_id;
//     }
//     const res = await apiFetch("/api/post", {
//         method: "POST",
//         body: JSON.stringify({ caption, public_id })
//     });
//     return res.json();
// }

// export async function editPost({ caption, postId, file, check }) {
//     let public_id = null;
//     if (file) {
//         const folder = file.type.startsWith("image/") ? "social-app/posts/images" : "social-app/posts/videos";
//         const sig = await getCloudinarySignature(folder);
//         const result = await uploadDirectToCloudinary(file, sig);
//         public_id = result.public_id;
//     }
//     const res = await apiFetch("/api/editPost", {
//         method: "POST",
//         body: JSON.stringify({ caption, postId, public_id, check })
//     });
//     return res.json();
// }

export async function postPost({ caption, file, onProgress, abortSignal }) {
    let public_id = null;
    if (file) {
        const folder = file.type.startsWith("image/") ? "social-app/posts/images" : "social-app/posts/videos";
        const sig = await getCloudinarySignature(folder);
        const uploadState = appState.activeUploads.postCreation;
        const result = await uploadDirectToCloudinary(file, sig, onProgress, abortSignal, uploadState);
        public_id = result.public_id;
    }
    const res = await apiFetch("/api/post", { method: "POST", body: JSON.stringify({ caption, public_id }) });
    return res.json();
}

export async function editPost({ caption, postId, file, check, onProgress, abortSignal }) {
    let public_id = null;
    if (file) {
        const folder = file.type.startsWith("image/") ? "social-app/posts/images" : "social-app/posts/videos";
        const sig = await getCloudinarySignature(folder);
        const uploadState = appState.activeUploads.postEditing;
        const result = await uploadDirectToCloudinary(file, sig, onProgress, abortSignal, uploadState);
        public_id = result.public_id;
    }
    const res = await apiFetch("/api/editPost", { method: "POST", body: JSON.stringify({ caption, postId, public_id, check }) });
    return res.json();
}

export async function getMyPosts(signal = null) {
    let url = appState.myPostsCursor.createdAt && appState.myPostsCursor.postId ? `/api/userPosts?createdAt=${appState.myPostsCursor.createdAt}&postId=${appState.myPostsCursor.postId}` : '/api/userPosts';
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getComments(postId, lastId = null, signal = null) {
    let url = lastId ? `/api/comments/${postId}?lastId=${lastId}` : `/api/comments/${postId}`;
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function postComment(postId, text) {
    let result = await apiFetch("/api/postComment", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, comment: text }),
    })
    return result.json()
}

export async function postLike(postId) {
    let result = await apiFetch(`/api/post/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
    });
    return result.json();
}

export async function getLike(postId, lastId = null, signal = null) {
    let url = lastId ? `/api/like/${postId}?lastId=${lastId}` : `/api/like/${postId}`;
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getSinglePost(postId, signal = null) {
    let result = await apiFetch(`/api/post/${postId}`, { signal })
    return result.json()
}

export async function deletePost(postId) {
    let result = await apiFetch("/api/deletePost", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId })
    })
    return result.json()
}

export async function postFollow(id) {
    let result;
    result = await apiFetch(`/api/follow`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id }),
    })
    return result.json()
}

export async function getUsers(signal = null) {
    let url = appState.peopleCursor.createdAt && appState.peopleCursor._id ? `/api/users?createdAt=${appState.peopleCursor.createdAt}&_id=${appState.peopleCursor._id}` : "/api/users";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getFollowing(lastId = null, signal = null) {
    let url = lastId ? `/api/user/following?cursor=${lastId}` : "/api/user/following";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function postUnfollow(userId) {
    let result = await apiFetch("/api/user/unfollow", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
    })
    return result.json()
}

export async function getFollower(lastId = null, signal = null) {
    let url = lastId ? `/api/user/follower?cursor=${lastId}` : "/api/user/follower";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function postBlock(userId) {
    let result = await apiFetch("/api/user/block", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId }),
    })
    return result.json()
}

export async function postCoverPhoto(file) {
    const sig = await getCloudinarySignature("social-app/covers");
    const result = await uploadDirectToCloudinary(file, sig);
    const saveRes = await apiFetch("/api/user/upload-cover", {
        method: "POST",
        body: JSON.stringify({ public_id: result.public_id })
    });
    return saveRes.json();
}

export async function postProfilePhoto(file) {
    const sig = await getCloudinarySignature("social-app/profiles");
    const result = await uploadDirectToCloudinary(file, sig);
    const saveRes = await apiFetch("/api/user/upload-profile", {
        method: "POST",
        body: JSON.stringify({ public_id: result.public_id })
    });
    return saveRes.json();
}

export async function getAnalytics(signal = null) {
    let result = await apiFetch("/api/getAnalytics", { signal })
    return result.json()
}

export async function getUserProfile(userId, signal = null) {
    let result = await apiFetch(`/api/userProfile?userId=${userId}`, { signal })
    return result.json()
}

export async function getUserPosts(signal = null) {
    let userId = appState.userPostsCursor.userId._id;
    if (!userId) throw new Error("invlaid user attempt!");
    let url = appState.userPostsCursor.createdAt && appState.userPostsCursor.postId ? `/api/userPosts?userId=${userId}&createdAt=${appState.userPostsCursor.createdAt}&postId=${appState.userPostsCursor.postId}` : `/api/userPosts?userId=${userId}`;
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getProfileViews(signal = null) {
    let result = await apiFetch("/api/profile-views", { signal })
    return result.json()
}

export async function FollowerStats(signal = null) {
    let result = await apiFetch("/api/followerStats", { signal })
    return result.json()
}

export async function FollowingStats(signal = null) {
    let result = await apiFetch("/api/followingStats", { signal })
    return result.json()
}

export async function getMoreLikes(cursor = null, signal = null) {
    let url = cursor ? `/api/user/likes?cursor=${cursor}` : '/api/user/likes';
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function getMoreComments(cursor = null, signal = null) {
    let path = cursor ? `/api/user/comments?cursor=${cursor}` : '/api/user/comments';
    let result = await apiFetch(path, { signal })
    return result.json()
}


export async function postDeleteComment(id) {
    let result = await apiFetch("/api/user/deleteComment", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id }),
    })
    return result.json()
}

export async function postEditComment(id, comment) {
    let result = await apiFetch("/api/user/editComment", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, comment }),
    })
    return result.json()
}


export async function putupdatePersonalInformation(newData) {
    let result = await apiFetch("/api/setting/personalInformation", {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newData),
    })
    return result.json()
}

export async function postRemoveCoverPhoto() {
    let result = await apiFetch("/api/setting/removeCover", {
        method: "POST",
    })
    return result.json();
}

export async function postRemoveProfilePhoto() {
    let result = await apiFetch("/api/setting/removeProfile", {
        method: "POST",
    })
    return result.json();
}

export async function getBlockedPeople(lastId = null, signal = null) {
    let url = lastId ? `/api/setting/blockedPeople?lastId=${lastId}` : "/api/setting/blockedPeople";
    let result = await apiFetch(url, { signal })
    return result.json()
}

export async function postUnblock(blockId) {
    let result = await apiFetch("/api/setting/unblock", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blockId }),
    })
    return result.json()
}

export async function postChangePassword(oldPassword, newPassword) {
    let result = await apiFetch("/api/setting/changePassword", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword }),
    })
    return result.json()
}

export async function postChangeEmail(currentPassword, newEmail) {
    let result = await apiFetch("/api/setting/changeEmail", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newEmail }),
    })
    return result.json()
}

export async function postLogout() {
    let result = await apiFetch("/api/setting/logout", {
        method: 'POST',
    })
    return result.json()
}

export async function deleteAccount(password, confirmation) {
    let result = await apiFetch("/api/setting/deleteAccount", {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password, confirmation }),
    })
    tokenManager.clear()
    return result.json()
}


export async function searchUsers(q, cursor = {}, signal) {
    const params = new URLSearchParams({ q });
    if (cursor.createdAt) params.append('createdAt', cursor.createdAt);
    if (cursor._id) params.append('_id', cursor._id);
    const res = await apiFetch(`/api/users/search?${params.toString()}`, { signal });
    return res.json();
}


// SIGNED URL CACHE & MANAGEMENT
const signedUrlCache = new Map();
const pendingRequests = new Map();

async function getSignedUrl(filename) {
    try {
        const response = await apiFetch('/api/video-access', {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get signed URL:', error);
        return null;
    }
}

export async function requestSignedUrl(filename) {
    const cached = signedUrlCache.get(filename);
    if (cached && Date.now() + (5 * 60 * 1000) < cached.expires) {
        return cached.url;
    }

    if (pendingRequests.has(filename)) {
        const result = await pendingRequests.get(filename);
        return result?.videoUrl || null;
    }

    const requestPromise = getSignedUrl(filename);
    pendingRequests.set(filename, requestPromise);

    const result = await requestPromise;
    pendingRequests.delete(filename);

    if (result?.videoUrl) {
        signedUrlCache.set(filename, {
            url: result.videoUrl,
            expires: Date.now() + result.expiresIn
        });
        return result.videoUrl;
    }
    return null;
}

export async function refreshExpiredUrl(filename, video) {
    const currentTime = video.currentTime;

    try {
        signedUrlCache.delete(filename);

        const signedUrl = await requestSignedUrl(filename);

        if (signedUrl) {
            video.src = signedUrl;
            video.addEventListener('loadedmetadata', () => {
                video.currentTime = currentTime;
                if (!video.paused) {
                    video.play();
                }
            }, { once: true });
            return true;
        }
        return false;

    } catch (error) {
        console.error('Failed to refresh URL:', error);
        return false;
    }
}

// Clean expired cache every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [filename, cached] of signedUrlCache) {
        if (now > cached.expires) {
            signedUrlCache.delete(filename);
        }
    }
}, 10 * 60 * 1000);