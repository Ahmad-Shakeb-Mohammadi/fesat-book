function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

export function SearchPeopleModal() {
    return `
        <div class="search-people-overlay" id="searchPeopleOverlay">
            <div class="search-people-modal">

                <!-- Header -->
                <div class="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <h6 class="fw-bold mb-0">Search People</h6>
                    <button class="btn btn-sm btn-link text-decoration-none p-0 search-people-close-btn"
                            style="color: #667eea; font-weight: 600; font-size: 0.9rem;">
                        Cancel
                    </button>
                </div>

                <!-- Search Input -->
                <div class="p-3 border-bottom">
                    <div class="position-relative">
                        <svg class="position-absolute top-50 start-0 translate-middle-y ms-3"
                             width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                        </svg>
                        <input
                            type="text"
                            class="form-control form-control-sm ps-5"
                            id="searchPeopleInput"
                            placeholder="Search people by name..."
                            autocomplete="off"
                            maxlength="60"
                        />
                    </div>
                </div>

                <!-- Results -->
                <div class="search-people-results flex-grow-1 overflow-auto p-3" id="searchPeopleResults">
                    <div class="text-center text-muted p-4">
                        <p class="mb-0" style="font-size: 0.9rem;">Search for people to connect with</p>
                    </div>
                </div>

            </div>
        </div>
    `;
}

export function SearchPeopleCards(users) {
    return users.map(user => `
        <article class="personContainer" style="width: calc(50% - 0.5rem);">
            <div class="card people-card border-0 shadow-sm text-center h-100 position-relative d-flex flex-column"
                 data-user-id="${user._id}">
                <a href="/userProfile/${user._id}"
                   class="stretched-link text-decoration-none flex-grow-1 d-flex flex-column"
                   data-link>
                    <img src="${escapeHtml(user.coverUrl)}" class="people-cover">
                    <img src="${escapeHtml(user.profileUrl)}" class="people-profile shadow">
                    <div class="card-body people-card-content flex-grow-1">
                        <h6 class="fw-bold mb-1 text-dark people-name">${escapeHtml(user.name)}</h6>
                        <p class="text-muted small mb-0 textNoWrap">${escapeHtml(user.job || '')}</p>
                        <p class="text-muted small mb-0 textNoWrap">
                            ${user.gender ? escapeHtml(user.gender) + ' · ' : ''}${escapeHtml(user.city || '')}${user.country ? ' · ' + escapeHtml(user.country) : ''}
                        </p>
                    </div>
                </a>
                <div class="px-3 pb-3 mt-auto position-relative" style="z-index: 2;">
                    <button class="btn btn-light border rounded-pill px-4 py-2 people-follow-btn"
                            data-user-id="${user._id}">
                        Follow
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

export function SearchPeopleLoadMore(cursor) {
    return `
        <div class="w-100 text-center py-3" id="searchLoadMoreWrapper">
            <button class="btn btn-light border rounded-pill px-4"
                    id="searchLoadMoreBtn"
                    data-created-at="${cursor.createdAt}"
                    data-id="${cursor._id}">
                Load more results
            </button>
        </div>
    `;
}