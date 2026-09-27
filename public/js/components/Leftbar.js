export function Leftbar(user){
    return `
<div class="card border-0 shadow-sm rounded-3 overflow-hidden w-100">

    <!-- Cover Image (VISIBLE) -->
    <div class="position-relative" id="leftSideCoverPhoto">
        <img src="${user.coverUrl}" 
             class="w-100"
             style="height: 70px; object-fit: cover;">
    </div>

    <!-- Profile Section -->
    <div class="text-center position-relative px-3 pb-3" style="margin-top:-32px;" id="leftSideProfilePhoto">
        <img src="${user.profileUrl}"
             class="rounded-circle border border-3 border-white"
             width="100"
             height="100"
             style="object-fit: cover; background:white;">

        <h6 class="fw-semibold mt-2 mb-0">${user.name}</h6>
        <p class="text-muted small mb-2">${user.job}</p>
    </div>

    <div class="border-top"></div>

    <!-- Stats -->
    <div class="px-3 py-2">

        <div class="d-flex justify-content-between py-1">
            <span class="text-muted small">Who's viewed your profile</span>
            <span class="fw-semibold small" style="color:#0a66c2;">${user.viewersCount}</span>
        </div>
        <div class="d-flex justify-content-between py-1">
            <span class="text-muted small">Total of your posts</span>
            <span class="fw-semibold small" style="color:#0a66c2;">${user.postCount}</span>
        </div>

    </div>
    <div class="px-3 pb-3 pt-1 d-flex flex-column gap-2">
        <a href="/profile" class="btn btn-primary btn-sm w-100 rounded-pill fw-semibold" data-link>View Profile</a>
        <a href="/settings" class="btn btn-outline-secondary btn-sm w-100 rounded-pill fw-semibold" data-link >Settings</a>
    </div>

</div>
    `
}
