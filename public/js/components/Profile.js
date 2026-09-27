export function Profile(user) {
    return `
        <div class="px-0 py-2 idContainer" data-user-id="${user._id}">
            <!-- Profile Card -->
            <div class="card border-0 shadow-lg rounded-4 overflow-hidden modern-profile-card">
                
                <!-- Cover Photo -->
                <div class="position-relative profile-cover-container" id="coverContainer">
                    <img src="${user.coverUrl}" 
                         class="w-100 h-100 object-fit-cover" 
                         style="height: 200px;"
                         alt="Cover photo"
                         onerror="this.style.background='var(--gradient-primary)'; this.src='';">
                </div>
                
                <!-- Profile Content -->
                <div class="px-4 pb-4 pt-3">
                    <div class="d-flex flex-column flex-md-row align-items-start gap-4">
                        
                        <!-- Profile Photo -->
                        <div class="position-relative profile-photo-wrapper" id="profileContainer">
                            <div class="profile-photo-border">
                                <img src="${user.profileUrl}" 
                                     class="profile-photo" 
                                     alt="${user.name}'s profile"
                                     onerror="this.src='profiles/default-profile.png'">
                            </div>
                        </div>
                        
                        <!-- User Info -->
                        <div class="flex-grow-1 profile-info">
                            <h1 class="profile-name text-truncate">${user.name}</h1>
                            <p class="profile-job text-truncate">${user.job}</p>
                            
                            <!-- Location & Stats -->
                            <div class="d-flex flex-wrap gap-3 mb-3 profile-meta">
                                <div class="d-flex align-items-center gap-1 text-muted">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                                    </svg>
                                    <span>${user.city}, ${user.country}</span>
                                </div>
                                
                                <div class="d-flex align-items-center gap-1 text-muted" id="profileFollowers" data-followers="${user.followerCount}">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216Z"/>
                                    </svg>
                                    <span>${user.followerCount} followers</span>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div id="profileBtns" class="profile-actions"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function attachPhotoButtons() {
    const coverContainer = document.getElementById("coverContainer");
    const profileContainer = document.getElementById("profileContainer");
    
    // Cover upload button
    const coverBtn = document.createElement("button");
    coverBtn.classList.add("btn", "btn-light", "rounded-circle", "p-2", "position-absolute", "bottom-0", "end-0", "m-3", "shadow-sm", "photo-edit-btn");
    coverBtn.id = "coverUploadBtn";
    coverBtn.innerHTML = `
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
            <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
        </svg>
    `;
    coverContainer.appendChild(coverBtn);
    
    // Profile upload button
    const profileBtn = document.createElement("button");
    profileBtn.classList.add("btn", "btn-light", "rounded-circle", "p-2", "position-absolute", "bottom-0", "end-0", "shadow-sm", "photo-edit-btn");
    profileBtn.style.width = "36px";
    profileBtn.style.height = "36px";
    profileBtn.id = "profileUploadBtn";
    profileBtn.innerHTML = `
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
            <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
        </svg>
    `;
    profileContainer.appendChild(profileBtn);
}

export function ProfileButtons(isFollowed,userId) {
    if (isFollowed) {
        return `
            <div class="d-flex flex-column flex-sm-row gap-2">
                <button class="btn btn-light border rounded-pill px-4 py-2 profileFollowBtn profile-action-btn" data-action="unfollow">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    Following
                </button>
                <button class="btn btn-light border rounded-pill px-4 py-2 message-btn" data-action="message">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                    </svg>
                    Message
                </button>
            </div>
        `;
    }
    
    return `
        <div class="d-flex flex-column flex-sm-row gap-2">
            <button class="btn btn-light border rounded-pill px-4 py-2 profileFollowBtn profile-action-btn" data-action="follow">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                <span class="fw-semibold">Follow</span>
            </button>
            <button class="btn btn-light border rounded-pill px-4 py-2 message-btn">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                </svg>
                <span class="fw-semibold">Message</span>
            </button>
        </div>
    `;
}


export function AnalyticsSection(user,analytics={}) {
    return `
        <div class="card border-0 shadow-sm rounded-3">
            <div class="card-header bg-white border-0 px-4 pt-3 pb-0">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-eye-fill text-muted small"></i>
                    <span class="fw-semibold text-muted small text-uppercase">Analytics</span>
                </div>
            </div>
            <div class="card-body p-3">
                <div class="row g-2 gy-2">
                    <div class="col-12 col-md-6">
                        <a href="/analytics/profile-views" class="text-decoration-none" data-link>
                            <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                                <div>
                                    <div class="text-muted small mb-1">Profile views</div>
                                    <div class="fw-bold fs-5 analyticNumber" >${user.viewersCount || 0}</div>
                                </div>
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-eye-fill text-info" ></i>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="col-12 col-md-6">
                        <a class="text-decoration-none">
                            <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                                <div>
                                    <div class="text-muted small mb-1">Post views</div>
                                    <div class="fw-bold fs-5 analyticNumber">${analytics.viewersCount || 'not available'}</div>
                                </div>
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-bar-chart-line text-secondary"></i>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="col-12 col-md-6">
                        <a href="/analytics/followers" class="text-decoration-none" data-link>
                            <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                                <div>
                                    <div class="text-muted small mb-1">Followers</div>
                                    <div class="fw-bold fs-5 analyticNumber">${user.followerCount || 0}</div>
                                </div>
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-people-fill analyticNumber"></i>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="col-12 col-md-6">
                        <a href="/analytics/following" class="text-decoration-none" data-link>
                            <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                                <div>
                                    <div class="text-muted small mb-1">Following</div>
                                    <div class="fw-bold fs-5 analyticNumber">${user.followingCount || 0}</div>
                                </div>
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-person-check-fill text-success"></i>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function ActivitiesSection(user,analytics={}) {
    return `
        <div class="card border-0 shadow-sm rounded-3">
            <!-- Header -->
            <div class="card-header bg-white border-0 px-4 pt-3 pb-0">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-activity text-muted small"></i>
                    <span class="fw-semibold text-muted small text-uppercase">Activities</span>
                </div>
            </div>            
            <div class="card-body p-3">
                <div class="d-flex flex-column gap-2">
                    <a href="/activities/likes" class="text-decoration-none" data-link>
                        <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-hand-thumbs-up analyticNumber"></i>
                                </div>
                                <div>
                                    <div class="fw-medium text-dark">Likes</div>
                                    <div class="text-muted small">Posts you've liked</div>
                                </div>
                            </div>
                            <div class="fw-bold fs-5 analyticNumber">${analytics.totalLikes || 0}</div>
                        </div>
                    </a>
                    <a href="/activities/comments" class="text-decoration-none" data-link>
                        <div class="d-flex align-items-center justify-content-between p-3 border rounded-2 bg-white">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-light p-2 rounded-2">
                                    <i class="bi bi-chat text-dark"></i>
                                </div>
                                <div>
                                    <div class="fw-medium text-dark">Comments</div>
                                    <div class="text-muted small">Your comments on posts</div>
                                </div>
                            </div>
                            <div class="fw-bold fs-5 analyticNumber">${analytics.totalComments || 0}</div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    `;
}

