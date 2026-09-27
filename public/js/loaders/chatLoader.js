import { ChatLayout } from "../components/chat/ChatLayout.js";
import { getMyConversations, getOnlineUsersList, getTotalUnreadCount } from "../chat/chatApi.js";
import { chatState, clearActiveConversation, calculateTotalUnreadCount } from "../chat/chatState.js";
import { initSocket } from "../chat/socketManager.js";
import { Showloader } from "../components/Showloader.js";
import { initChatEvents, cleanupChatEvents, openConversation, closeAddMembersModal } from "../chat/chatEvent.js";


let isInitialized = false;

/**
 * Load messenger page (full-page takeover)
 */

export async function loadMessenger(signal = null) {
  const container = document.getElementById("main-content--body");
  if (!container) return;

  hideSidebars();
  showMinimalNavbar();
  setMessengerMode();

  if (!isInitialized) {
    initSocket();
    isInitialized = true;
  }

  // Check cache freshness
  const now = Date.now();
  const isCacheFresh = chatState.conversationsLastFetched &&
    (now - chatState.conversationsLastFetched) < chatState.CACHE_DURATION &&
    chatState.conversations.length > 0;

  if (isCacheFresh) {
    // USE CACHE - Instant load
    container.innerHTML = ChatLayout();
    initChatEvents();
    updateNavbarBadge();

  } else {
    container.innerHTML = Showloader();

    try {
      const data = await getMyConversations(1, 100, signal);
      if (!data.success) {
        container.innerHTML = `<div class="alert alert-danger m-3">Failed to load conversations</div>`;
        return;
      }

      const onlineData = await getOnlineUsersList(signal);
      if (onlineData.success && onlineData.onlineUsers) {
        const userIds = onlineData.onlineUsers.map(user =>
          Array.isArray(user) ? user[0] : user
        );
        chatState.onlineUsers = new Set(userIds);
      }

      // Update state and cache
      chatState.conversations = data.conversations || [];
      chatState.conversationsPage = 1;
      chatState.conversationsHasMore = data.conversations.length === 100;
      chatState.conversationsLastFetched = now;

      // Initialize unread counts
      data.conversations.forEach(conv => {
        chatState.unreadCounts[conv._id] = conv.unreadCount || 0;
      });
      chatState.totalUnreadCount = calculateTotalUnreadCount();

      container.innerHTML = ChatLayout();
      initChatEvents();
      updateNavbarBadge();

    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Failed to load messenger:", error);
      container.innerHTML = `<div class="alert alert-danger m-3">Failed to load messenger</div>`;
      return;
    }
  }

  // NEW: Auto-open pending conversation (runs for BOTH cache and fetch paths)
  if (chatState.pendingConversationId) {
    const conversationId = chatState.pendingConversationId;
    chatState.pendingConversationId = null;

    requestAnimationFrame(() => {
      openConversation(conversationId);
    });
  }
}

/**
 * Hide both sidebars for messenger mode
 */
function hideSidebars() {
  const leftSidebar = document.querySelector(".sidebar-left");
  const rightSidebar = document.querySelector(".sidebar-right");

  if (leftSidebar) leftSidebar.style.display = "none";
  if (rightSidebar) rightSidebar.style.display = "none";
}

/**
 * Show sidebars when leaving messenger
 */
function showSidebars() {
  const leftSidebar = document.querySelector(".sidebar-left");
  const rightSidebar = document.querySelector(".sidebar-right");

  if (leftSidebar) leftSidebar.style.display = "";
  if (rightSidebar) rightSidebar.style.display = "";
}


function showMinimalNavbar() {
  const navbar = document.querySelector(".app-navbar");
  if (!navbar) return;

  // Store original content
  if (!navbar.dataset.originalContent) {
    navbar.dataset.originalContent = navbar.innerHTML;
  }

  // Replace with messenger navbar
  navbar.innerHTML = `
    <div class="navbar-content">
      <a class="navbar-brand fw-bold brand-gradient">
        <span class="brand-full">Fesat Book</span>
        <span class="brand-short">FB</span>
      </a>

      <h5 class="messenger-title mb-0">
        Messages
        <span class="badge bg-danger rounded-pill nav-badge text-white d-none ms-2"></span>
      </h5>

      <!-- Back to Feed Button -->
      <a href="/home" class="back-to-feed-btn" data-link>
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
        </svg>
        <span>Exit</span>
      </a>
    </div>
  `;

  updateNavbarBadge();
}

/**
 * Restore original navbar
 */
function restoreNavbar() {
  const navbar = document.querySelector(".app-navbar");
  if (navbar && navbar.dataset.originalContent) {
    navbar.innerHTML = navbar.dataset.originalContent;
  }
}

/**
 * Set messenger mode (full-width layout)
 */

function setMessengerMode() {
  const mainLayout = document.querySelector(".app-layout");
  if (mainLayout) {
    mainLayout.classList.add("messenger-mode");
  }

  const contentMain = document.querySelector(".content-main");
  if (contentMain) {
    contentMain.classList.add("messenger-mode");
  }

  // Prevent body scroll
  document.body.classList.add("messenger-active");
}

/**
 * Remove messenger mode
 */
function removeMessengerMode() {
  const mainLayout = document.querySelector(".app-layout");
  if (mainLayout) {
    mainLayout.classList.remove("messenger-mode");
  }

  const contentMain = document.querySelector(".content-main");
  if (contentMain) {
    contentMain.classList.remove("messenger-mode");
  }

  // Restore body scroll
  document.body.classList.remove("messenger-active");
}

/**
 * Cleanup when leaving messenger
 */
export function cleanupMessenger() {
  cleanupChatEvents();
  showSidebars();
  restoreNavbar();
  removeMessengerMode();
  clearActiveConversation();
  updateNavbarBadge();
  closeAddMembersModal()
}

export async function initializeChatUnreadCounts() {
  try {
    const data = await getTotalUnreadCount();
    if (data.success) {
      chatState.totalUnreadCount = data.totalUnread || 0;
      updateNavbarBadge();
    }
  } catch (error) {
    console.error('Failed to initialize unread counts:', error);
  }
}

export function updateNavbarBadge() {
  const badges = document.querySelectorAll(".nav-badge");
  if (badges.length === 0) return;

  const totalUnread = chatState.totalUnreadCount || 0;

  badges.forEach(badge => {
    if (totalUnread > 0) {
      badge.textContent = totalUnread > 99 ? "99+" : totalUnread;
      badge.classList.remove("d-none");
    } else {
      badge.classList.add("d-none");
    }
  });
}
