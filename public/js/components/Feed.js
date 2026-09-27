import { requestSignedUrl, refreshExpiredUrl } from "../api.js";
const FEED_CONFIG = {
    generalFeed: {
        showFollowBtn: true,
        showActions: false,
        showLikeComment: true,
        showCommentSection: true
    },
    userFeed: {
        showFollowBtn: false,
        showActions: true,
        showLikeComment: true,
        showCommentSection: true
    },
    NoButtonFeed: {
        showFollowBtn: false,
        showActions: false,
        showLikeComment: true,
        showCommentSection: true
    },
    commentFeed: {
        showFollowBtn: false,
        showActions: false,
        showLikeComment: false,
        showCommentSection: true
    },
    likeFeed: {
        showFollowBtn: false,
        showActions: false,
        showLikeComment: true,
        showCommentSection: true
    }
};

export function Feed(post, type, comment = null) {
    const config = FEED_CONFIG[type];
    if (!config) {
        console.error(`Invalid feed type: ${type}`);
        return createEmptyFeed();
    }

    const container = document.createElement('div');
    container.dataset.postId = post._id;
    container.classList.add('col-12', 'containerId');

    const card = document.createElement('div');
    card.classList.add('card', 'modern-feed-card');

    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'modern-card-body');

    const profileHeader = createModernProfileHeader(post, config);
    cardBody.appendChild(profileHeader);

    const captionContainer = createModernCaptionElement(post.caption);
    cardBody.appendChild(captionContainer);

    // ← CHANGED: Check mediaUrl instead of imageUrl
    if (post.mediaUrl) {
        const mediaContainer = createMediaContainer(post.mediaUrl, post.mediaType);
        cardBody.appendChild(mediaContainer);
    }

    if (config.showLikeComment) {
        const stats = createStatsElement(post);
        cardBody.appendChild(stats);
    }

    if (config.showLikeComment) {
        const actions = createActionButtons(post);
        cardBody.appendChild(actions);
    }

    const likesViewContainer = document.createElement('div');
    likesViewContainer.classList.add(`likes-view-${post._id}`, "d-none", "likes-container");
    cardBody.appendChild(likesViewContainer);

    const commentSection = createCommentSection(type, comment, config);
    cardBody.appendChild(commentSection);

    card.appendChild(cardBody);
    container.appendChild(card);

    return container;
}

function createModernProfileHeader(post, config) {
    const profileHeader = document.createElement("div");
    profileHeader.classList.add('modern-profile-header');

    const profileContent = document.createElement("div");
    profileContent.classList.add('modern-profile-content');

    const avatarContainer = document.createElement("div");
    avatarContainer.classList.add('modern-avatar-container');

    const img = document.createElement("img");
    img.src = post.userId.profileUrl;
    img.classList.add("modern-avatar");
    img.alt = `${post.userId.name}'s profile picture`;
    img.onerror = () => img.style.display = 'none';

    const userInfo = document.createElement("div");
    userInfo.classList.add('modern-user-info');

    const name = document.createElement("h6");
    name.classList.add("modern-user-name", "text-truncate");
    name.textContent = post.userId.name;

    const job = document.createElement("p");
    job.classList.add("modern-user-job", "text-truncate");
    job.textContent = post.userId.job;

    avatarContainer.appendChild(img);
    userInfo.appendChild(name);
    userInfo.appendChild(job);
    profileContent.appendChild(avatarContainer);
    profileContent.appendChild(userInfo);
    profileHeader.appendChild(profileContent);

    // Modern Action Buttons
    if (config.showFollowBtn) {
        const followBtn = document.createElement("button");
        followBtn.classList.add("modern-follow-btn");
        followBtn.dataset.userId = post.userId._id;

        if (post.isFollowing) {
            followBtn.classList.add("following");
            followBtn.innerHTML = `
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
                Following
            `;
        } else {
            followBtn.innerHTML = `
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Follow
            `;
        }
        profileHeader.appendChild(followBtn);
    }

    if (config.showActions) {
        const actionsContainer = document.createElement("div");
        actionsContainer.classList.add("modern-actions-container");

        actionsContainer.innerHTML = `
        <div class="dropdown">
            <button class="btn modern-action-btn" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    aria-label="Post options">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
            </button>
            <ul class="dropdown-menu dropdown-menu-end modern-dropdown">
                <li>
                    <a class="dropdown-item modern-dropdown-item edit-action" href="#" data-post-id="${post._id}">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                        </svg>
                        Edit Post
                    </a>
                </li>
                <li>
                    <a class="dropdown-item modern-dropdown-item delete-action text-danger" href="#" data-post-id="${post._id}">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                        Delete Post
                    </a>
                </li>
            </ul>
        </div>
        `;
        profileHeader.appendChild(actionsContainer);
    }

    return profileHeader;
}