export function ProfileViewers(viewers) {
    return `
        <div class="p-3">
            <div class="d-flex align-items-center mb-3">
                <h6 class="fw-semibold mb-0">Last Unique Profile Views</h6>
                <span class="badge bg-light text-secondary ms-2 rounded-pill">${viewers.length}</span>
            </div>
            
            <div class="d-flex flex-column">
                ${viewers.map(viewer => `
                    <article class="d-flex align-items-center py-2 border-bottom position-relative hover-bg" 
                             data-navigate="/userProfile/${viewer.userId._id}"
                             style="cursor: pointer;">
                        
                        <!-- Profile Link Area -->
                        <a href="/userProfile/${viewer.userId._id}" 
                           class="stretched-link text-decoration-none d-flex align-items-center flex-grow-1 min-width-0" 
                           data-link>
                           
                            <!-- Profile Image -->
                            <img src="${viewer.userId.profileUrl || '/default-avatar.png'}" 
                                 class="rounded-circle me-3" 
                                 width="48" height="48"
                                 style="object-fit: cover;"
                                 alt="${viewer.userId.name}'s profile"
                                 onerror="this.src='profiles/default-profile.png'">
                            
                            <!-- User Info -->
                            <div class="flex-grow-1 min-width-0">
                                <h6 class="fw-semibold mb-1 text-dark text-truncate">${viewer.userId.name}</h6>
                                ${viewer.userId.job ? `<p class="text-muted small mb-1 text-truncate">${viewer.userId.job}</p>` : ''}
                                <div class="d-flex align-items-center text-muted small">
                                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                                    </svg>
                                    ${new Date(viewer.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </a>
                        
                        <!-- Action Button -->
                        <div class="position-relative idContainer" style="z-index: 2;" data-user-id="${viewer.userId._id}">
                            <button class="btn btn-light border btn-sm rounded-pill px-3 ${viewer.isFollowing ? 'message-btn': 'viewerFollowBtn'}"> 
                                ${viewer.isFollowing ? 'Message' : 'Follow'}
                            </button>
                        </div>
                    </article>
                `).join('')}
            </div>
        </div>
    `;
}

export function FollowersSimpleStats({ total, today, week, month },type) {
    const title = type === 'followers' ? 'Total Followers' : 'Total Following';
    const icon = type === 'followers' ? 'bi-people-fill' : 'bi-person-check-fill text-success';
    return `
        <div class="bg-white rounded-3 shadow-sm border p-3">
            <!-- Total header -->
            <div class="d-flex flex-column align-items-center text-center mb-4">
                <div class="bg-primary bg-opacity-10 p-3 rounded-3 mb-2">
                    <i class="bi ${icon} text-primary fs-3"></i>
                </div>
                <span class="text-secondary">${title}</span>
                <div class="fw-bold fs-1">${total.toLocaleString()}</div>
            </div>
            
            <div class="row g-2">
                <div class="col-12 col-sm-6 col-md-4">
                    <div class="text-center p-3 bg-light rounded-3">
                        <span class="text-secondary small d-block">Today</span>
                        <div class="fw-semibold fs-4 ${today > 0 ? 'text-success' : today == 0 ? 'text-danger' : ''}">
                            ${today > 0 ? '+' : ''}${today}
                        </div>
                    </div>
                </div>
                
                <div class="col-12 col-sm-6 col-md-4">
                    <div class="text-center p-3 bg-light rounded-3">
                        <span class="text-secondary small d-block">Week</span>
                        <div class="fw-semibold fs-4 ${week > 0 ? 'text-success' : week == 0 ? 'text-danger' : ''}">
                            ${week > 0 ? '+' : ''}${week}
                        </div>
                    </div>
                </div>
                
                <div class="col-12 col-sm-12 col-md-4">
                    <div class="text-center p-3 bg-light rounded-3">
                        <span class="text-secondary small d-block">Month</span>
                        <div class="fw-semibold fs-4 ${month > 0 ? 'text-success' : month == 0 ? 'text-danger' : ''}">
                            ${month > 0 ? '+' : ''}${month}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function NoActivity(type='like'){
    if(type == 'like'){
    return `
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-12 col-md-6 text-center">
                <div class="empty-state">
                    <i class="bi bi-hand-thumbs-up" style="font-size: 4rem; color: #dee2e6;"></i>
                    <h4 class="mt-4 fw-normal">No likes yet</h4>
                    <p class="text-muted mb-4">When you like posts, you'll see them here.</p>
                </div>
            </div>
        </div>
    </div>
    `
    }else if(type == 'comment'){
    return `
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-12 col-md-6 text-center">
                <div class="empty-state">
                    <i class="bi bi-chat-dots" style="font-size: 4rem; color: #dee2e6;"></i>
                    <h4 class="mt-4 fw-normal">No comments yet</h4>
                    <p class="text-muted mb-4">When you comment on posts, you'll see them here.</p>
                </div>
            </div>
        </div>
    </div>
    `
    }else {
        return `<div>NO specific type returned: invalid: refresh !!!</div>`
    }
}
