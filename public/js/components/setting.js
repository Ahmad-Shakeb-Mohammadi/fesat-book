export function Settings() {
    return `
        <div class="settings-container">
            <!-- Header -->
            <div class="mb-2">
                <h4 class="mb-0 fw-bold">Settings</h4>
            </div>

            <!-- Settings List -->
            <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
                <div class="list-group list-group-flush">
                    
                    <!-- Personal Information -->
                    <a href="/settings/personal-info" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-person-fill fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Personal Information</h6>
                            <small class="text-muted">Manage your name, job, country and more</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                    <!-- Profile & Cover Photo -->
                    <a href="/settings/photos" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-camera-fill fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Profile & Cover Photo</h6>
                            <small class="text-muted">remove your profile and cover images</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                    <!-- Privacy -->
                    <a href="/settings/privacy" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-shield-lock-fill fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Privacy</h6>
                            <small class="text-muted">Control your block users</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                    <!-- Security -->
                    <a href="/settings/security" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-lock-fill fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Security</h6>
                            <small class="text-muted">email and password reset</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                    <!-- Appearance -->
                    <a href="/settings/appearance" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3 disabled opacity-50" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-palette-fill fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Appearance</h6>
                            <small class="text-muted">Dark mode, font size and display</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                    <!-- Account -->
                    <a href="/settings/account" 
                       class="list-group-item list-group-item-action d-flex align-items-center p-3" 
                       data-link>
                        <div class="settings-icon-wrapper me-3">
                            <i class="bi bi-person-circle fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0">Account</h6>
                            <small class="text-muted">Delete account or log out imediately</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </a>

                </div>
            </div>
        </div>
    `;
}

export function personalInformation(initialData = {}) {
    let cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "border-0", "rounded-2", "p-2");
    const isOtherSelected = initialData.gender && !['Male', 'Female', 'Gay'].includes(initialData.gender);

    cardDiv.innerHTML = `
    <div class="card-body">
        <h5 class="fw-bold text-dark mb-4">Personal Information</h5>
        
        <form class="user-form row g-3" novalidate>
          <div class="col-12">
            <label class="form-label fw-semibold text-secondary small">Full Name</label>
            <input type="text" class="form-control rounded-pill" name="name" 
                minlength="3" maxlength="30" value="${initialData.name || ''}" required>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold text-secondary small">Country</label>
            <input type="text" class="form-control rounded-pill" name="country" 
                minlength="3" maxlength="30"  pattern="[A-Za-z ]+" title="only letters and spaces in between" value="${initialData.country || ''}" required>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold text-secondary small">City</label>
            <input type="text" class="form-control rounded-pill" name="city" 
                minlength="3" maxlength="30"  pattern="[A-Za-z ]+" title="only letters and spaces in between" value="${initialData.city || ''}" required>
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold text-secondary small">Job Title</label>
            <input type="text" class="form-control rounded-pill" name="job" 
                   pattern="[A-Za-z ]+" title="only letters and spaces in between" minlength="3" maxlength="45" value="${initialData.job || ''}" required>
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold text-secondary small">Gender</label>
            <select class="form-select rounded-pill gender-select" name="gender" required>
              <option value="" disabled ${!initialData.gender ? 'selected' : ''}>Select gender...</option>
              <option value="Male" ${initialData.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${initialData.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Gay" ${initialData.gender === 'Gay' ? 'selected' : ''}>Gay</option>
              <option value="other" ${isOtherSelected ? 'selected' : ''}>Other</option>
            </select>
          </div>

          <div class="col-12 other-gender-container" style="display: ${isOtherSelected ? 'block' : 'none'};">
            <label class="form-label fw-semibold text-secondary small">Please specify Gender</label>
            <input type="text" class="form-control rounded-pill" name="otherGender" 
                   pattern="[A-Za-z ]+" title="only letters and spaces in between" minlength="3" maxlength="30" value="${isOtherSelected ? initialData.gender : ''}">
          </div>

          <div class="col-12 mt-3 d-flex justify-content-center">
            <button type="button" class="btn py-2 px-5 fw-bold text-white rounded-pill modern-post-btn submit-personal-form" 
                    style="background: #4d69e5;">
              Save
            </button>
          </div>
        </form>
    </div>`;

    // Gender dropdown toggle
    const genderSelect = cardDiv.querySelector('.gender-select');
    const otherContainer = cardDiv.querySelector('.other-gender-container');
    const otherInput = cardDiv.querySelector('input[name="otherGender"]');

    genderSelect.addEventListener('change', (e) => {
        if (e.target.value === 'other') {
            otherContainer.style.display = 'block';
            otherInput.required = true;
        } else {
            otherContainer.style.display = 'none';
            otherInput.required = false;
            otherInput.value = '';
        }
    });
    return cardDiv;
}

