import { getBlockedPeople } from "../api.js";
import { Settings, personalInformation, PhotoRemovals, blockedBtn, BlockedUser, newLoadMoreBtn, NoBlock, SecurityBtns, ChangePasswordForm, ChangeEmailForm, accountBtns, LogoutConfirmModal, renderDeleteAccountSection } from "../components/setting.js";
import { Showloader } from "../components/Showloader.js";
import { appState } from "../state.js";
import { toast } from "../utils/toast.js";

function getMiddleBar() {
    return document.getElementById("main-content--body");
}

export async function loadSettingsPage() {
    const middleBar = getMiddleBar()
    const openOffcanvas = document.querySelector('.offcanvas.show');
    if (openOffcanvas) {
        const offcanvasInstance = bootstrap.Offcanvas.getInstance(openOffcanvas);
        if (offcanvasInstance) offcanvasInstance.hide();
    }
    middleBar.innerHTML = Settings()
}

export async function loadPersonalInfo() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = " "
    middleBar.appendChild(personalInformation(appState.user))
}

export async function loadPhotoRemovals() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = PhotoRemovals(appState.user)
}

export async function loadPrivacy() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = blockedBtn()
}

export async function loadBlockedPeople(signal) {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = Showloader()
    try {
        let data = await getBlockedPeople(null,signal)
        middleBar.innerHTML = ''
        if (data.users?.length > 0) {
            // preparing the containers
            let container = document.createElement("div")
            container.classList.add("p-2", "blockMainContainer")
            let heading = document.createElement("h6")
            heading.classList.add("fw-bold", "mb-3")
            heading.innerHTML = ` Total Blocked Users <span class="text-secondary ms-2" id="totalBlocked" data-count=${data.total || 0}>· ${data.total || 0}</span>`;
            let blockContainer = document.createElement("div")
            blockContainer.classList.add("d-flex", "flex-column", "gap-2", "blockContainer")
            container.appendChild(heading)
            container.appendChild(blockContainer)
            middleBar.appendChild(container)
            for (let user of data.users) {
                blockContainer.appendChild(BlockedUser(user))
            }
            if (data.hasMore) {
                container.appendChild(newLoadMoreBtn(data.nextCursor, "block"))
            }
        } else {
            middleBar.appendChild(NoBlock())
        }
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }
        toast.error("Failed to load blocked users, Try again!")
    }
}

export async function loadSecurity() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = SecurityBtns()
}
export async function loadChangePassword() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = ChangePasswordForm()
}
export async function loadChangeEmail() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = ChangeEmailForm()
}

export async function loadAccount() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = accountBtns()
}

export async function loadLogout() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = LogoutConfirmModal();
    const modalEl = document.getElementById('logoutModal');
    if (!modalEl) {
        toast.error("Modal not found");
        return;
    }
    // Remove any existing instance
    const existingModal = bootstrap.Modal.getInstance(modalEl);
    if (existingModal) existingModal.dispose();

    const modal = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

export async function loadDeleteAccount() {
    const middleBar = getMiddleBar()
    middleBar.innerHTML = renderDeleteAccountSection()
}