function createMediaContainer(mediaUrl, mediaType) {
    const mediaWrapper = document.createElement("div");
    mediaWrapper.classList.add('modern-media-wrapper');
    const isVideo = mediaType === 'video' || mediaUrl.includes('/video/') || mediaUrl.includes('.mp4');
    if (isVideo) {
        mediaWrapper.appendChild(createModernVideo(mediaUrl));
    } else {
        const img = document.createElement("img");
        img.src = mediaUrl;
        img.className = "modern-post-image";
        img.loading = "lazy";
        img.onerror = function () { this.closest('.modern-media-wrapper')?.remove(); };
        mediaWrapper.appendChild(img);
    }
    return mediaWrapper;
}

function createModernVideo(mediaUrl) {
    const container = document.createElement("div");
    container.className = "modern-video-container";

    const video = document.createElement("video");
    video.className = "modern-video";
    video.controls = true;
    video.preload = "metadata"; // modern: only ~50KB when visible, full only on play
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.dataset.src = mediaUrl;

    let loaded = false;
    const load = () => {
        if (!loaded) {
            video.src = video.dataset.src;
            video.load();
            loaded = true;
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) load();
            else if (!video.paused) video.pause();
        });
    }, { threshold: 0.1, rootMargin: '200px' });

    observer.observe(container);
    video.addEventListener('error', () => showVideoError(container));

    container.appendChild(video);
    return container;
}

function createModernCaptionElement(caption) {
    if (!caption) return document.createElement('div');

    const container = document.createElement("div");
    container.classList.add('modern-caption-container');

    const lines = caption?.split('\n');
    const totalLineBreaks = lines.length - 1;
    const exceedsCharLimit = caption.length > 120;
    const exceedsLineBreakLimit = totalLineBreaks > 2;

    if (!exceedsCharLimit && !exceedsLineBreakLimit) {
        const fullCaption = document.createElement("div");
        fullCaption.classList.add('modern-caption-text');
        fullCaption.textContent = caption;
        container.appendChild(fullCaption);
        return container;
    }

    const textWrapper = document.createElement("div");
    textWrapper.classList.add('modern-caption-wrapper');

    const shortTextSpan = document.createElement("span");
    shortTextSpan.classList.add('modern-caption-text', 'short-caption');

    if (exceedsLineBreakLimit) {
        const firstTwoLines = lines.slice(0, 2).join('\n');
        shortTextSpan.textContent = firstTwoLines + ' ';
    }
    else if (exceedsCharLimit) {
        let truncated = caption.substring(0, 120);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 0) {
            truncated = truncated.substring(0, lastSpace);
        }
        shortTextSpan.textContent = truncated + ' ';
    }

    const moreButton = document.createElement("button");
    moreButton.classList.add('modern-expand-btn', 'moreButton');
    moreButton.innerHTML = `
        <span>more</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="ms-1">
            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
    `;

    textWrapper.appendChild(shortTextSpan);
    textWrapper.appendChild(moreButton);
    container.appendChild(textWrapper);

    const fullCaptionDiv = document.createElement("div");
    fullCaptionDiv.classList.add('modern-caption-text', 'full-caption', 'd-none');
    fullCaptionDiv.textContent = caption;

    const lessButton = document.createElement("button");
    lessButton.classList.add('modern-expand-btn', 'd-none', 'lessButton');
    lessButton.innerHTML = `
        <span>less</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="ms-1">
            <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
        </svg>
    `;

    container.appendChild(fullCaptionDiv);
    container.appendChild(lessButton);

    moreButton.addEventListener('click', function (e) {
        e.preventDefault();
        textWrapper.classList.add('d-none');
        fullCaptionDiv.classList.remove('d-none');
        lessButton.classList.remove('d-none');
    });

    lessButton.addEventListener('click', function (e) {
        e.preventDefault();
        textWrapper.classList.remove('d-none');
        fullCaptionDiv.classList.add('d-none');
        lessButton.classList.add('d-none');
    });

    return container;
}