export function PhotoRemovals(user) {
    return `
    <div class="container-fluid px-0 mt-3">
      <!-- Cover Photo Section -->
      <div class="card border-0 shadow-lg mb-3">
        <div class="card-body p-4">
          <div class="mb-3 pb-1 border-bottom">
            <h5 class="mb-0 fw-semibold" style="color: #2c3e50;">Cover Photo</h5>
            <small class="text-muted" style="font-size: 0.7rem;">Remove your cover image</small>
          </div>
          <div class="d-flex flex-column align-items-center coverDiv">
            <img 
              src="${user.coverUrl || 'coverphoto/default-cover.webp'}" 
              class="object-fit-cover rounded-3" 
              alt="Cover photo" 
              style="width: 100%; max-width: 450px; height: 150px;"
            />
            <button 
              type="button" 
              class="btn btn-outline-danger btn-sm mt-3 px-4 remove-cover"
            >
              Remove Cover
            </button>
            
          </div>
        </div>
      </div>

      <!-- Profile Photo Section -->
      <div class="card border-0 shadow-lg">
        <div class="card-body p-4">
          <div class="mb-3 pb-1 border-bottom">
            <h5 class="mb-0 fw-semibold" style="color: #2c3e50;">Profile Photo</h5>
            <small class="text-muted" style="font-size: 0.7rem;">Remove your profile image</small>
          </div>
          <div class="d-flex flex-column align-items-center profileDiv">
            <img 
              src="${user.profileUrl || 'profiles/default-profile.png'}" 
              alt="Profile photo" 
              class="rounded-circle object-fit-cover mb-3" 
              width="140" 
              height="140"
            />
            <button 
              type="button" 
              class="btn btn-outline-danger btn-sm px-4 remove-profile"
            >
              Remove Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function blockedBtn() {
    return `
<div class="settings-container">
    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
        <div class="list-group list-group-flush">
            <!-- Blocked Contacts -->
            <a href="/settings/blocked-people" 
               class="list-group-item list-group-item-action d-flex align-items-center p-3" 
               data-link>
                <div class="settings-icon-wrapper me-3">
                    <i class="bi bi-person-x-fill fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">Blocked People</h6>
                    <small class="text-muted">manage your blocked users list</small>
                </div>
                <i class="bi bi-chevron-right text-muted ms-2"></i>
            </a>

            <!-- Add more settings items here later -->
            
        </div>
    </div>
</div>
  `
}

export function BlockedUser({ blocked, date }) {
    let singleEl = document.createElement("div")
    singleEl.classList.add("d-flex", "align-items-center", "justify-content-between", "p-2", "border-bottom", "position-relative", "people-card")
    singleEl.innerHTML = `
            <div class="d-flex align-items-center gap-2 flex-grow-1" style="min-width:0">
                <img src="${blocked.profileUrl || 'profiles/default-profile.png'}" 
                        class="rounded-circle flex-shrink-0" 
                        style="width: 48px; height: 48px; object-fit: cover;">
                
                <div class="flex-grow-1" style="min-width:0">
                    <div class="fw-semibold text-truncate">${blocked.name}</div>
                    <div class="small text-secondary text-truncate">${blocked.job || ' '}</div>
                    <div class="small text-secondary text-truncate">
                        <i class="bi bi-clock me-1"></i>Blocked on ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>
            
            <button class="btn btn-outline-danger btn-sm rounded-pill px-3 ms-2 flex-shrink-0 unblockBtn" data-block-id="${blocked._id}">
                <i class="bi bi-unlock me-1"></i>Unblock
            </button>
        </div>    
    `
    return singleEl
}

export function NoBlock(){
    let containerDiv = document.createElement("div")
    containerDiv.classList.add("container","py-5")
    containerDiv.innerHTML = `
    <div class="row justify-content-center">
        <div class="col-12 col-md-6 text-center">
        <div class="empty-state">
            <i class="bi bi-people-fill" style="font-size: 4rem; color: #dee2e6;"></i>
            <h4 class="mt-4 fw-normal">You have not blocked anyone!</h4>
            <p class="text-muted mb-4">Unblock people to see their posts and updates in your feed.</p>
        </div>
        </div>
    </div>
    `
    return containerDiv
}

export function newLoadMoreBtn(lastId=null,type=null) {
    const div = document.createElement("div");
    div.classList.add("d-flex", "justify-content-center", "mt-3");
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add(
        "btn", "btn-light", 
        "w-50", "rounded-pill", "py-2",
        "fw-semibold", 
        "shadow-sm", "border",
        "load-more-btn",
        `load-more-${type}`
    );
    button.innerHTML = `<i class="bi bi-arrow-down me-2"></i>Load more`;
    button.dataset.lastId = lastId;
    div.appendChild(button)
    return div;
}

export function SecurityBtns() {
    return `
<div class="settings-container">
    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
        <div class="list-group list-group-flush">
            <!-- Change Password -->
            <a href="/settings/change-password" 
               class="list-group-item list-group-item-action d-flex align-items-center p-3" 
               data-link>
                <div class="settings-icon-wrapper me-3">
                    <i class="bi bi-lock-fill fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">Change Password</h6>
                    <small class="text-muted">update your account password</small>
                </div>
                <i class="bi bi-chevron-right text-muted ms-2"></i>
            </a>

            <!-- Change Email -->
            <a href="/settings/change-email" 
               class="list-group-item list-group-item-action d-flex align-items-center p-3" 
               data-link>
                <div class="settings-icon-wrapper me-3">
                    <i class="bi bi-envelope-fill fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">Change Email</h6>
                    <small class="text-muted">update your email address</small>
                </div>
                <i class="bi bi-chevron-right text-muted ms-2"></i>
            </a>
        </div>
    </div>
</div>
  `
}

export function ChangePasswordForm() {
    return `
    <div class="card-body p-3 mt-2">
        <h4 class="fw-bold text-dark mb-3">Change Password</h4>

        <form class="user-form row g-3">
          <div class="col-12">
            <label class="form-label fw-semibold text-dark small">Current Password</label>
            <input type="password" class="form-control rounded-pill" name="currentPassword" 
                minlength="8" maxlength="45" autofocus required>
            <div class="text-danger small mt-1 text-center" id="currentPasswordError" style="display: none;">
                <i class="bi bi-exclamation-circle me-1"></i>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold text-dark small">New Password</label>
            <input type="password" class="form-control rounded-pill" name="newPassword" 
                 minlength="8" maxlength="45" required>
            <div class="text-danger small mt-1 text-center" id="newPasswordError" style="display: none;">
                <i class="bi bi-exclamation-circle me-1"></i>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold text-dark small">Confirm New Password</label>
            <input type="password" minlength="8" maxlength="45" class="form-control rounded-pill" name="confirmNewPassword" required>
            <div class="text-danger small mt-2 text-center" id="confirmNewPasswordError" style="display: none;">
                <i class="bi bi-exclamation-circle me-1"></i>
            </div>
          </div>

          <div class="col-12 mt-3 d-flex justify-content-center">
            <button type="button" class="btn py-2 px-5 fw-bold text-white rounded-pill modern-post-btn submitChangePassword" 
                    style="background: #4d69e5;">
              Update Password
            </button>
          </div>
        </form>
    </div>`;
}


export function ChangeEmailForm() {
    return `
    <div class="card-body p-3 mt-2">
        <h4 class="fw-bold text-dark mb-3">Change Email</h4>

        <form class="user-form row g-3">
          <div class="col-12">
            <label class="form-label fw-semibold text-dark small">Current Password <small>(required)</small></label>
            <input type="password" class="form-control rounded-pill" name="currentPassword" 
                minlength="8" maxlength="45" autofocus required>
            <div class="text-danger small mt-1 text-center" id="currentPasswordError" style="display: none;">
                <i class="bi bi-exclamation-circle me-1"></i>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold text-dark small">New Email</label>
            <input type="email" class="form-control rounded-pill" name="newEmail" 
                 maxlength="45" required>
            <div class="text-danger small mt-1 text-center" id="newEmailError" style="display: none;">
                <i class="bi bi-exclamation-circle me-1"></i>
            </div>
          </div>

          <div class="col-12 mt-3 d-flex justify-content-center">
            <button type="button" class="btn py-2 px-5 fw-bold text-white rounded-pill modern-post-btn submitChangeEmail" 
                    style="background: #4d69e5;">
              Update Email
            </button>
          </div>
        </form>
    </div>`;
}


export function accountBtns() {
    return `
<div class="settings-container">
    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
        <div class="list-group list-group-flush">
            <!-- Logout -->
            <a href="/settings/logout" 
               class="list-group-item list-group-item-action d-flex align-items-center p-3" 
               data-link>
                <div class="settings-icon-wrapper me-3">
                    <i class="bi bi-box-arrow-right fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">Logout</h6>
                    <small class="text-muted">sign out of your account</small>
                </div>
                <i class="bi bi-chevron-right text-muted ms-2"></i>
            </a>

            <!-- Delete Account -->
            <a href="/settings/delete-account" 
               class="list-group-item list-group-item-action d-flex align-items-center p-3" 
               data-link>
                <div class="settings-icon-wrapper me-3">
                    <i class="bi bi-trash3-fill fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">Delete Account</h6>
                    <small class="text-muted text-danger">permanently delete your account</small>
                </div>
                <i class="bi bi-chevron-right text-muted ms-2"></i>
            </a>
        </div>
    </div>
</div>
  `
}


export function LogoutConfirmModal() {
    return `
    <div class="modal fade" id="logoutModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4">
                <div class="modal-body text-center p-4">
                    <div class="mb-3">
                        <i class="bi bi-box-arrow-right fs-1 text-danger"></i>
                    </div>
                    <h5 class="mb-2">Log out?</h5>
                    <p class="text-secondary mb-4">You can always log back in at any time.</p>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-light flex-fill py-2 rounded-pill" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger flex-fill py-2 rounded-pill confirm-logout-btn">Logout</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

export function renderDeleteAccountSection() {
    return `
<div class="card border-0 shadow-sm" style="border-radius: 8px;">
    <div class="card-header bg-transparent border-bottom px-4 pt-3 pb-2">
        <h5 class="mb-0 fw-bold fs-6">
            <span class="text-danger">Danger Zone</span>
        </h5>
    </div>
    <div class="card-body px-4 py-3">
        <div style="border: 1px solid #dadde1; border-radius: 8px; padding: 16px; background-color: #f0f2f5;">
            <div class="d-flex align-items-start">
                <div class="me-3">
                    <div class="rounded-circle bg-white d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                        <i class="bi bi-shield-exclamation text-danger fs-5"></i>
                    </div>
                </div>
                <div>
                    <h6 class="fw-semibold mb-1 fs-6">Delete Account</h6>
                    <p class="text-secondary mb-3 fs-6">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button class="btn btn-danger fw-semibold px-4" 
                            style="border-radius: 6px; background-color: #e41e3f; border: none;"
                            id="deleteAccountBtn">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Delete Account Modal -->
<div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 8px;">
            <div class="modal-header border-bottom px-4 pt-3 pb-2">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center me-2" 
                         style="width: 36px; height: 36px;">
                        <i class="bi bi-exclamation-triangle-fill text-danger"></i>
                    </div>
                    <h5 class="modal-title fw-semibold fs-5">
                        <span class="text-danger">Delete Account</span>
                    </h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body px-4 py-3">
                <div class="d-flex align-items-start p-3 mb-3" 
                     style="border-radius: 8px; background-color: #f0f2f5; border: 1px solid #dadde1;">
                    <div class="rounded-circle bg-white d-flex align-items-center justify-content-center me-3 flex-shrink-0" 
                         style="width: 32px; height: 32px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <i class="bi bi-exclamation-circle-fill text-warning" style="font-size: 1.1rem;"></i>
                    </div>
                    <div style="color: #1c1e21; font-size: 0.875rem; font-weight: 400;">
                        <strong style="font-weight: 500;">Warning!</strong> This action cannot be undone. All your data will be permanently deleted.
                    </div>
                </div>
                <form id="deleteAccountForm">
                    <div class="mb-3">
                        <label for="deletePassword" class="form-label fw-normal text-dark mb-1" style="font-size: 0.875rem; font-weight: 400;">
                            Enter your password
                        </label>
                        <input type="password" 
                               class="form-control" 
                               style="border-radius: 6px; border: 1px solid #ccd0d5; background-color: #f0f2f5; font-weight: 400; font-size: 0.9rem;"
                               id="deletePassword" 
                               placeholder="Your password"
                               required>
                    </div>
                    <div class="mb-3">
                        <label for="deleteConfirmation" class="form-label fw-normal text-dark mb-1" style="font-size: 0.875rem; font-weight: 400;">
                            Type <strong style="font-weight: 500;" class="text-danger">DELETE</strong> to confirm
                        </label>
                        <input type="text" 
                               class="form-control" 
                               style="border-radius: 6px; border: 1px solid #ccd0d5; background-color: #f0f2f5; font-weight: 400; font-size: 0.9rem;"
                               id="deleteConfirmation" 
                               placeholder="DELETE" 
                               required>
                    </div>
                    <div id="deleteError" class="alert alert-danger d-none" style="border-radius: 6px; font-size: 0.875rem; font-weight: 400;"></div>
                </form>
            </div>
            <div class="modal-footer border-top px-4 pb-4 pt-0">
                <button type="button" class="btn btn-light fw-semibold px-4" 
                        style="border-radius: 6px; background-color: #e4e6eb; border: none; color: #1c1e21; font-weight: 500;"
                        data-bs-dismiss="modal">
                    Cancel
                </button>
                <button type="button" class="btn fw-semibold px-4" 
                        style="border-radius: 6px; background-color: #e41e3f; border: none; color: white; font-weight: 500;"
                        id="confirmDeleteBtn">
                    Delete Account
                </button>
            </div>
        </div>
    </div>
</div>
    `
}
