import { layout } from "./layout.js";
import { router } from "./router.js";
import { publicRouter } from "./publicRouter.js";
import { FeedDelegation } from "./delgatedEvent.js"
import { tokenManager } from "./tokenManager.js";
import { refreshAccessToken } from "./api.js";
import { initSocket } from "./chat/socketManager.js";
import { openImagePreview } from "./utils/imagePreview.js";
import { initializeChatUnreadCounts } from "./loaders/chatLoader.js";
import { setupGlobalSocketHandlers } from "./chat/globalSocketHandlers.js";

document.addEventListener('DOMContentLoaded', async () => {
    await boot()
})

document.addEventListener('click', e => {
    const link = e.target.closest('a[data-link]')
    if (!link) return
    e.preventDefault()
    history.pushState(null, '', link.href)
    tokenManager.isAuth() ? router() : publicRouter()
})

// ONE listener, checks auth state dynamically
window.addEventListener('popstate', () => {
    tokenManager.isAuth() ? router() : publicRouter()
})

async function boot() {
    const token = await refreshAccessToken()

    if (!token) {
        showPublicPage()
        return
    }

    tokenManager.set(token)
    await initApp()
}

async function initApp() {
    await layout()
    openImagePreview(null)
    FeedDelegation()
    initSocket()
    setupGlobalSocketHandlers()
    initializeChatUnreadCounts();
    await router()
}

function showPublicPage() {
    publicRouter()
}