function showVideoError(container) {
    container.innerHTML = `
        <div class="video-error">
            <svg width="48" height="48" fill="currentColor" viewBox="0 0 16 16" class="text-muted">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
            <p class="text-muted small mt-2 mb-0">Video unavailable</p>
        </div>
    `;
}

function createStatsElement(post) {
    const stats = document.createElement('div');
    stats.classList.add('modern-stats');
    stats.innerHTML = `
        <span class="like-count">${post.likes}</span> Likes ·
        <span class="comment-count">${post.comments}</span> Comments
    `;
    return stats;
}

function createActionButtons(post) {
    const actions = document.createElement('div');
    actions.classList.add('d-flex', 'justify-content-center', 'gap-3', 'border-top', 'pt-2');

    const likeBtnDiv = document.createElement("div");
    likeBtnDiv.classList.add("d-flex");
    likeBtnDiv.innerHTML = `
        <button class="btn btn-light views-btn px-1 py-0 border-end-0 rounded-end-0" data-post-id="${post._id}">
            <img src="icons/dropdown.svg" width="12" height="12" alt="View likes">
        </button>
        <button class="btn btn-light like-btn px-3 py-1 rounded-start-0 like-small ${post.userLiked ? 'liked' : ''}" data-post-id="${post._id}">
            <img src='icons/${post.userLiked ? 'like-filled.svg' : 'like.svg'}' class='like-icon pb-1' width="14" height="14"> Like
        </button>
    `;

    const commentBtn = document.createElement("button");
    commentBtn.classList.add('btn', 'btn-light', 'comment-toggle', 'px-3', 'py-1', 'comment-small');
    commentBtn.innerHTML = `
        <img src="icons/comment.svg" width="14" height="14" class="pb-1 me-1" alt="Comment">
        Comment
    `;

    actions.appendChild(likeBtnDiv);
    actions.appendChild(commentBtn);

    return actions;
}
export function LikeItem(like) {
    const likeElement = document.createElement('div');
    likeElement.className = 'like-item';

    likeElement.innerHTML = `
        <div class="like-avatar-wrapper">
            <img src="${like.userId?.profileUrl || '/profiles/default-profile.png'}" 
                 alt="${like.userId?.name || 'FB User'}"
                 class="like-avatar" >
            <div class="like-badge">
                <img src="icons/like-filled.svg" width="12" height="12" alt="Like">
            </div>
        </div>
        <span class="like-name">${like.userId?.name?.split(' ')[0] || 'User'}</span>
    `;

    return likeElement;
}

export function Nomessage() {
    return `
    <div class="no-comments-state d-flex flex-column justify-content-center align-items-center text-center h-100" id="noComment">
    <div class="icon mb-2">
        💬
    </div>
    <h6 class="mb-1 fw-semibold text-secondary">No comments yet</h6>
    <p class="text-muted small mb-0">
        Be the first to share your thoughts.
    </p>
    </div>
    `
}
export function Comment(comment) {
    const commentDiv = document.createElement('div')
    commentDiv.classList.add('comment-item', 'mb-2', 'pb-2', 'border-bottom', 'border-light')
    commentDiv.innerHTML = `
        <div class="d-flex align-items-start gap-2 comment-wrapper">
            <div class="flex-shrink-0">
                <img src="${comment.userId.profileUrl}" 
                     class="rounded-circle comment-profile" 
                     width="62" height="62" 
                     alt="${comment.userId.name}'s profile"
                     onerror="this.src='profiles/default-profile.png'">
            </div>
            <div class="flex-grow-1 bg-light rounded-2 px-3 py-2 comment-body">
                <div class="mb-1">
                    <h6 class="mb-0 fw-semibold text-dark comment-name">${comment.userId.name}</h6>
                    <p class="mb-0 text-muted comment-job">${comment.userId.job}</p>
                </div>
                <p class="mb-0 text-dark comment-text">${comment.comment}</p>
            </div>
        </div>
    `
    return commentDiv
}


