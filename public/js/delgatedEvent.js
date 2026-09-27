import { getComments, getUsers, postLogout } from "./api.js"
import { Comment } from "./components/Feed.js";
import { Nomessage } from "./components/Feed.js"
import { postComment } from "./api.js"
import { appState } from "./state.js"
import { Showloader } from "./components/Showloader.js"
import { postLike } from "./api.js"
import { router } from "./router.js";
import { deletePost } from "./api.js"
import { getLike } from "./api.js"
import { LikeItem } from "./components/Feed.js"
import { postFollow } from "./api.js"
import { postUnfollow } from "./api.js"
import { Nopeople } from "./components/Network.js"
import { postBlock } from "./api.js"
import { postCoverPhoto } from "./api.js"
import { postProfilePhoto } from "./api.js"
import { ProfileButtons } from "./components/Profile.js"
import { getMoreLikes } from "./api.js"
import { Feed, moreButton } from "./components/Feed.js"
import { postDeleteComment } from "./api.js"
import { getMoreComments } from "./api.js"
import { postDismiss } from "./api.js"
import { getMyPosts } from "./api.js"
import { createPostCommentElement } from "./components/Feed.js"
import { postEditComment } from "./api.js"
import { Peoplecard } from "./components/Network.js"
import { getUserPosts } from "./api.js";
import { putupdatePersonalInformation } from "./api.js";
import { postRemoveCoverPhoto } from "./api.js"
import { postRemoveProfilePhoto } from "./api.js"
import { getBlockedPeople } from "./api.js"
import { BlockedUser, newLoadMoreBtn, NoBlock } from "./components/setting.js";
import { postUnblock } from "./api.js"
import { postChangePassword } from "./api.js"
import { postChangeEmail } from "./api.js";
import { getFollowing } from "./api.js";
import { Followerfollowing } from "./components/Network.js"
import { getFollower } from "./api.js"
import { tokenManager } from "./tokenManager.js"
import { deleteAccount } from "./api.js"
import { getCurrentSignal } from "./router.js";
import { toast } from "./utils/toast.js";
import { disconnectSocket } from "./chat/socketManager.js";
import { cleanupGlobalSocketHandlers } from "./chat/globalSocketHandlers.js";
import { openSearchPeopleModal, closeSearchPeopleModal, handleSearchPeopleInput, handleSearchLoadMore } from "./searchPoeple.js";
import { navigateToConversation } from "./chat/chatNavigator.js";
import { invalidateRoute, invalidateAll } from "./utils/routeCache.js";

// Simple function to find and update all instances of a post
function updateAllPostInstances(postId, updates) {
    // Find all cards that contain this post ID
    const allCards = document.querySelectorAll(`.card`);

    allCards.forEach(card => {
        // Check if this card contains our post
        const likeBtn = card.querySelector(`.like-btn[data-post-id="${postId}"]`);
        if (!likeBtn) return; // Skip if this card doesn't have our post

        // Update like button state
        const icon = likeBtn.querySelector('.like-icon');
        if (updates.userLiked !== undefined) {
            if (updates.userLiked) {
                likeBtn.classList.add('liked');
                if (icon) icon.src = 'icons/like-filled.svg';
            } else {
                likeBtn.classList.remove('liked');
                if (icon) icon.src = 'icons/like.svg';
            }
        }

        // Update like count
        if (updates.likes !== undefined) {
            const likeCountSpan = card.querySelector('.like-count');
            if (likeCountSpan) {
                likeCountSpan.textContent = updates.likes;
            }
        }
    });
}

// Simple function to update comment count across all instances
function updateCommentCountAllInstances(postId, newCount) {
    document.querySelectorAll(`.containerId[data-post-id="${postId}"]`).forEach(container => {
        const commentCountSpan = container.querySelector(".comment-count");
        if (commentCountSpan) {
            commentCountSpan.textContent = newCount;
        }
    });
}


