export function Totalshow(followers = 0, following = 0) {
    return `
        <div class="card blue-shadow border-0 rounded-3 mb-3 overflow-hidden">
            
            <!-- Stats Row -->
            <div class="d-flex border-bottom bg-white">
                <a href="/followers"
                   class="flex-fill text-center text-decoration-none text-dark py-3 px-2 hover-bg"
                   data-link>
                    <div class="fw-bold fs-6">${followers}</div>
                    <div class="text-muted small">Followers</div>
                </a>

                <div class="vr my-0"></div>

                <a href="/following"
                   class="flex-fill text-center text-decoration-none text-dark py-3 px-2 hover-bg"
                   data-link>
                    <div class="fw-bold fs-6" id="followingNum">${following}</div>
                    <div class="text-muted small">Following</div>
                </a>
            </div>

            <!-- Search Action -->
            <div class="p-2 bg-white">
                <button
                    type="button"
                    id="openPeopleSearch"
                    class="btn btn-light border rounded-pill btn-sm w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold py-2"
                    aria-label="Search people"
                >
                    <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                    </svg>
                    <span>Search People</span>
                </button>
            </div>

        </div>
    `;
}

export function Followerfollowing(user, type = "following") {
    return `
        <div class="userCard d-flex align-items-center p-3 border-bottom position-relative hover-bg rounded-2 gap-3">
            
            <a href="/userProfile/${user._id}" 
               class="stretched-link text-decoration-none text-inherit d-flex align-items-center gap-3 flex-grow-1 min-width-0" 
               data-link>
                
                <!-- Profile Image - Fixed width -->
                <div class="flex-shrink-0 d-flex align-items-start">
                    <img src="${user.profileUrl}" 
                         class="rounded-circle border border-2 border-light shadow-sm" 
                         width="62" height="62" 
                         style="object-fit: cover;"
                         alt="${user.name}'s profile"
                         onerror="this.src='profiles/default-profile.png'">
                </div>
                
                <!-- User Info - Flexible width -->
                <div class="flex-grow-1 min-width-0">
                    <!-- Name - Wraps to new lines -->
                    <h6 class="fw-semibold mb-0 text-dark user-name" style="line-height: 1.2; margin-top: 0;">${user.name}</h6>
                    
                    <!-- Job - Truncates with ... -->
                    <p class="text-muted mb-0 text-truncate ms-2 user-job">${user.job}</p>
                    
                    <!-- Extra Info - Truncates with ... -->
                    <div class="text-muted text-truncate ms-2 user-extra-info">
                        ${user.gender} • ${user.city}, ${user.country}
                    </div>
                </div>
            </a>
            
            <!-- Action Button - Fixed width -->
            <div class="flex-shrink-0 align-self-center" style="z-index: 2;">
                ${type === "following" ?
            `<button class="btn btn-sm text-dark rounded-pill px-3 py-1 user-action-btn unfollow-btn" 
                             data-action="unfollow" 
                             data-user-id="${user._id}">
                        Unfollow
                    </button>` :
            `<button class="btn btn-sm text-dark rounded-pill px-3 py-1 user-action-btn block-btn" 
                             data-action="block" 
                             data-user-id="${user._id}">
                        Block
                    </button>`
        }
            </div>
        </div>
    `;
}

export function Peoplecard(user) {
    let peopleContainer = document.createElement("article")
    peopleContainer.classList.add("personContainer")
    peopleContainer.style.width = "calc(50% - 0.5rem)"; // 2 per row
    peopleContainer.innerHTML = `
        <div class="card people-card border-0 shadow-sm text-center h-100 position-relative d-flex flex-column" 
             data-user-id="${user._id}">
            
            <!-- Stretched Link for Profile -->
            <a href="/userProfile/${user._id}" 
               class="stretched-link text-decoration-none flex-grow-1 d-flex flex-column" 
               data-link>
               
                <img src="${user.coverUrl}" class="people-cover">
                <img src="${user.profileUrl}" class="people-profile shadow">
                
                <div class="card-body people-card-content flex-grow-1">
                    <h6 class="fw-bold mb-1 text-dark people-name">${user.name}</h6>
                    <p class="text-muted small mb-0 textNoWrap">${user.job || ''}</p>
                    <p class="text-muted small mb-0 textNoWrap">${user.gender ? user.gender + ' · ' : ''}${user.city || ''} ${user.country ? '· ' + user.country : ''}</p>
                </div>
            </a>
            
            <!-- Follow Button - Always at bottom -->
            <div class="px-3 pb-3 mt-auto position-relative" style="z-index: 2;">
                <button class="btn btn-light border rounded-pill px-4 py-2 people-follow-btn" 
                        data-user-id="${user._id}">
                    Follow
                </button>
                
            </div>
        </div>
    `;
    return peopleContainer;
}
export function Nopeople() {
    return `
    <div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-12 col-md-6 text-center">
        <div class="empty-state">
            <i class="bi bi-people-fill" style="font-size: 4rem; color: #dee2e6;"></i>
            <h4 class="mt-4 fw-normal">There is no person for your here!</h4>
            <p class="text-muted mb-4">Follow people to see their posts and updates in your feed.</p>
        </div>
        </div>
    </div>
    </div>
    `
}