export function createPostCommentElement() {
    return `
        <div class="d-flex align-items-center gap-2 w-100">
            <input type="text" 
                   class="form-control form-control-sm border-0 bg-light" 
                   placeholder="Write a comment..." 
                   style="font-size: 0.8rem; height: 32px; flex: 1;">
            <button class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold modern-post-btn postComment" 
                    style="height: 32px; font-size: 0.8rem; flex-shrink: 0;">
                Post
            </button>
        </div>
    `;
}

function createCommentSection(type, comment, config) {
    if (!config.showCommentSection) return document.createElement('div');

    let commentSection;

    if (type === "commentFeed") {
        commentSection = document.createElement('div');
        commentSection.classList.add('modern-comment-section', 'mt-3', 'pt-2');
        commentSection.innerHTML = `
        <div class="modern-comments-container commentsContainer bg-white rounded-3 border p-2 mb-2 shadow-sm" 
             style="height: 120px; overflow-y: auto;"></div>
        <div class="d-flex gap-2 justify-content-center modern-comment-actions mt-3">
            <button class="btn btn-outline-primary btn-sm rounded-pill px-3 modern-edit-btn editCommentBtn" 
                    data-activity="${comment._id}" style="height: 32px; font-size: 0.8rem;">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                </svg>
                Edit Comment
            </button>
            <button class="btn btn-outline-danger btn-sm rounded-pill px-3 modern-delete-btn deleteCommentBtn" 
                    data-activity="${comment._id}" style="height: 32px; font-size: 0.8rem;">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                </svg>
                Delete Comment
            </button>
        </div>
        `;
        commentSection.querySelector(".commentsContainer").appendChild(Comment(comment));
    } else {
        commentSection = document.createElement('div');
        commentSection.classList.add('modern-comment-section', 'd-none', 'commentsDiv', 'mt-3', 'pt-2');
        commentSection.innerHTML = `
        <div class="modern-comments-container commentsContainer bg-white rounded-3 border p-2 mb-2 shadow-sm" 
             style="height: 150px; overflow-y: auto;"></div>
        <div class="comment-section">${createPostCommentElement()}</div>
        `;
    }

    return commentSection;
}

function createEmptyFeed() {
    return document.createElement('div');
}

export function moreButton(type) {
    const div = document.createElement("div");
    div.id = `load-more-${type}`;
    div.classList.add("d-flex", "justify-content-center", "mt-3");

    const button = document.createElement("button");
    button.type = "button";
    button.classList.add(
        "btn", "btn-light",
        "w-50", "rounded-pill", "py-2",
        "fw-semibold",
        "shadow-sm", "border",
        // Generic class
        "load-more-btn",
        `load-more-${type}`
    );
    button.innerHTML = `<i class="bi bi-arrow-down me-2"></i>Load more`;
    div.appendChild(button);
    return div;
}

export function DissmissBtn() {
    const button = document.createElement("button");
    button.id = "dismissBtn";
    button.type = "button";
    button.title = "Dismiss new following posts and continue scrolling";
    button.classList.add(
        "d-flex", "align-items-center", "gap-2",
        "mx-auto", "mb-1",
        "btn", "btn-light",
        "border", "rounded-pill",
        "px-3", "py-1",
        "dismiss-new-posts",
        "shadow-sm"
    );
    button.style.marginTop = "-1rem";
    button.innerHTML = `
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="text-secondary">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
        </svg>
        <span class="text-secondary small fw-semibold">Dismiss new Following posts</span>
    `;

    return button;
}

export function NoPost() {
    return `
    <div class="w-100 py-1">
    <div class="text-center py-2 bg-light bg-opacity-100 rounded-4 border">
        <i class="bi bi-journal-x me-2 text-secondary"></i>
        <span class="text-secondary small fw-light text-dark">No posts yet</span>
    </div>
    </div>    
`
}