export function FeedDelegation() {
    const middleBar = document.getElementById("main-content--body")
    if (!middleBar) return;

    middleBar.addEventListener("input", function (e) {
        if (e.target.matches("#searchPeopleInput")) {
            handleSearchPeopleInput(e.target.value);
        }
    });

    middleBar.addEventListener("click", async function (e) {
        const signal = getCurrentSignal()

        const likeBtn = e.target.closest(".like-btn")
        const commentToggles = e.target.closest(".comment-toggle")
        const postCommentBtn = e.target.closest(".postComment")
        const followBtn = e.target.closest(".modern-follow-btn")
        const editBtn = e.target.closest('.edit-action')
        const deleteBtn = e.target.closest('.delete-action')
        const likeToggle = e.target.closest('.views-btn')
        const peopleFollowBtn = e.target.closest('.people-follow-btn')
        const unfollowBtn = e.target.closest(".unfollow-btn")
        const blockBtn = e.target.closest(".block-btn")
        const coverBtn = e.target.closest("#coverUploadBtn")
        const profileBtn = e.target.closest("#profileUploadBtn")
        const peopleCard = e.target.closest(".people-card")
        const profileFollowBtn = e.target.closest(".profileFollowBtn")
        const viewerFollowBtn = e.target.closest(".viewerFollowBtn")
        const loadMoreLike = e.target.closest(".load-more-like")
        const loadMoreComment = e.target.closest(".load-more-comment")
        const deleteComment = e.target.closest(".deleteCommentBtn")
        const editComment = e.target.closest(".editCommentBtn")
        const dissmisPostsBtn = e.target.closest(".dismiss-new-posts")
        const loadMoreMyPosts = e.target.closest(".load-more-myposts")
        const loadMorePeople = e.target.closest(".load-more-people")
        const loadMorePeoplePosts = e.target.closest(".load-more-peoplePosts")
        const loadMoreFollowing = e.target.closest(".load-more-following")
        const loadMoreFollower = e.target.closest(".load-more-follower")
        const personalInfoForm = e.target.closest(".submit-personal-form")
        const removeCoverPhoto = e.target.closest(".remove-cover")
        const removeProfilePhoto = e.target.closest(".remove-profile")
        const loadMoreBlockUsers = e.target.closest(".load-more-block")
        const unblockBtn = e.target.closest(".unblockBtn")
        const submitPassword = e.target.closest(".submitChangePassword")
        const submitEmail = e.target.closest(".submitChangeEmail")
        const logoutBtn = e.target.closest('.confirm-logout-btn');
        const cancelLogoutBtn = e.target.closest('[data-bs-dismiss="modal"]');
        const AccountDeleteBtn = e.target.closest('#deleteAccountBtn')
        const AccountConfirmDeleteBtn = e.target.closest('#confirmDeleteBtn')
        const openSearchBtn = e.target.closest("#openPeopleSearch");
        const searchCloseBtn = e.target.closest(".search-people-close-btn");
        const searchOverlay = e.target.matches?.("#searchPeopleOverlay");
        const searchLoadMoreBtn = e.target.closest("#searchLoadMoreBtn");
        const messageBtn = e.target.closest(".message-btn")

        if (likeBtn) {
            e.preventDefault();
            if (likeBtn.disabled) return;
            likeBtn.disabled = true;

            const postId = likeBtn.dataset.postId;
            const icon = likeBtn.querySelector('.like-icon');
            const wasLiked = likeBtn.classList.contains('liked');

            const currentCard = likeBtn.closest('.card');
            const parentBody = likeBtn.closest(".card-body") || currentCard;

            if (parentBody) {
                const likeDiv = parentBody.querySelector(`.likes-view-${postId}`);
                if (likeDiv && !likeDiv.classList.contains("d-none")) {
                    likeDiv.classList.add("d-none");
                    const viewsBtn = parentBody.querySelector(".views-btn");
                    if (viewsBtn?.querySelector('img')) {
                        viewsBtn.querySelector('img').style.transform = 'rotate(0deg)';
                    }
                }
            }

            icon.style.transform = 'scale(1.2)';
            let initialAnimationTimeout = setTimeout(() => {
                icon.style.transform = 'scale(1)';
            }, 150);

            try {
                const data = await postLike(postId);
                const likeCountSpan = currentCard.querySelector('.like-count');
                const currentLikes = parseInt(likeCountSpan.textContent) || 0;
                const newLikes = wasLiked ? currentLikes - 1 : currentLikes + 1;

                // Synchronize ALL duplicate elements matching this post across the DOM
                updateAllPostInstances(postId, {
                    likes: newLikes,
                    userLiked: !wasLiked
                });

                if (!wasLiked) {
                    clearTimeout(initialAnimationTimeout);
                    setTimeout(() => {
                        icon.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            icon.style.transform = 'scale(1)';
                        }, 100);
                    }, 50);
                }
            } catch (error) {
                toast.error("Failed to like!")
                icon.style.transform = 'scale(1)';
            } finally {
                // Safely re-enable ALL matching action buttons across the entire layout
                document.querySelectorAll(`.like-btn[data-post-id="${postId}"]`).forEach(btn => {
                    btn.disabled = false;
                });
            }

        } else if (commentToggles) {
            let parent = e.target.closest('.card-body')
            let containerId = e.target.closest('.containerId')
            const postId = containerId.dataset.postId
            let commentsContainer = containerId.querySelector(".commentsContainer")
            if (!postId) return;
            let commentSection;
            if (parent) {
                commentSection = parent.querySelector(".commentsDiv")
                commentSection.classList.toggle("d-none");
            }
            if (commentSection.classList.contains('d-none')) {
                cleanupCommentListeners(commentsContainer)
                return
            } else {
                let likeDiv = parent.querySelector(`.likes-view-${postId}`)
                if (likeDiv && !likeDiv.classList.contains("d-none")) {
                    likeDiv.classList.add("d-none")
                    let btn = parent.querySelector(".views-btn")
                    btn.querySelector('img').style.transform = 'rotate(0deg)';
                }
            }
            commentsContainer.innerHTML = Showloader()
            try {
                let data = await getComments(postId, null, signal)
                commentsContainer.innerHTML = " ";
                if (data.comments.length == 0) {
                    let messageDiv = Nomessage()
                    commentsContainer.innerHTML = messageDiv
                    return;
                }
                commentsContainer.innerHTML = ' '
                for (let comment of data.comments) {
                    let commentDiv = Comment(comment)
                    commentsContainer.appendChild(commentDiv)
                }
                if (data.hasMore) {
                    addCommentScrollListener(commentsContainer, postId, data.lastId)
                }
            } catch (err) {
                commentsContainer.innerHTML = "";
                if (err.name === 'AbortError') {
                    commentsContainer.classList.add('d-none')
                    return;
                }
                toast.error("Failed to load Comments!")
            }

            function addCommentScrollListener(container, postId, lastId) {
                let loading = false;

                const scrollHandler = async (e) => {
                    if (loading) return;

                    const { scrollTop, clientHeight, scrollHeight } = e.target;
                    if (scrollTop + clientHeight >= scrollHeight - 20) {
                        loading = true;
                        let loadingDiv = document.createElement("div")
                        loadingDiv.innerHTML = Showloader()
                        container.appendChild(loadingDiv)
                        try {
                            let prevErr = container.querySelector(".more-comment-err")
                            if (prevErr) prevErr.remove();
                            const { comments, hasMore, lastId: newLastId } = await getComments(postId, lastId, signal);
                            for (let comment of comments) {
                                let commentDiv = Comment(comment)
                                container.appendChild(commentDiv)
                            }
                            if (!hasMore) {
                                container.removeEventListener('scroll', scrollHandler);
                            } else {
                                lastId = newLastId;
                            }
                        } catch (err) {
                            if (err.name === 'AbortError') return;
                            toast.error("Failed to load more Comments!")
                        } finally {
                            loading = false;
                            if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
                        }
                    }
                };

                container.addEventListener('scroll', scrollHandler);
                // Store for cleanup
                container._scrollHandler = scrollHandler;
            }

            // When comments section is closed/hidden
            function cleanupCommentListeners(container) {
                if (container._scrollHandler) {
                    container.removeEventListener('scroll', container._scrollHandler);
                    container._scrollHandler = null;
                }
            }
        } else if (postCommentBtn) {
            const parent = e.target.closest(".comment-section")
            const containerId = e.target.closest('.containerId')
            let commentsContainer = containerId.querySelector(".commentsContainer")
            const postId = containerId.dataset.postId
            const isEditing = postCommentBtn.dataset.mode;
            const input = parent.querySelector("input")
            let text = input.value;
            if (text) {
                text = text.trim()
            }
            if (!text) {
                input.value = ''
                return;
            }
            if (isEditing) {
                postCommentBtn.disabled = true;
                let id = postCommentBtn.dataset.id;
                if (!id) return;
                let upperParent = postCommentBtn.parentNode.parentNode.parentNode;
                try {
                    await postEditComment(id, text)
                    let textDiv = upperParent.querySelector(".comment-text")
                    if (textDiv) textDiv.textContent = text;
                    upperParent.querySelector(".comment-section")?.remove();
                } catch (err) {
                    toast.error("Failed to edit comment!")
                }
                postCommentBtn.disabled = false;
            } else {
                try {
                    postCommentBtn.disabled = true;
                    await postComment(postId, text)
                    input.value = ''
                    let isExist = containerId.querySelector("#noComment")
                    if (isExist) {
                        commentsContainer.innerHTML = " ";
                    }
                    let comment = {
                        userId: {
                            _id: appState.user._id,
                            name: appState.user.name,
                            profileUrl: appState.user.profileUrl,
                            job: appState.user.job
                        },
                        comment: text
                    }
                    let commentDiv = Comment(comment)
                    commentsContainer.prepend(commentDiv)
                    let span = containerId.querySelector(".comment-count")
                    let number = parseInt(span.textContent)
                    const newCount = number + 1;
                    commentsContainer.scrollTo({ top: 0, behavior: 'smooth' })
                    span.innerHTML = newCount;
                    // ADD THIS LINE: Update counter on all duplicate instances
                    updateCommentCountAllInstances(postId, newCount);
                } catch (err) {
                    toast.error("Failed to post comment!")
                }
                postCommentBtn.disabled = false;
            }

        } else if (likeToggle) {
            e.preventDefault();
            let postId = likeToggle.dataset.postId;

            const card = likeToggle.closest('.card');
            const container = card.querySelector(`.likes-view-${postId}`);

            if (container.classList.contains('d-none')) {
                let parent = likeToggle.closest(".card-body");
                let commentDiv = parent.querySelector(".commentsDiv");
                if (commentDiv && !commentDiv.classList.contains("d-none")) {
                    commentDiv.classList.add("d-none");
                }

                container.classList.remove('d-none');
                container.innerHTML = Showloader();
                try {
                    let data = await getLike(postId, null, signal)
                    container.innerHTML = '';
                    for (let like of data.likes) {
                        container.appendChild(LikeItem(like))
                    }
                    likeToggle.querySelector('img').style.transform = 'rotate(180deg)';
                    if (data.hasMore) {
                        addLikeScrollListener(container, postId, data.lastId)
                    }
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    toast.error("Failed to load Likes!")
                }
            } else {
                container.classList.add('d-none');
                likeToggle.querySelector('img').style.transform = 'rotate(0deg)';
                cleanupLikeListeners(container)
            }

            function addLikeScrollListener(container, postId, lastId) {
                let loading = false;

                const scrollHandler = async (e) => {
                    if (loading) return;
                    const { scrollTop, clientHeight, scrollHeight } = e.target;
                    if (scrollTop + clientHeight >= scrollHeight - 10) {
                        loading = true;
                        let loadingDiv = document.createElement("div")
                        loadingDiv.classList.add("w-100")
                        loadingDiv.innerHTML = Showloader()
                        container.appendChild(loadingDiv)
                        try {
                            let prevErr = container.querySelector(".more-like-err")
                            if (prevErr) prevErr.remove();
                            const { likes, hasMore, lastId: newLastId } = await getLike(postId, lastId, signal);
                            for (let like of likes) {
                                container.appendChild(LikeItem(like))
                            }
                            if (!hasMore) {
                                container.removeEventListener('scroll', scrollHandler);
                            } else {
                                lastId = newLastId;
                            }
                        } catch (err) {
                            if (err.name === 'AbortError') return;
                            toast.error("Failed to load more Likes!")
                        } finally {
                            loading = false;
                            if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
                        }
                    }
                };

                container.addEventListener('scroll', scrollHandler);
                container._scrollHandler = scrollHandler;
            }

            function cleanupLikeListeners(container) {
                if (container._scrollHandler) {
                    container.removeEventListener('scroll', container._scrollHandler);
                    container._scrollHandler = null;
                }
            }
        } else if (editBtn) {
            e.preventDefault();
            const postId = editBtn.dataset.postId;
            if (!postId) return;
            sessionStorage.setItem("editingPostId", postId)
            history.pushState(null, '', '/editPost')
            router();
        } else if (deleteBtn) {
            e.preventDefault();
            e.target.disabled = true
            const postId = deleteBtn.dataset.postId;
            let containerId = middleBar.querySelector(`.containerId[data-post-id="${postId}"]`)
            if (!containerId || !postId) return;
            if (confirm("Are you sure to delete this post?")) {
                try {
                    await deletePost(postId)
                    middleBar.removeChild(containerId)
                } catch (err) {
                    toast.error("Failed to delete Post!")
                }
            }
            e.target.disabled = false;
        } else if (followBtn) {
            let id = e.target.dataset.userId
            if (!id) {
                return
            }
            e.target.disabled = true;
            try {
                await postFollow(id)
                let allFollowBtns = document.querySelectorAll(".modern-follow-btn")
                allFollowBtns.forEach(btn => {
                    if (btn.dataset.userId == id) {
                        btn.classList.toggle('following')
                        if (btn.classList.contains('following')) {
                            btn.textContent = 'Following'
                        } else {
                            btn.textContent = '+ Follow'
                        }
                    }
                })
                invalidateRoute("/home", "/network");
                e.target.disabled = false;
            } catch (err) {
                toast.error("Failed to Follow!")
                e.target.disabled = false;
            }
        } else if (peopleFollowBtn) {
            e.stopPropagation()
            e.preventDefault()
            let userId = e.target.dataset.userId
            if (!userId) return;
            let numDiv = document.getElementById("followingNum")
            e.target.disabled = true
            try {
                await postFollow(userId)
                if (!e.target.classList.contains("followed")) {
                    e.target.classList.add("followed")
                    e.target.textContent = "Following";
                    if (numDiv) {
                        numDiv.textContent = parseInt(numDiv.textContent) + 1
                    }
                } else {
                    e.target.classList.remove("followed")
                    e.target.textContent = "Follow"
                    if (numDiv) {
                        numDiv.textContent = parseInt(numDiv.textContent) - 1
                    }
                }
                invalidateRoute("/home", "/network");
                e.target.disabled = false
            } catch (err) {
                if (err.message == "BLOCKED") {
                    toast.error("User blocked You")
                    e.target.disabled = true;
                } else {
                    toast.error("Failed to follow!")
                    e.target.disabled = false;
                }
            }

        } else if (unfollowBtn) {
            e.target.disabled = true
            let parent = e.target.closest(".userCard")
            let userId = e.target.dataset.userId
            if (!userId) return;
            try {
                let data = await postUnfollow(userId)
                parent.remove()
                if (data.hasPeople < 1) {
                    middleBar.innerHTML = Nopeople()
                }
            } catch (err) {
                toast.error("Failed to unfollow!")
            }
            invalidateRoute("/home", "/network");
            e.target.disabled = false
        } else if (blockBtn) {
            try {
                e.target.disabled = true
                e.target.textContent = "Blocking..."
                let parent = e.target.closest(".container")
                let userId = parent.dataset.userId
                if (!userId) return;
                let data = await postBlock(userId)
                middleBar.removeChild(parent)
                if (data.hasPeople < 1) {
                    middleBar.innerHTML = Nopeople()
                }
                invalidateRoute("/home", "/network");
            } catch (err) {
                toast.error("Failed to block!")
                e.target.disabled = false;
                e.target.textContent = 'Block';
            }
        } else if (coverBtn) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/jpeg,image/jpg,image/png';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB'); return; }

                coverBtn.disabled = true;
                const originalHTML = coverBtn.innerHTML;
                coverBtn.innerHTML = `...`;

                try {
                    let data = await postCoverPhoto(file);
                    appState.user.coverUrl = data.coverUrl;
                    let leftImg = document.querySelector('#leftSideCoverPhoto img'); if (leftImg) leftImg.src = data.coverUrl;
                    let img = document.querySelector("#coverContainer img"); if (img) img.src = data.coverUrl;
                    toast.success("Cover updated");
                } catch (error) {
                    toast.error("Failed to upload Cover photo!");
                } finally {
                    coverBtn.disabled = false;
                    coverBtn.innerHTML = originalHTML;
                }
            });
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        } else if (profileBtn) {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/jpeg,image/jpg,image/png";
            fileInput.style.display = "none";
            fileInput.addEventListener("change", async function (e) {
                const file = e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB'); return; }

                profileBtn.disabled = true;
                const originalHTML = profileBtn.innerHTML;
                profileBtn.innerHTML = `...`;

                try {
                    let data = await postProfilePhoto(file);
                    appState.user.profileUrl = data.profileUrl;
                    let leftImg = document.querySelector("#leftSideProfilePhoto img"); if (leftImg) leftImg.src = data.profileUrl;
                    let img = document.querySelector("#profileContainer img"); if (img) img.src = data.profileUrl;
                    toast.success("Profile updated");
                } catch (err) {
                    toast.error("Failed to upload profile photo!");
                } finally {
                    profileBtn.disabled = false;
                    profileBtn.innerHTML = originalHTML;
                }
            });
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        } else if (profileFollowBtn) {
            try {
                e.target.disabled = true;
                let containerDiv = e.target.closest(".idContainer")
                let userId = containerDiv?.dataset.userId;
                let action = profileFollowBtn.dataset.action
                if (!userId) return;
                await postFollow(userId)
                let btnDiv = containerDiv.querySelector("#profileBtns")
                let isFollowed = action === 'follow';
                btnDiv.innerHTML = ProfileButtons(isFollowed)
                let span = containerDiv.querySelector("#profileFollowers")
                let currentCount = parseInt(span?.dataset?.followers);
                if (isFollowed) {
                    span.innerHTML = `<i class="bi bi-people-fill me-1"></i> ${currentCount + 1} followers`;
                    span.dataset.followers = currentCount + 1
                } else {
                    span.innerHTML = `<i class="bi bi-people-fill me-1"></i> ${currentCount - 1} followers`;
                    span.dataset.followers = currentCount - 1
                }
                invalidateRoute("/home", "/network");
            } catch (err) {
                toast.error("Failed to follow!")
            }
            e.target.disabled = false
        } else if (messageBtn) {
            if (messageBtn) {
                let containerDiv = e.target.closest(".idContainer")
                let userId = containerDiv?.dataset.userId;
                if (userId) {
                    await navigateToConversation(userId);
                }
                return;
            }
        } else if (viewerFollowBtn) {
            e.preventDefault()
            e.stopPropagation()

            if (e.target.classList.contains('processing')) {
                return;
            }
            e.target.classList.add('processing');

            let containerDiv = e.target.closest(".idContainer")
            let userId = containerDiv?.dataset.userId;

            if (!userId) {
                e.target.classList.remove('processing')
                return;
            };
            try {
                await postFollow(userId)
                e.target.textContent = 'Message';
                e.target.classList.remove('viewerFollowBtn');
                e.target.classList.add('message-btn');
                invalidateRoute("/home", "/network");
            } catch (err) {
                if (err.message == 'BLOCKED') {
                    toast.error("User blocked you!")
                    e.target.disabled = true;
                } else {
                    toast.error("Failed to follow!")
                }

            }
            e.target.classList.remove('processing')

        } else if (loadMoreLike) {
            let cursor = appState.likeCursor;
            if (!cursor) return;
            let btn = document.getElementById("load-more-like")
            if (btn) middleBar.removeChild(btn);
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getMoreLikes(cursor, signal)
                for (let post of data.data) {
                    let card = Feed(post.postId, "likeFeed")
                    middleBar.appendChild(card)
                }
                if (data.hasMore) {
                    appState.likeCursor = data.nextCursor;
                    middleBar.appendChild(btn)
                } else {
                    appState.likeCursor = null;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (btn) middleBar.appendChild(btn);
                toast.error("Failed to load more Likes post!")
            } finally {
                if (loadingDiv && loadingDiv.parentNode) middleBar.removeChild(loadingDiv);
            }
        } else if (loadMoreComment) {
            let cursor = appState.commentCursor;
            if (!cursor) return;
            let btn = document.getElementById("load-more-comment")
            if (btn) middleBar.removeChild(btn);
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getMoreComments(cursor, signal)
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
                    middleBar.appendChild(btn)
                } else {
                    appState.commentCursor = null;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (btn) middleBar.appendChild(btn);
                toast.error("Failed to load more Comment post!")
            } finally {
                if (loadingDiv && loadingDiv.parentNode) middleBar.removeChild(loadingDiv);
            }
        } else if (deleteComment) {
            let id = e.target.dataset.activity;
            let container = e.target.closest(".containerId")
            if (!id || !container) return;
            e.target.disabled = true;
            if (confirm("Are you sure to delete comment?")) {
                try {
                    await postDeleteComment(id)
                    middleBar.removeChild(container)
                } catch (err) {
                    toast.error("Failed to delete comment!")
                }
            }
            e.target.disabled = false
        } else if (editComment) {
            let id = editComment.dataset.activity;
            let upperParent = editComment.parentNode.parentNode
            let commentSection = upperParent.querySelector(".commentsContainer")
            let isEditingDiv = upperParent.querySelector(".comment-section")
            if (isEditingDiv) {
                upperParent.removeChild(isEditingDiv)
                return;
            }
            let previousComment = upperParent.querySelector("p.comment-text").textContent;
            let postCommentDiv = document.createElement("div")
            postCommentDiv.classList.add("comment-section")
            postCommentDiv.innerHTML = createPostCommentElement()
            let postInput = postCommentDiv.querySelector("input")
            postInput.value = previousComment;
            let postBtn = postCommentDiv.querySelector("button")
            postBtn.textContent = "Edit";
            postBtn.dataset.mode = "editing";
            postBtn.dataset.id = id;
            commentSection.after(postCommentDiv)
            postInput.focus()
        } else if (dissmisPostsBtn) {
            try {
                e.target.disabled = true;
                await postDismiss()
                dissmisPostsBtn.remove()
                appState.upCursor.mode = "suggested";
                e.target.disabled = false;
            } catch (err) {
                e.target.disabled = false;
                toast.error("Failed to dissmis!")
            }
        } else if (loadMoreMyPosts) {
            let btnDiv = loadMoreMyPosts.parentNode;
            middleBar.removeChild(btnDiv)
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getMyPosts(signal)
                if (data.posts.length > 0) {
                    for (let post of data.posts) {
                        post.userId = appState.user;
                        let card = Feed(post, "userFeed")
                        middleBar.appendChild(card)
                    }
                }
                if (data.hasMore) {
                    middleBar.appendChild(btnDiv)
                    appState.myPostsCursor.createdAt = data.posts[data.posts.length - 1].createdAt;
                    appState.myPostsCursor.postId = data.posts[data.posts.length - 1]._id;
                } else {
                    appState.myPostsCursor.createdAt = null;
                    appState.myPostsCursor.postId = null;
                }
            } catch (err) {
                if (err.name == "AbortError") return;
                toast.error("Failed to load more posts!")
                middleBar.appendChild(btnDiv)
            } finally {
                loadingDiv.remove()
            }
        } else if (openSearchBtn) {
            openSearchPeopleModal();

        } else if (searchCloseBtn || searchOverlay) {
            closeSearchPeopleModal();

        } else if (searchLoadMoreBtn) {
            handleSearchLoadMore(searchLoadMoreBtn);

        } else if (loadMorePeople) {
            loadMorePeople.remove();
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getUsers(signal)
                let peopleContainer = middleBar.querySelector(".peopleTotalContainer")
                data.users.forEach(el => {
                    peopleContainer.appendChild(Peoplecard(el))
                })
                if (data.hasMore) {
                    appState.peopleCursor.createdAt = data.users[data.users.length - 1].createdAt;
                    appState.peopleCursor._id = data.users[data.users.length - 1]._id;
                    middleBar.appendChild(moreButton("people"))
                } else {
                    appState.peopleCursor.createdAt = null;
                    appState.peopleCursor._id = null;
                }
            } catch (err) {
                if (err.name == "AbortError") return;
                toast.error("Failed to load more users!")
                middleBar.appendChild(moreButton("people"))
            } finally {
                loadingDiv?.remove()
            }

        } else if (loadMorePeoplePosts) {
            loadMorePeoplePosts.remove()
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let userPosts = await getUserPosts(signal)
                for (let post of userPosts.posts) {
                    post.userId = appState.userPostsCursor.userId;
                    let card = Feed(post, "NoButtonFeed")
                    middleBar.appendChild(card)
                }
                if (userPosts.hasMore) {
                    appState.userPostsCursor.createdAt = userPosts.posts[userPosts.posts.length - 1].createdAt;
                    appState.userPostsCursor.postId = userPosts.posts[userPosts.posts.length - 1]._id;
                    let btn = moreButton("peoplePosts")
                    btn.style.marginTop = "0px";
                    middleBar.appendChild(btn)
                } else {
                    appState.userPostsCursor.createdAt = null;
                    appState.userPostsCursor.postId = null;
                    appState.userPostsCursor.userId = null;
                }
            } catch (err) {
                if (err.name == "AbortError") return;
                toast.error("Failed loading more user's posts!")
                middleBar.appendChild(loadMorePeoplePosts)
            } finally {
                loadingDiv.remove()
            }
        } else if (loadMoreFollowing) {
            let lastId = e.target.dataset.lastId;
            if (!lastId) return;
            loadMoreFollowing.remove();
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getFollowing(lastId, signal)
                if (data.following?.length > 0) {
                    data.following.forEach(el => {
                        let containerDiv = document.createElement("div")
                        containerDiv.classList.add("container", "mt-4", "followingCards")
                        containerDiv.dataset.userId = el._id;
                        containerDiv.innerHTML = Followerfollowing(el, "following")
                        middleBar.appendChild(containerDiv)
                    })
                }
                if (data.hasMore) middleBar.appendChild(newLoadMoreBtn(data.lastId, 'following'))
            } catch (err) {
                if (err.name == "AbortError") return;
                toast.error("Failed to load Followings!")
                middleBar.appendChild(loadMoreFollowing)
            } finally {
                loadingDiv.remove();
            }
        } else if (loadMoreFollower) {
            let lastId = e.target.dataset.lastId;
            if (!lastId) return;
            loadMoreFollower.remove();
            let loadingDiv = document.createElement("div")
            loadingDiv.innerHTML = Showloader()
            middleBar.appendChild(loadingDiv)
            try {
                let data = await getFollower(lastId, signal)
                if (data.followers.length > 0) {
                    data.followers.forEach(el => {
                        let containerDiv = document.createElement("div")
                        containerDiv.classList.add("container", "mt-4", "followingCards")
                        containerDiv.dataset.userId = el._id;
                        containerDiv.innerHTML = Followerfollowing(el, "follower")
                        middleBar.appendChild(containerDiv)
                    })
                    if (data.hasMore) middleBar.appendChild(newLoadMoreBtn(data.lastId, 'follower'));
                }
            } catch (err) {
                if (err.name == "AbortError") return;
                middleBar.appendChild(loadMoreFollower)
                toast.error("Failed to load Followers!")
            } finally {
                loadingDiv.remove();
            }
        } else if (personalInfoForm) {
            try {
                e.target.disabled = true;
                e.target.style.backgroundColor = "gray";
                let form = e.target.closest("form")
                if (!form.checkValidity()) {
                    form.reportValidity()
                    e.target.disabled = false;
                    e.target.style.backgroundColor = '#0d6efd';
                    return;
                }
                let formData = new FormData(form)
                let data = Object.fromEntries(formData.entries())
                if (data.gender == "other" && data.otherGender) {
                    data.gender = data.otherGender
                }
                delete data.otherGender;
                try {
                    let result = await putupdatePersonalInformation(data)
                    appState.user = result;
                    document.querySelector("#leftSideProfilePhoto h6").textContent = result.name;
                    document.querySelector("#leftSideProfilePhoto p").textContent = result.job;
                    history.pushState(null, '', '/settings')
                    router()
                } catch (err) {
                    toast.error("Failed to update!")
                    e.target.disabled = false;
                    e.target.style.backgroundColor = '#0d6efd';
                }
            } catch (err) {
                e.target.disabled = false;
                e.target.style.backgroundColor = '#0d6efd';
                console.log(err)
            }


        } else if (removeCoverPhoto) {
            try {
                e.target.disabled = true;
                let url = appState.user.coverUrl
                if (url.includes("default-cover.webp") || url == null) {
                    throw new Error("No cover photo to remove")
                }
                let result = await postRemoveCoverPhoto();
                if (result.coverUrl) {
                    appState.user.coverUrl = result.coverUrl;
                    let img = middleBar.querySelector(".coverDiv img")
                    if (img) img.src = result.coverUrl;
                    img = document.querySelector("#leftSideCoverPhoto img")
                    if (img) img.src = result.coverUrl;
                }
            } catch (err) {
                let coverDiv = middleBar.querySelector(".coverDiv");
                coverDiv.querySelector(".text-danger")?.remove();
                let errorDiv = document.createElement("div")
                errorDiv.classList.add("text-danger", "small", "text-center", "mt-2")
                errorDiv.textContent = err.message || 'Failed to remove';
                coverDiv.appendChild(errorDiv)
            } finally {
                e.target.disabled = false;
            }
        } else if (removeProfilePhoto) {
            try {
                e.target.disabled = true;
                let url = appState.user.profileUrl
                if (url.includes('default-profile.png') || url == null) {
                    throw new Error("No Profile photo to remove")
                }
                let result = await postRemoveProfilePhoto();
                if (result.profileUrl) {
                    appState.user.profileUrl = result.profileUrl;
                    let img = middleBar.querySelector(".profileDiv img")
                    if (img) img.src = result.profileUrl;
                    img = document.querySelector("#leftSideProfilePhoto img")
                    if (img) img.src = result.profileUrl;
                }
            } catch (err) {
                let profileDiv = middleBar.querySelector(".profileDiv");
                profileDiv.querySelector(".text-danger")?.remove();
                let errorDiv = document.createElement("div")
                errorDiv.classList.add("text-danger", "small", "text-center", "mt-2")
                errorDiv.textContent = err.message || 'Failed to remove';
                profileDiv.appendChild(errorDiv)
            } finally {
                e.target.disabled = false;
            }

        } else if (loadMoreBlockUsers) {
            let mainDiv = middleBar.querySelector(".blockMainContainer")
            let lastId = loadMoreBlockUsers.dataset.lastId;
            let blockContainer = middleBar.querySelector(".blockContainer")

            let loadingDiv = document.createElement("div");
            loadingDiv.innerHTML = Showloader();
            middleBar.querySelector(".text-danger")?.remove();
            if (!lastId || !blockContainer || !mainDiv) return;

            try {
                e.target.disabled = true;
                middleBar.appendChild(loadingDiv)
                let data = await getBlockedPeople(lastId, signal)
                for (let user of data.users) {
                    blockContainer.appendChild(BlockedUser(user))
                }
                loadMoreBlockUsers.remove()
                if (data.hasMore && data.nextCursor) {
                    loadMoreBlockUsers.dataset.lastId = data.nextCursor;
                    mainDiv.appendChild(loadMoreBlockUsers)
                }
            } catch (err) {
                if (err.name == "AbortError") return;
                toast.error("Failed loading more blocked users!")
            } finally {
                e.target.disabled = false;
                if (loadingDiv) loadingDiv.remove();
            }

        } else if (unblockBtn) {
            try {
                let containerDiv = e.target.closest(".people-card");
                let totalSpan = middleBar.querySelector("#totalBlocked")
                let totalBlocked = parseInt(totalSpan.dataset.count);
                let blockId = e.target.dataset.blockId;
                if (!blockId) return;
                e.target.disabled = true;
                await postUnblock(blockId)
                totalSpan.dataset.count = totalBlocked - 1;
                totalSpan.textContent = `· ${totalBlocked - 1}`;
                containerDiv.remove();
                if ((totalBlocked - 1) === 0) {
                    middleBar.innerHTML = "";
                    middleBar.appendChild(NoBlock())
                }
                invalidateAll();
            } catch (err) {
                toast.error("Failed to unblock user!")
            } finally {
                e.target.disabled = false;
            }
        } else if (peopleCard) {
            const navigateUrl = peopleCard.dataset.navigate;
            if (navigateUrl) {
                e.preventDefault();
                history.pushState(null, '', navigateUrl);
                router();
            }

        } else if (submitPassword) {
            try {
                e.target.disabled = true;
                e.target.style.backgroundColor = "gray";
                let form = e.target.closest("form");
                if (!form) throw new Error("Where is the form !!!");
                if (!form.checkValidity()) {
                    form.reportValidity()
                    e.target.disabled = false;
                    e.target.style.backgroundColor = "#0d6efd";
                    return;
                }
                ['#currentPasswordError', '#newPasswordError', '#confirmNewPasswordError'].forEach(id => {
                    let div = form.querySelector(id);
                    if (div) div.style.display = 'none';
                });
                let formData = new FormData(form)
                let values = Object.fromEntries(formData);
                if (values?.newPassword == values?.currentPassword) {
                    let div = form.querySelector("#newPasswordError")
                    div.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> New Password is the same as Current Password!`;
                    div.style.display = 'block';
                    return;
                }
                if (values?.newPassword !== values?.confirmNewPassword) {
                    let div = form.querySelector("#confirmNewPasswordError")
                    div.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> Confirm Password does not match New Password!`;
                    div.style.display = 'block';
                    return;
                }
                await postChangePassword(values.currentPassword, values.newPassword)
                history.pushState(null, '', '/settings')
                router();
            } catch (err) {
                let div = document.querySelector("#confirmNewPasswordError")
                if (div) {
                    div.textContent = err.message;
                    div.style.display = 'block';
                }
            } finally {
                e.target.disabled = false;
                e.target.style.backgroundColor = "#0d6efd";
            }
        } else if (submitEmail) {
            try {
                e.target.disabled = true;
                e.target.style.backgroundColor = "gray";
                let form = e.target.closest("form");
                if (!form) throw new Error("Where is the form !!!");
                if (!form.checkValidity()) {
                    form.reportValidity()
                    e.target.disabled = false;
                    e.target.style.backgroundColor = "#0d6efd";
                    return;
                }
                let formData = new FormData(form)
                let values = Object.fromEntries(formData);
                if (values.newEmail == appState.user.email) {
                    let errDiv = form.querySelector("#newEmailError")
                    errDiv.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> New Email is the same as Current Email!`;
                    errDiv.style.display = 'block';
                    return;
                }
                ['#currentPasswordError', '#newEmailError'].forEach(id => {
                    let div = form.querySelector(id);
                    if (div) div.style.display = 'none';
                });
                let data = await postChangeEmail(values.currentPassword, values.newEmail)
                appState.user.email = data.newEmail;
                history.pushState(null, '', '/settings')
                router()
            } catch (err) {
                if (err.message == "Wrong Password") {
                    let div = document.querySelector("#currentPasswordError")
                    if (div) {
                        div.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> Wrong Password!`;
                        div.style.display = 'block';
                        div.classList.remove('text-center');
                    }
                } else {
                    let div = document.querySelector("#newEmailError")
                    if (div) {
                        div.textContent = err.message;
                        div.style.display = 'block';
                    }
                }
            } finally {
                e.target.disabled = false;
                e.target.style.backgroundColor = "#0d6efd";
            }
        } else if (cancelLogoutBtn) {
            e.preventDefault();
            const modalEl = document.getElementById('logoutModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            history.pushState(null, '', '/settings/account')
            router()
        } else if (logoutBtn) {
            e.preventDefault();
            try {
                await postLogout()
                invalidateAll();
            } catch (err) {
                toast.error("Failed to logout!")
            } finally {
                tokenManager.clear()
                disconnectSocket()
                cleanupGlobalSocketHandlers();
                window.location.href = "/hero"
            }
        } else if (AccountDeleteBtn) {
            e.preventDefault()
            const modalElement = document.getElementById('deleteAccountModal')
            const modal = new bootstrap.Modal(modalElement)
            modal.show()

            // Reset form state when modal opens
            document.getElementById('deletePassword').value = ''
            document.getElementById('deleteConfirmation').value = ''
            document.getElementById('deleteError').classList.add('d-none')
            document.getElementById('confirmDeleteBtn').disabled = false
            document.getElementById('confirmDeleteBtn').innerHTML = 'Delete Account'

            // Autofocus on password field after modal is fully shown
            modalElement.addEventListener('shown.bs.modal', () => {
                document.getElementById('deletePassword').focus()
            }, { once: true })
            return
        } else if (AccountConfirmDeleteBtn) {
            const password = document.getElementById('deletePassword').value
            const confirmation = document.getElementById('deleteConfirmation').value
            const errorDiv = document.getElementById('deleteError')
            const confirmBtnElement = document.getElementById('confirmDeleteBtn')
            const cancelBtn = document.querySelector('#deleteAccountModal .modal-footer .btn-light')
            const closeBtn = document.querySelector('#deleteAccountModal .btn-close')

            // Clear previous errors
            errorDiv.classList.add('d-none')

            // Validate inputs
            if (!password) {
                errorDiv.textContent = 'Please enter your password'
                errorDiv.classList.remove('d-none')
                document.getElementById('deletePassword').focus()
                return
            }

            if (password.trim().length < 8) {
                errorDiv.textContent = 'Password length is less than 8'
                errorDiv.classList.remove('d-none')
                document.getElementById('deletePassword').focus()
                return
            }

            if (confirmation !== 'DELETE') {
                errorDiv.textContent = 'Please type DELETE to confirm'
                errorDiv.classList.remove('d-none')
                document.getElementById('deleteConfirmation').focus()
                return
            }

            // Disable all buttons and inputs to prevent interference
            confirmBtnElement.disabled = true
            confirmBtnElement.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Deleting...'

            if (cancelBtn) {
                cancelBtn.disabled = true
                cancelBtn.style.opacity = '0.5'
                cancelBtn.style.pointerEvents = 'none'
            }

            if (closeBtn) {
                closeBtn.disabled = true
                closeBtn.style.opacity = '0.5'
                closeBtn.style.pointerEvents = 'none'
            }

            // Disable form inputs
            document.getElementById('deletePassword').disabled = true
            document.getElementById('deleteConfirmation').disabled = true

            // Prevent closing modal by clicking outside or pressing ESC
            const modalElement = document.getElementById('deleteAccountModal')
            const modal = bootstrap.Modal.getInstance(modalElement)
            modal._config.backdrop = 'static'
            modal._config.keyboard = false

            try {
                await deleteAccount(password, confirmation)

                // Success - redirect to hero
                window.location.href = '/hero'

            } catch (err) {
                // Show error
                toast.error("Failed to delete account!")

                // Reset all buttons and inputs
                confirmBtnElement.disabled = false
                confirmBtnElement.innerHTML = 'Delete Account'

                if (cancelBtn) {
                    cancelBtn.disabled = false
                    cancelBtn.style.opacity = '1'
                    cancelBtn.style.pointerEvents = 'auto'
                }

                if (closeBtn) {
                    closeBtn.disabled = false
                    closeBtn.style.opacity = '1'
                    closeBtn.style.pointerEvents = 'auto'
                }

                document.getElementById('deletePassword').disabled = false
                document.getElementById('deleteConfirmation').disabled = false

                // Restore modal closing behavior
                modal._config.backdrop = true
                modal._config.keyboard = true

                document.getElementById('deletePassword').focus()
            }
        } else {
            return;
        }

    })
}