const indicatorConfig = {
    following: {
        id: 'topIndicator',
        classes: 'card shadow-sm mb-3 border-0 bg-white',
        icon: `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-primary">
                <path d="M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M6.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M13 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M3 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
               </svg>`,
        title: 'New Following Posts',
        subtitle: 'Pull down to refresh your feed',
        type: 'card',
        theme: 'primary'
    },
    suggested: {
        id: 'topIndicator',
        classes: 'card shadow-sm mb-3 border-0 bg-white',
        icon: `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-warning">
                <path d="M8 16a6 6 0 0 0 6-6c0-1.479-2.5-3.5-6-3.5S2 8.521 2 10a6 6 0 0 0 6 6zM4 10a2 2 0 1 1 3.321 1.5H6a3 3 0 0 0 2 2.816V16a6.002 6.002 0 0 1-4-6zm3.201-3.018a3 3 0 0 1 1.598 0A6 6 0 0 1 12 10c0 .91-.204 1.775-.567 2.551A2.008 2.008 0 0 0 10 12.5H9.5a1 1 0 0 1 0-2h1.833c.11-.313.167-.65.167-1a4 4 0 0 0-4.833-3.918z"/>
                <path d="M8.5 1a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0V1z"/>
                <path d="M12.5 4.5a.5.5 0 0 1-.146.354L11.707 5.5a.5.5 0 1 1-.708-.708l.647-.646a.5.5 0 0 1 .854.354z"/>
               </svg>`,
        title: 'Suggested for You',
        subtitle: 'Pull down to refresh your feed',
        type: 'card',
        theme: 'warning'
    },
    topEnd: {
        id: 'topIndicator',
        classes: 'card shadow-sm mb-3 border-0 bg-white',
        icon: `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="text-secondary">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
               </svg>`,
        title: 'No more new posts, scroll down!',
        subtitle: null,
        type: 'card',
        theme: 'secondary'
    },
    oldFollowing: {
        id: 'downIndicator',
        classes: 'd-flex align-items-center my-4',
        icon: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="text-secondary">
                <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
               </svg>`,
        title: 'Older posts from people you follow',
        subtitle: null,
        type: 'divider'
    },
    downCaught: {
        id: 'downIndicator',
        classes: 'd-flex align-items-center my-4',
        icon: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="text-success">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
               </svg>`,
        title: 'You are all caught up!',
        subtitle: 'Suggested posts below',
        type: 'divider'
    }
};

export function getIndicator(type) {
    const config = indicatorConfig[type];

    if (!config) {
        console.warn(`Unknown indicator type: ${type}`);
        return document.createElement('div');
    }

    const element = document.createElement('div');
    element.id = config.id;
    element.className = config.classes;

    if (config.type === 'card') {
        element.innerHTML = createCardIndicator(config);
    } else if (config.type === 'divider') {
        element.innerHTML = createDividerIndicator(config);
    }

    return element;
}

function createCardIndicator(config) {
    return `
        <div class="card-body slim-indicator p-2">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <span class="me-2">${config.icon}</span>
                    <span class="text-dark fw-semibold small">${config.title}</span>
                </div>
                ${config.subtitle ? `
                    <div class="d-none d-sm-flex align-items-center text-muted small">
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1 refresh-icon">
                            <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                        </svg>
                        <span style="font-size: 0.75rem;">${config.subtitle}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createDividerIndicator(config) {
    return `
        <div class="flex-grow-1 border-top opacity-25"></div>
        <div class="px-3">
            <span class="badge bg-white text-dark border shadow-sm d-flex align-items-center px-3 py-2 rounded-pill">
                <span class="me-2">${config.icon}</span>
                <span class="fw-normal small">${config.title}</span>
                ${config.subtitle ? `
                    <span class="text-muted ms-2 d-none d-sm-inline" style="font-size: 0.7rem;">
                        • ${config.subtitle}
                    </span>
                ` : ''}
            </span>
        </div>
        <div class="flex-grow-1 border-top opacity-25"></div>
    `;
}