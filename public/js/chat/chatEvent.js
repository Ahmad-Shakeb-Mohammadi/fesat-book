import { chatState, setActiveConversation, clearActiveConversation, cacheMessages, addMessageToCache, updateMessageInCache, removeMessageFromCache, setUserOnline, setUserOffline, setTyping, setMessageDelivered, setMessageRead, getMessageStatus, downloadedFiles, updateConversationMuteStatus, calculateTotalUnreadCount, clearChatUploadState } from "./chatState.js";
import { getMessages, sendTextMessage, markAsRead, editMessage, deleteForMe, deleteForEveryone, leaveGroup, createOrOpenDirect, searchFollowing, getConversation, getChatMediaUrl, toggleMuteConversation, createGroup, uploadGroupImage, removeGroupImage, updateGroupName, addMembersToGroup, searchUsersForChat, updateMemberRole, removeMember, uploadChatFileToCloudinary, saveChatMediaMessage, cleanupChatUploads } from "./chatApi.js";
import { renderChatWindow, updateMobileView } from "../components/chat/ChatLayout.js";
import { joinConversation, leaveConversation, emitTypingStart, emitTypingStop, onEvent, offEvent } from "./socketManager.js";
import { updateNavbarBadge } from "../loaders/chatLoader.js";
import { appState } from "../state.js";
import { toast } from "../utils/toast.js";
import { GroupInfoPanel, renderGroupMembersList } from "../components/chat/GroupInfoPanel.js";
import { NewChatModal } from "../components/chat/NewChatModal.js";
import { MessageBubble, getFileIcon } from "../components/chat/MessageBubble.js";
import { ChatListItem } from "../components/chat/ChatListItem.js";
import { openImagePreview } from "../utils/imagePreview.js";
import { Showloader } from "../components/Showloader.js";
import { TypingIndicatorHTML } from "../components/chat/TypingIndicator.js";


let typingTimeout = null;
let searchTimeout = null;
const TYPING_DEBOUNCE = 1500;
let selectedFiles = [];
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const MAX_FILE_SIZE = 9 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime",
    "application/pdf",
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.ms-excel", // xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "text/plain", // txt
    "text/csv", // csv
    "application/json", // json
    "application/zip", "application/x-zip-compressed", "multipart/x-zip" // zip
];

let socketHandlers = {};
let messageScrollObserver = null;      // these two are from openconversatio
let messageResizeObserver = null;

// Message action variables
let activeDropdown = null;
let longPressTimer = null;
let activeMessageId = null;
let touchStartX = 0;
let touchStartY = 0;
const LONG_PRESS_DURATION = 500;
const TOUCH_MOVE_THRESHOLD = 10;
let conversationSearchTimeout = null;
let currentSearchQuery = "";
let isSearchActive = false;

// Message search state
let messageSearchMatches = [];
let currentMatchIndex = -1;
let messageSearchQuery = "";
let newChatSearchAbortController = null;
// Group state
let groupCreationState = {
    view: 'list', // 'list' | 'groupSelect' | 'groupDetails'
    selectedParticipants: [],
    followingUsers: []
};
let addMembersState = {
    selectedIds: new Set()
};


// Initialize chat event delegation and socket listeners
export function initChatEvents() {
    const container = document.getElementById("main-content--body");
    if (!container) return;

    chatState.chatEventsActive = true;

    container.addEventListener("click", handleChatClick);
    container.addEventListener("input", handleChatInput);
    container.addEventListener("keydown", handleChatKeydown);
    container.addEventListener("change", handleChatChange);
    setupSocketListeners();
    // Touch event listeners
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
}

export function cleanupChatEvents() {
    chatState.chatEventsActive = false;
    const container = document.getElementById("main-content--body");
    if (!container) return;

    container.removeEventListener("click", handleChatClick);
    container.removeEventListener("input", handleChatInput);
    container.removeEventListener("keydown", handleChatKeydown);
    container.removeEventListener("change", handleChatChange);

    container.removeEventListener("touchstart", handleTouchStart, { passive: true });
    container.removeEventListener("touchend", handleTouchEnd, { passive: true });
    container.removeEventListener("touchmove", handleTouchMove, { passive: true });

    const globalOverlay = document.getElementById("global-native-preview");
    if (globalOverlay) {
        globalOverlay.classList.remove("active");
    }

    if (messageScrollObserver) {
        messageScrollObserver.destroy();
        messageScrollObserver = null;
    }

    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }

    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }

    cleanupSocketListeners();

}

// Setup socket event listeners
function setupSocketListeners() {
    socketHandlers = {
        "message:new": handleSocketNewMessage,
        "message:edited": handleSocketEditedMessage,
        "message:deleted": handleSocketDeletedMessage,
        "typing:start": handleSocketTypingStart,
        "typing:stop": handleSocketTypingStop,
        "user:online": handleSocketUserOnline,
        "user:offline": handleSocketUserOffline,
        "conversation:read": handleSocketConversationRead,
        "conversation:new": handleSocketConversationNew,
        "conversation:updated": handleSocketConversationUpdated,
        "message:delivered": handleSocketMessageDelivered,
        "messages:read": handleSocketMessagesRead,
        "conversation:deleted": handleSocketConversationDeleted,
    };

    Object.entries(socketHandlers).forEach(([event, handler]) => {
        onEvent(event, handler);
    });
}

function cleanupSocketListeners() {
    Object.entries(socketHandlers).forEach(([event, handler]) => {
        offEvent(event, handler);
    });
    socketHandlers = {};
}

// Handle new message from socket (append without full re-render)
async function handleSocketNewMessage(data) {
    const { message } = data;
    if (!message || !message.conversationId) return;

    const conversationId = message.conversationId;
    const currentUserId = appState.user._id.toString();
    const senderId = message.senderId?._id?.toString() || message.senderId?.toString();

    await ensureConversationExists(conversationId);

    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) {
        console.error(`[Socket] Failed to fetch conversation: ${conversationId}`);
        return;
    }

    if (senderId === currentUserId) {
        chatState.unreadCounts[conversationId] = 0;
        chatState.totalUnreadCount = calculateTotalUnreadCount();
        updateNavbarBadge();
        updateConversationInList(conversationId, message, true);
        return;
    }

    if (!chatState.messagesCache[conversationId]) {
        chatState.messagesCache[conversationId] = {
            messages: [],
            hasMore: false,
            nextCursor: null,
            recipientLastReadAt: null
        };
    }

    if (chatState.activeConversationId === conversationId) {
        const cached = chatState.messagesCache[conversationId];
        const messageId = message._id.toString();
        const alreadyInCache = cached.messages.some(m => m._id.toString() === messageId);

        if (!alreadyInCache) {
            addMessageToCache(conversationId, message);
            const existingMsg = document.querySelector(`[data-message-id="${messageId}"]`);
            if (!existingMsg) {
                appendMessage(message, conversation.type, conversationId);
            }
        }

        markAsRead(conversationId).then(() => {
            chatState.unreadCounts[conversationId] = 0;
            updateNavbarBadge();
        }).catch(err => {
            console.error("Failed to mark as read:", err);
        });

        updateConversationInList(conversationId, message, true);
    } else {
        const cached = chatState.messagesCache[conversationId];
        const messageId = message._id.toString();
        const alreadyInCache = cached.messages.some(m => m._id.toString() === messageId);

        if (!alreadyInCache) {
            addMessageToCache(conversationId, message);
        }

        const currentCount = chatState.unreadCounts[conversationId] || 0;
        chatState.unreadCounts[conversationId] = currentCount + 1;

        chatState.totalUnreadCount = calculateTotalUnreadCount();

        updateNavbarBadge();
        updateConversationInList(conversationId, message, true);
    }
}

// Fetch conversation if not in list (handles pagination edge case)
async function ensureConversationExists(conversationId) {
    const exists = chatState.conversations.find(c => c._id === conversationId);
    if (exists) return;

    try {
        const data = await getConversation(conversationId);
        if (data.success && data.conversation) {
            chatState.conversations.unshift(data.conversation);
            chatState.unreadCounts[conversationId] = data.conversation.unreadCount || 0;
            chatState.totalUnreadCount = calculateTotalUnreadCount();
            updateNavbarBadge();
        }
    } catch (error) {
        console.error(`[ensureConversationExists] Failed to fetch conversation ${conversationId}:`, error);
    }
}

// Handle edited message from socket (targeted DOM update)
function handleSocketEditedMessage(data) {
    const { messageId, text, editedAt, conversationId } = data;
    if (!messageId) return;

    updateMessageInCache(chatState.activeConversationId, messageId, { text, editedAt });
    updateMessageInDOM(messageId, { text, editedAt }, conversationId);
}

// Handle deleted message from socket (targeted DOM update)
function handleSocketDeletedMessage(data) {
    const { messageId, deletedForEveryoneAt, conversationId } = data;
    if (!messageId || !conversationId) return;

    // Update cache
    updateMessageInCache(conversationId, messageId, {
        deletedForEveryoneAt,
        text: '',
        attachments: []
    });

    // Update conversation list if this was the last message
    const convIndex = chatState.conversations.findIndex(c => c._id === conversationId);
    if (convIndex !== -1) {
        const conv = chatState.conversations[convIndex];
        if (conv.lastMessage && conv.lastMessage._id.toString() === messageId.toString()) {
            conv.lastMessage = {
                ...conv.lastMessage,
                deletedForEveryoneAt,
                text: '',
                attachments: []
            };

            // Re-render the conversation list item
            updateConversationInList(conversationId, conv.lastMessage, false);
        }
    }

    // Update DOM if active conversation
    if (conversationId === chatState.activeConversationId) {
        updateMessageInDOM(messageId, { deletedForEveryoneAt }, conversationId);
    }
}

function handleSocketTypingStart(data) {
    const { conversationId, userId } = data;
    if (!conversationId || !userId) return;
    if (userId === appState.user._id) return;

    setTyping(conversationId, userId, true);

    if (chatState.activeConversationId === conversationId) {
        updateTypingIndicator();
    }
}

function handleSocketTypingStop(data) {
    const { conversationId, userId } = data;
    if (!conversationId || !userId) return;

    setTyping(conversationId, userId, false);

    if (chatState.activeConversationId === conversationId) {
        updateTypingIndicator();
    }
}

// Update delivered status when user comes online
function handleSocketUserOnline(data) {
    const { userId } = data;
    if (!userId) return;

    const userIdStr = userId.toString();
    setUserOnline(userIdStr);
    updateConversationListOnlineStatus(userIdStr, true);
    updateChatHeaderOnlineStatus();

    const currentUserId = appState.user._id.toString();
    const activeConversationId = chatState.activeConversationId;

    if (activeConversationId) {
        const conversation = chatState.conversations.find(c => c._id === activeConversationId);
        if (conversation && conversation.type === "direct") {
            const otherParticipant = conversation.participants.find(
                p => (p.userId?._id?.toString() || p.userId?.toString()) !== currentUserId
            );
            const otherUserId = otherParticipant?.userId?._id?.toString() || otherParticipant?.userId?.toString();

            if (otherUserId === userIdStr) {
                const cached = chatState.messagesCache[activeConversationId];
                if (cached) {
                    cached.messages.forEach(message => {
                        const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
                        if (senderId !== currentUserId) return;
                        if (message.deletedForEveryoneAt) return;

                        const messageId = message._id.toString();
                        const status = getMessageStatus(messageId);

                        if (!status.delivered && !status.read) {
                            setMessageDelivered(messageId);
                            updateMessageTick(messageId, "delivered");
                        }
                    });
                }
            }
        }
    }
}

function handleSocketUserOffline(data) {
    const { userId } = data;
    if (!userId) return;

    setUserOffline(userId);
    updateConversationListOnlineStatus(userId, false);
    updateChatHeaderOnlineStatus();
}

// Update read ticks when recipient reads conversation
function handleSocketConversationRead(data) {
    const { conversationId, userId, lastReadAt } = data;
    if (!conversationId || !userId || !lastReadAt) return;

    const currentUserId = appState.user._id.toString();
    const readerId = userId.toString();
    if (readerId === currentUserId) return;

    const readTimestamp = new Date(lastReadAt);
    const cached = chatState.messagesCache[conversationId];

    if (cached) {
        cached.recipientLastReadAt = lastReadAt;

        if (chatState.activeConversationId === conversationId) {
            cached.messages.forEach(message => {
                const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
                if (senderId !== currentUserId) return;
                if (message.deletedForEveryoneAt) return;

                const messageId = message._id.toString();
                const messageDate = new Date(message.createdAt);

                if (messageDate <= readTimestamp) {
                    setMessageRead(messageId);
                    updateMessageTick(messageId, "read");
                }
            });
        }
    }
}

function handleSocketConversationNew(data) {
    const { conversation } = data;
    if (!conversation) return;

    const exists = chatState.conversations.find(c => c._id === conversation._id);
    if (!exists) {
        chatState.conversations.unshift(conversation);
        chatState.unreadCounts[conversation._id] = conversation.unreadCount || 0;
        chatState.totalUnreadCount = calculateTotalUnreadCount();
        updateNavbarBadge();

        renderConversationList();
    }
}

function handleSocketConversationUpdated(data) {
    const { conversation } = data;
    if (!conversation) return;
    syncGroupConversationUI(conversation);
}

function handleSocketMessageDelivered(data) {
    const { messageId } = data;
    if (!messageId) return;

    setMessageDelivered(messageId);
    updateMessageTick(messageId, "delivered");
}

function handleSocketMessagesRead(data) {
    const { messageIds } = data;
    if (!messageIds || !Array.isArray(messageIds)) return;

    messageIds.forEach(id => {
        setMessageRead(id);
        updateMessageTick(id, "read");
    });
}

function handleSocketConversationDeleted(data) {
    const { conversationId } = data;
    if (!conversationId) return;

    // Remove from cache
    chatState.conversations = chatState.conversations.filter(c => c._id !== conversationId);
    delete chatState.messagesCache[conversationId];
    delete chatState.unreadCounts[conversationId];
    chatState.totalUnreadCount = calculateTotalUnreadCount();
    updateNavbarBadge();

    // If currently open, close it
    if (chatState.activeConversationId === conversationId) {
        clearActiveConversation();
        leaveConversation(conversationId);
        renderChatWindow();
        updateMobileView("list");
        toast.info("Group was dissolved", 2000);
    }

    renderConversationList();
}

// Handle all click events via event delegation
async function handleChatClick(e) {
    const cancelUploadBtn = e.target.closest('.cancel-upload-btn');
    if (cancelUploadBtn) {
        e.preventDefault();
        e.stopPropagation();
        await cancelChatUpload(chatState.activeConversationId, cancelUploadBtn.dataset.tempId);
        return;
    }

    // Message action menu button
    const menuBtn = e.target.closest('[data-action="menu"]');
    if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        const messageId = menuBtn.dataset.messageId;
        showActionDropdown(menuBtn, messageId);
        return;
    }

    // Click outside to close dropdown
    if (!e.target.closest('.action-dropdown') && !e.target.closest('[data-action="menu"]')) {
        closeActionDropdown();
    }

    // 4 handling search messages
    const searchMessages = e.target.closest('[data-action="search"]');
    if (searchMessages) {
        e.preventDefault();
        showMessageSearch();
        return;
    }

    const closeMessageSearch = e.target.closest(".close-message-search");
    if (closeMessageSearch) {
        hideMessageSearch();
        return;
    }

    const searchPrevMatch = e.target.closest(".search-prev-match");
    if (searchPrevMatch) {
        navigateSearchMatch("prev");
        return;
    }

    const searchNextMatch = e.target.closest(".search-next-match");
    if (searchNextMatch) {
        navigateSearchMatch("next");
        return;
    }

    const muteAction = e.target.closest('[data-action="mute"]');
    if (muteAction) {
        e.preventDefault();
        await handleMuteConversation();
        return;
    }


    const newChatBtn = e.target.closest("#newChatBtn");
    if (newChatBtn) {
        await openNewChatModal();
        return;
    }

    const closeNewChat = e.target.closest(".new-chat-close-btn");
    if (closeNewChat) {
        closeNewChatModal();
        return;
    }

    // Unified Load More click handler for New DMs, Groups, and Add Members views
    const loadMoreBtn = e.target.closest(".load-more-search-btn");
    if (loadMoreBtn) {
        const { query, createdAt, id, mode, conversationId } = loadMoreBtn.dataset;
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Loading...`;

        if (mode === 'addMembers') {
            handleAddMembersSearch(query, { createdAt, _id: id }, conversationId);
        } else {
            handleUserSearch(query, mode, { createdAt, _id: id });
        }
        return;
    }

    // NEW: Handle "New Group" trigger button
    const newGroupTrigger = e.target.closest(".new-group-trigger-btn");
    if (newGroupTrigger) {
        handleNewGroupTrigger();
        return;
    }

    // NEW: Handle back from group select to list
    const groupBackBtn = e.target.closest(".group-back-btn");
    if (groupBackBtn) {
        handleGroupBackToList();
        return;
    }

    // NEW: Handle participant checkbox toggle
    const participantCheckbox = e.target.closest(".participant-checkbox");
    if (participantCheckbox) {
        const userId = participantCheckbox.dataset.userId;
        handleParticipantToggle(userId);
        return;
    }

    // NEW: Handle participant item click (toggle selection)
    const participantItem = e.target.closest(".group-participant-item");
    if (participantItem && !e.target.closest(".participant-checkbox")) {
        const userId = participantItem.dataset.userId;
        handleParticipantToggle(userId);
        return;
    }

    // NEW: Handle remove participant chip
    const removeParticipantBtn = e.target.closest(".remove-participant-btn");
    if (removeParticipantBtn) {
        const userId = removeParticipantBtn.dataset.userId;
        handleParticipantToggle(userId);
        return;
    }

    // NEW: Handle "Next" button
    const groupNextBtn = e.target.closest(".group-next-btn");
    if (groupNextBtn && !groupNextBtn.disabled) {
        handleGroupNext();
        return;
    }

    // NEW: Handle back from group details
    const groupDetailsBackBtn = e.target.closest(".group-details-back-btn");
    if (groupDetailsBackBtn) {
        handleGroupDetailsBack();
        return;
    }

    // NEW: Handle "Create Group" button
    const groupCreateBtn = e.target.closest(".group-create-btn");
    if (groupCreateBtn && !groupCreateBtn.disabled) {
        await handleCreateGroup();
        return;
    }

    const closeGroupInfo = e.target.closest("#closeGroupInfoBtn");
    if (closeGroupInfo) {
        closeGroupInfoPanel();
        return;
    }

    // Close on backdrop click
    const groupInfoBackdrop = e.target.closest("#groupInfoBackdrop");
    if (groupInfoBackdrop) {
        closeGroupInfoPanel();
        return;
    }

    const changeGroupImageBtn = e.target.closest("#changeGroupImageBtn");
    if (changeGroupImageBtn) {
        const fileInput = document.getElementById("groupImageInput");
        if (fileInput) fileInput.click();
        return;
    }

    const removeGroupImageBtn = e.target.closest("#removeGroupImageBtn");
    if (removeGroupImageBtn) {
        await handleRemoveGroupImage();
        return;
    }

    // Leave group button
    const leaveGroupBtn = e.target.closest(".group-info-leave-btn");
    if (leaveGroupBtn) {
        await handleLeaveGroup();
        return;
    }


    const editGroupNameBtn = e.target.closest("#editGroupNameBtn");
    if (editGroupNameBtn) {
        showEditGroupNameInput();
        return;
    }

    const saveGroupNameBtn = e.target.closest("#saveGroupNameBtn");
    if (saveGroupNameBtn) {
        await handleSaveGroupName();
        return;
    }

    const cancelGroupNameBtn = e.target.closest("#cancelGroupNameBtn");
    if (cancelGroupNameBtn) {
        hideEditGroupNameInput();
        return;
    }

    const openAddMembersBtn = e.target.closest("#openAddMembersBtn");
    if (openAddMembersBtn) {
        await handleOpenAddMembers();
        return;
    }

    const closeAddMembersBtn = e.target.closest("#closeAddMembersBtn");
    if (closeAddMembersBtn) {
        closeAddMembersModal();
        return;
    }

    const addMembersBackdrop = e.target.closest("#addMembersBackdrop");
    if (addMembersBackdrop) {
        closeAddMembersModal();
        return;
    }

    const addMemberCheckbox = e.target.closest(".add-member-checkbox");
    if (addMemberCheckbox) {
        e.stopPropagation();
        handleToggleAddMember(addMemberCheckbox.dataset.userId);
        return;
    }

    const addMemberItem = e.target.closest(".add-member-item");
    if (addMemberItem && !e.target.closest(".add-member-checkbox")) {
        handleToggleAddMember(addMemberItem.dataset.userId);
        return;
    }

    const removeChipBtn = e.target.closest(".remove-chip-btn");
    if (removeChipBtn) {
        handleToggleAddMember(removeChipBtn.dataset.userId);
        return;
    }

    const addMembersSubmitBtn = e.target.closest(".add-members-submit-btn");
    if (addMembersSubmitBtn && !addMembersSubmitBtn.disabled) {
        await handleSubmitAddMembers();
        return;
    }


    const makeAdminAction = e.target.closest('[data-action="make-admin"]');
    if (makeAdminAction) {
        e.preventDefault();
        const userId = makeAdminAction.dataset.userId;
        await handleMakeAdmin(userId);
        return;
    }

    const removeMemberAction = e.target.closest('[data-action="remove-member"]');
    if (removeMemberAction) {
        e.preventDefault();
        const userId = removeMemberAction.dataset.userId;
        await handleRemoveMember(userId);
        return;
    }

    const selectUser = e.target.closest(".new-chat-select-btn");
    if (selectUser) {
        const userItem = selectUser.closest(".new-chat-user-item");
        if (userItem) {
            await handleSelectNewChatUser(userItem.dataset.userId);
        }
        return;
    }

    const userItem = e.target.closest(".new-chat-user-item");
    if (userItem && !e.target.closest(".new-chat-select-btn")) {
        await handleSelectNewChatUser(userItem.dataset.userId);
        return;
    }

    const chatItem = e.target.closest(".chat-list-item");
    if (chatItem) {
        await openConversation(chatItem.dataset.conversationId);
        return;
    }

    const clearSearch = e.target.closest(".chat-search-clear");
    if (clearSearch) {
        const searchInput = document.getElementById("chatSearchInput");
        if (searchInput) {
            searchInput.value = "";
            filterConversations("");
        }
        return;
    }

    const sendBtn = e.target.closest("#sendBtn");
    if (sendBtn && !sendBtn.disabled) {
        await handleSendText();
        return;
    }

    const backBtn = e.target.closest(".chat-back-btn");
    if (backBtn) {
        handleMobileBack();
        return;
    }

    const cancelReply = e.target.closest(".cancel-reply-btn");
    if (cancelReply) {
        hideReplyPreview();
        return;
    }

    const replyAction = e.target.closest('[data-action="reply"]');
    if (replyAction) {
        e.preventDefault();
        showReplyPreview(replyAction.dataset.messageId);
        return;
    }

    const attachBtn = e.target.closest("#attachBtn");
    if (attachBtn) {
        const fileInput = document.getElementById("fileInput");
        if (fileInput) fileInput.click();
        return;
    }

    const editAction = e.target.closest('[data-action="edit"]');
    if (editAction) {
        e.preventDefault();
        showEditMessage(editAction.dataset.messageId);
        return;
    }

    const deleteMeAction = e.target.closest('[data-action="delete-me"]');
    if (deleteMeAction) {
        e.preventDefault();
        await handleDeleteForMe(deleteMeAction.dataset.messageId);
        return;
    }

    const deleteEveryoneAction = e.target.closest('[data-action="delete-everyone"]');
    if (deleteEveryoneAction) {
        e.preventDefault();
        await handleDeleteForEveryone(deleteEveryoneAction.dataset.messageId);
        return;
    }

    const cancelEdit = e.target.closest(".cancel-edit-btn");
    if (cancelEdit) {
        hideEditMessage();
        return;
    }

    const saveEdit = e.target.closest(".save-edit-btn");
    if (saveEdit) {
        await handleSaveEdit();
        return;
    }

    const toggleGroupInfo = e.target.closest(".toggle-group-info-btn");
    if (toggleGroupInfo) {
        toggleGroupInfoPanel();
        return;
    }

    const fileLink = e.target.closest('.chat-media-link[data-resource-type="raw"]');
    if (fileLink) {
        e.preventDefault();
        await handleFileClick(fileLink);
        return;
    }

    const imageContainer = e.target.closest('.chat-media-container[data-resource-type="image"]');
    if (imageContainer && e.target.classList.contains('chat-media-img')) {
        e.preventDefault();
        openImagePreview(e.target.src)
        return;
    }
}

function handleChatInput(e) {
    const newChatSearch = e.target.closest("#newChatSearchInput");
    if (newChatSearch) {
        filterNewChatUsers(newChatSearch.value);
        return;
    }

    const conversationSearch = e.target.closest("#chatSearchInput");
    if (conversationSearch) {
        filterConversations(conversationSearch.value);
        return;
    }

    const messageSearch = e.target.closest("#messageSearchInput");
    if (messageSearch) {
        performMessageSearch(messageSearch.value);
        return;
    }

    // NEW: Handle group participant search
    const groupParticipantSearch = e.target.closest("#groupParticipantSearchInput");
    if (groupParticipantSearch) {
        filterGroupParticipants(groupParticipantSearch.value);
        return;
    }

    const addMembersSearch = e.target.closest("#addMembersSearchInput");
    if (addMembersSearch) {
        filterAddMembersList(addMembersSearch.value);
        return;
    }

    const input = e.target.closest("#messageInput");
    if (!input) return;

    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    updateSendButtonState();

    if (chatState.activeConversationId) {
        emitTypingStart(chatState.activeConversationId);

        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            emitTypingStop(chatState.activeConversationId);
        }, TYPING_DEBOUNCE);
    }

}

async function handleChatKeydown(e) {
    // 1. Escape key handlers
    if (e.key === "Escape") {
        const newChatOverlay = document.getElementById("newChatOverlay");
        if (newChatOverlay) {
            closeNewChatModal();
            return;
        }

        const editInput = e.target.closest("#editGroupNameInput");
        if (editInput) {
            hideEditGroupNameInput();
            return;
        }
    }

    // 2. Creating New Group: Enter to Create
    const newGroupInput = e.target.closest("#newGroupNameInput");
    if (newGroupInput && e.key === "Enter") {
        e.preventDefault();
        const createBtn = document.getElementById("groupCreateBtn");
        if (createBtn && !createBtn.disabled) {
            await handleCreateGroup();
        }
        return;
    }

    // 3. Renaming Existing Group: Enter to Save
    const editGroupInput = e.target.closest("#editGroupNameInput");
    if (editGroupInput && e.key === "Enter") {
        e.preventDefault();
        await handleSaveGroupName();
        return;
    }

    // 4. Message Input: Enter to Send (desktop only - mobile Enter = newline, like WhatsApp)
    const messageInput = e.target.closest("#messageInput");
    if (messageInput && e.key === "Enter" && !e.shiftKey) {
        // Touch devices: let Enter insert a newline naturally - send via button only
        if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
            return;
        }
        e.preventDefault();
        const sendBtn = document.getElementById("sendBtn");
        if (sendBtn && !sendBtn.disabled) {
            await handleSendText();
        }
        return;
    }
}

async function handleChatChange(e) {
    const groupImageInput = e.target.closest("#groupImageInput");
    if (groupImageInput && groupImageInput.files.length > 0) {
        await handleUploadGroupImage(groupImageInput.files[0]);
        return;
    }
    const fileInput = e.target.closest("#fileInput");
    if (fileInput) {
        handleFileSelection(fileInput.files);
    }
}

export async function openConversation(conversationId) {
    if (!conversationId) return;

    cleanupChatObservers();
    clearFileInput();
    setActiveConversation(conversationId);
    updateActiveListItem(conversationId);
    joinConversation(conversationId);
    updateMobileView("chat");

    // Smart loading: Fetch API only when no cache OR incomplete cache
    const cached = chatState.messagesCache[conversationId];
    const isStale = cached?.cachedAt && (Date.now() - cached.cachedAt > 90 * 1000);

    // Smart loading: fetch when no cache, incomplete cache, OR cache older than 90s
    if (!cached || !cached.isComplete || isStale) {
        await loadAndMergeMessages(conversationId, cached);
    }

    if (chatState.activeConversationId !== conversationId) return;
    renderChatWindow();

    const container = document.getElementById("messagesContainer");
    if (container) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }

    markAsRead(conversationId).then(() => {
        if (chatState.activeConversationId !== conversationId) return;

        chatState.unreadCounts[conversationId] = 0;

        chatState.totalUnreadCount = calculateTotalUnreadCount();

        updateNavbarBadge();

        const conversation = chatState.conversations.find(c => c._id === conversationId);
        if (conversation?.lastMessage) updateConversationInList(conversationId, null, false);
    }).catch(err => console.error("Failed to mark as read:", err));

    mountScrollStabilityObserver(conversationId);
    queueMicrotask(() => initializeMediaElements(conversationId));
    calculateInitialTickStatus(conversationId);

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (chatState.activeConversationId === conversationId) {
        mountInfiniteScroll(conversationId);
    }
}

async function loadAndMergeMessages(conversationId, existingCache) {
    const panel = document.getElementById("chatWindowPanel");
    const loaderDiv = document.createElement("div");
    loaderDiv.innerHTML = Showloader();
    loaderDiv.style.margin = 'auto';
    panel.innerHTML = "";
    panel.appendChild(loaderDiv);

    try {
        const data = await getMessages(conversationId, null, 30);
        if (!data.success) return;

        let finalMessages = data.messages;

        // If cache exists (incomplete), preserve socket updates
        if (existingCache?.messages?.length > 0) {
            finalMessages = preserveSocketUpdates(data.messages, existingCache.messages);
        }

        cacheMessages(conversationId, finalMessages, data.hasMore, data.nextCursor, data.recipientLastReadAt, true);

    } catch (error) {
        console.error("Failed to load messages:", error);
        toast.error("Failed to load messages");
    } finally {
        loaderDiv.remove();
    }
}

function preserveSocketUpdates(apiMessages, cachedMessages) {
    const apiMap = new Map(apiMessages.map(m => [m._id.toString(), m]));

    // Apply socket updates to API messages
    const updatedMessages = apiMessages.map(apiMsg => {
        const cached = cachedMessages.find(c => c._id.toString() === apiMsg._id.toString());

        if (cached) {
            // Preserve socket updates (deletion, edit)
            return {
                ...apiMsg,
                ...(cached.deletedForEveryoneAt && {
                    deletedForEveryoneAt: cached.deletedForEveryoneAt,
                    text: '',
                    attachments: []
                }),
                ...(cached.editedAt && new Date(cached.editedAt) > new Date(apiMsg.editedAt || 0) && {
                    text: cached.text,
                    editedAt: cached.editedAt
                })
            };
        }

        return apiMsg;
    });

    // Add socket-only messages (newer than API)
    cachedMessages.forEach(cached => {
        if (!apiMap.has(cached._id.toString()) && !cached.deletedForEveryoneAt) {
            updatedMessages.push(cached);
        }
    });

    return updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// Mount infinite scroll listener
function mountInfiniteScroll(conversationId) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    // Cleanup previous
    if (container._infiniteScrollHandler) {
        container.removeEventListener('scroll', container._infiniteScrollHandler);
        delete container._infiniteScrollHandler;
    }

    const handler = () => {
        if (chatState.isLoadingOlderMessages) return;
        if (chatState.activeConversationId !== conversationId) return;
        if (container.scrollHeight <= container.clientHeight) return;

        const cached = chatState.messagesCache[conversationId];
        if (!cached?.hasMore) return;

        if (container.scrollTop < 5) {
            container.removeEventListener('scroll', handler);
            delete container._infiniteScrollHandler;

            chatState.isLoadingOlderMessages = true;
            const loaderDiv = document.createElement('div');
            loaderDiv.innerHTML = Showloader();
            container.insertBefore(loaderDiv, container.firstChild);

            loadOlderMessages(conversationId)
                .catch(err => {
                    console.log(err)
                    toast.error('Failed to load older messages!', 1500)
                })
                .finally(() => {
                    chatState.isLoadingOlderMessages = false;
                    loaderDiv.remove()
                    const updated = chatState.messagesCache[conversationId];
                    if (updated?.hasMore && chatState.activeConversationId === conversationId) {

                        const reattach = () => {
                            if (chatState.activeConversationId !== conversationId) return;
                            if (container._infiniteScrollHandler) return;

                            // Only wait if scrollable AND still near top
                            if (container.scrollTop < 5 && container.scrollHeight > container.clientHeight) {
                                requestAnimationFrame(reattach);
                                return;
                            }

                            // Safe to re-attach (either scrolled away OR no scrollbar)
                            if (container.scrollHeight > container.clientHeight) {
                                container._infiniteScrollHandler = handler;
                                container.addEventListener('scroll', handler, { passive: true });
                            }
                        };

                        // Start checking after one frame
                        requestAnimationFrame(reattach);
                    }
                });
        }
    };

    container._infiniteScrollHandler = handler;
    container.addEventListener('scroll', handler, { passive: true });
}

// Load older messages
async function loadOlderMessages(conversationId) {
    const cached = chatState.messagesCache[conversationId];
    if (!cached?.nextCursor) {
        cached.hasMore = false;
        return;
    }

    const container = document.getElementById("messagesContainer");
    const list = document.getElementById("messagesList");
    if (!container || !list) return;

    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;

    const data = await getMessages(conversationId, cached.nextCursor, 30);

    if (chatState.activeConversationId !== conversationId) return;

    if (!data.success || !data.messages.length) {
        cached.hasMore = false;
        return;
    }

    cached.messages = [...data.messages, ...cached.messages];
    cached.nextCursor = data.nextCursor;
    cached.hasMore = data.hasMore;
    if (data.recipientLastReadAt) {
        cached.recipientLastReadAt = data.recipientLastReadAt;
    }

    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const html = data.messages
        .map(msg => MessageBubble(msg, conversation.type, conversationId))
        .join("");

    list.insertAdjacentHTML("afterbegin", html);

    // Maintain scroll position
    const heightDiff = container.scrollHeight - oldScrollHeight;
    container.scrollTop = oldScrollTop + heightDiff;

    queueMicrotask(() => initializeMediaElements(conversationId));
    calculateInitialTickStatus(conversationId);
}

function cleanupChatObservers() {
    if (messageResizeObserver) {
        messageResizeObserver.disconnect();
        messageResizeObserver = null;
    }

    const container = document.getElementById("messagesContainer");
    if (container?._infiniteScrollHandler) {
        container.removeEventListener('scroll', container._infiniteScrollHandler);
        delete container._infiniteScrollHandler;
    }
    if (container) {
        container.removeEventListener('scroll', closeActionDropdown, { passive: true });
    }
}

function mountScrollStabilityObserver(conversationId) {
    const container = document.getElementById("messagesContainer");
    const list = document.getElementById("messagesList");
    if (!container || !list) return;

    if (messageResizeObserver) {
        messageResizeObserver.disconnect();
        messageResizeObserver = null;
    }

    messageResizeObserver = new ResizeObserver(() => {
        if (chatState.activeConversationId !== conversationId) return;
        if (chatState.isLoadingOlderMessages) return;

        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll - container.scrollTop < 80) {
            container.scrollTop = maxScroll;
        }
    });
    // Close dropdown on scroll
    container.addEventListener('scroll', closeActionDropdown, { passive: true });
    messageResizeObserver.observe(list);
}

function initializeMediaElements(expectedConversationId) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;
    const mediaContainers = container.querySelectorAll('.chat-media-container'); // ONLY image/video, not .chat-media-link (PDF)
    if (!mediaContainers.length) return;

    const jobs = Array.from(mediaContainers).map(async (el) => {
        if (chatState.activeConversationId !== expectedConversationId) return null;
        // SKIP media that already has its URL - appendMessage re-runs this for
        // EVERY new message; without this skip it re-fetches the entire chat's
        // media each time (the request storm that exhausts the rate limit)
        const existing = el.querySelector('.chat-media-img, .chat-media-video');
        if (existing?.src) return null;
        const public_id = el.dataset.publicId;
        const resource_type = el.dataset.resourceType;
        const convId = el.dataset.conversationId;
        if (!public_id || public_id === 'null' || !convId) return null;
        if (el.closest('[data-is-uploading="true"]')) return null;
        // Skip raw - PDF only loads on click
        if (resource_type === 'raw') return null;
        try {
            const data = await getChatMediaUrl(public_id, resource_type, convId);
            if (chatState.activeConversationId !== expectedConversationId) return null;
            if (!data?.mediaUrl) return null;
            return { el, resource_type, url: decodeMediaUrl(data.mediaUrl) };
        } catch (error) {
            console.error('Failed to load media:', error);
            showMediaError(el);
            return null;
        }
    });

    Promise.all(jobs).then(results => {
        if (chatState.activeConversationId !== expectedConversationId) return;
        requestAnimationFrame(() => {
            results.forEach(item => {
                if (!item) return;
                const { el, url } = item;
                const target = el.querySelector('.chat-media-img, .chat-media-video');
                if (!target) return;
                target.addEventListener('error', () => retryMediaLoad(el, target), { once: true });
                target.src = url;
            });
        });
    });
}

async function retryMediaLoad(container, element) {
    const retryCount = parseInt(container.dataset.retryCount || '0');
    if (retryCount >= 2) { showMediaError(container); return; }
    container.dataset.retryCount = String(retryCount + 1);
    const { publicId, resourceType, conversationId } = container.dataset;
    try {
        const data = await getChatMediaUrl(publicId, resourceType, conversationId);
        if (data?.mediaUrl) {
            container.dataset.retryCount = '0';
            element.addEventListener('error', () => retryMediaLoad(container, element), { once: true });
            element.src = decodeMediaUrl(data.mediaUrl);
        }
    } catch { showMediaError(container); }
}

function showMediaError(container) {
    container.innerHTML = `
        <div class="media-error">
            <svg width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
            <span>Media unavailable</span>
        </div>
    `;
}

// Calculate initial tick status based on recipient's lastReadAt
function calculateInitialTickStatus(conversationId) {
    const cached = chatState.messagesCache[conversationId];
    if (!cached) return;

    const currentUserId = appState.user._id.toString();
    const recipientLastReadAt = cached.recipientLastReadAt ? new Date(cached.recipientLastReadAt) : null;
    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    cached.messages.forEach(message => {
        const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
        if (senderId !== currentUserId) return;
        if (message.deletedForEveryoneAt) return;

        const messageId = message._id.toString();
        const messageDate = new Date(message.createdAt);

        if (recipientLastReadAt && messageDate <= recipientLastReadAt) {
            setMessageRead(messageId);
            updateMessageTick(messageId, "read");
        } else {
            const currentStatus = getMessageStatus(messageId);
            if (currentStatus.delivered || currentStatus.read) return;

            if (conversation.type === "direct") {
                const otherParticipant = conversation.participants.find(
                    p => (p.userId?._id?.toString() || p.userId?.toString()) !== currentUserId
                );
                if (otherParticipant) {
                    const otherUserId = otherParticipant.userId?._id?.toString() || otherParticipant.userId?.toString();
                    if (chatState.onlineUsers.has(otherUserId)) {
                        setMessageDelivered(messageId);
                        updateMessageTick(messageId, "delivered");
                    } else {
                        updateMessageTick(messageId, "sent");
                    }
                }
            }
        }
    });
}

function shouldAutoScroll() {
    const container = document.getElementById("messagesContainer");
    if (!container) return false;
    const maxScroll = container.scrollHeight - container.clientHeight;
    return (maxScroll - container.scrollTop) < 150;
}

function scrollToBottom(smooth = true) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;
    requestAnimationFrame(() => {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? 'smooth' : 'instant'
        });
    });
}

function decodeMediaUrl(url) {
    if (!url) return url;
    return url
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

async function handleFileClick(linkElement) {
    const { publicId, resourceType, conversationId, originalName, format } = linkElement.dataset;
    if (!publicId || !conversationId) {
        toast.error("Cannot open document");
        return;
    }
    const fmt = (format || originalName?.split(".").pop() || "").toLowerCase();
    const previewable = ["pdf", "txt", "csv", "json"];
    const shouldPreview = previewable.includes(fmt);
    if (linkElement.dataset.loading === "true") {
        return;
    }
    linkElement.dataset.loading = "true";
    // PDF/TXT/CSV/JSON: Open the tab synchronously from the user click BEFORE awaiting the API. This avoids browser popup blockers.
    linkElement.style.pointerEvents = 'none';
    linkElement.style.opacity = '0.6';
    let previewWindow = null;
    if (shouldPreview && fmt === "pdf") {
        previewWindow = window.open("about:blank", "_blank");
        if (!previewWindow) {
            linkElement.dataset.loading = "false";
            toast.error("Please allow popups to preview this file");
            linkElement.style.pointerEvents = '';
            linkElement.style.opacity = '';
            linkElement.dataset.loading = 'false';
            return;
        }
        previewWindow.document.title = originalName || "Document";
    }
    const downloadEl = linkElement.querySelector(".chat-pdf-download, .chat-file-download");
    const originalIcon = downloadEl ? downloadEl.innerHTML : "";
    if (downloadEl) {
        downloadEl.innerHTML = `
            <svg class="chat-pdf-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
        `;
    }
    try {
        // PREVIEW
        if (shouldPreview) {
            let data;
            // Use cache for preview URLs. Your existing downloadedFiles Map is reused, so we don't need to redesign chatState.
            if (downloadedFiles.has(publicId)) {
                data = { mediaUrl: downloadedFiles.get(publicId) };
            } else {
                data = await getChatMediaUrl(publicId, resourceType, conversationId, "preview");
                downloadedFiles.set(publicId, data.mediaUrl);
            }
            if (!data?.mediaUrl) {
                throw new Error("No preview URL");
            }
            const mediaUrl = decodeMediaUrl(data.mediaUrl);
            // PDF
            if (fmt === "pdf") {
                if (!previewWindow) {
                    previewWindow = window.open("about:blank", "_blank");
                    if (!previewWindow) {
                        throw new Error("Popup blocked");
                    }
                }
                previewWindow.location.href = mediaUrl;
            } else {
                // TXT / CSV / JSON: Open through the browser.
                const textWindow = window.open(mediaUrl, "_blank");
                if (!textWindow) {
                    throw new Error("Popup blocked");
                }
            }
            if (downloadEl) {
                downloadEl.remove();
            }
            toast.success("Opened", 1200);
            return;
        }
        // DOWNLOAD: We explicitly request a Cloudinary attachment URL. This means the browser doesn't need the cross-origin HTMLAnchorElement.download trick.
        const data = await getChatMediaUrl(publicId, resourceType, conversationId, "download");
        if (!data?.mediaUrl) {
            throw new Error("No download URL");
        }
        const downloadUrl = decodeMediaUrl(data.mediaUrl);
        // Cloudinary's fl_attachment tells the browser to download the resource. We therefore deliberately DO NOT use: a.download = ...
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        if (downloadEl) {
            downloadEl.remove();
        }
        toast.success("Download started", 1200);
    } catch (error) {
        console.error("Failed to access chat file:", error);
        // If we created an empty PDF tab and something failed, close it.
        if (previewWindow && !previewWindow.closed) {
            previewWindow.close();
        }
        toast.error("Failed to open file");
        if (downloadEl) {
            downloadEl.innerHTML = originalIcon;
        }
    } finally {
        linkElement.style.pointerEvents = '';
        linkElement.style.opacity = '';
        linkElement.dataset.loading = 'false';
    }
}

function handleMobileBack() {
    const currentConvId = chatState.activeConversationId;
    if (messageScrollObserver) {
        messageScrollObserver.destroy();
        messageScrollObserver = null;
    }
    clearFileInput();
    clearActiveConversation();
    updateMobileView("list");
    if (currentConvId) {
        leaveConversation(currentConvId);
    }
}

// SINGLE source of truth for cancelling chat uploads - used by BOTH cancel buttons
async function cancelChatUpload(conversationId, tempId) {
    const state = chatState.activeChatUploads[conversationId];
    if (!state) return;

    // Block 1: message is being saved to DB
    if (state.isFinishing) {
        toast.error('Upload finished, cannot cancel now');
        return;
    }
    // Block 2: ALL bytes already sent to Cloudinary - abort won't stop it, files WILL be created
    if (state.files.every(f => f.progress >= 100)) {
        toast.error('Upload finished, cannot cancel now', 1500);
        return;
    }

    state.abortController.abort();

    // Give just-committed XHRs a moment to save their public_id in onload
    await new Promise(r => setTimeout(r, 300));

    // Cleanup only files Cloudinary actually committed (public_id exists)
    const uploadedIds = state.files.filter(f => f.public_id).map(f => f.public_id);
    if (uploadedIds.length > 0) await cleanupChatUploads(uploadedIds).catch(() => { });

    removeMessageFromCache(conversationId, tempId);
    document.querySelector(`[data-message-id="${tempId}"]`)?.remove();
    delete chatState.activeChatUploads[conversationId];

    document.getElementById('chatUploadProgress')?.classList.add('d-none');
    const cancelBtn = document.getElementById('cancelChatUploadBtn');
    if (cancelBtn) cancelBtn.classList.add('d-none');
    const attachBtn = document.getElementById('attachBtn');
    if (attachBtn) attachBtn.disabled = false;

    chatState.unreadCounts[conversationId] = 0;
    chatState.totalUnreadCount = calculateTotalUnreadCount();
    updateNavbarBadge();
    toast.error('Upload cancelled');
}

// Send text or media message without full re-render
async function handleSendText() {
    const input = document.getElementById("messageInput");
    if (!input) return;
    const text = input.value.trim();
    const hasFiles = selectedFiles.length > 0;
    if (!text && !hasFiles) return;
    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;
    const replyPreview = document.getElementById("replyPreview");
    const replyTo = replyPreview?.dataset.messageId || null;

    // Shared: swap optimistic bubble -> real message IN PLACE (no remove/append jump, order preserved)
    const swapOptimisticWithReal = (tempId, realMessage, conversationType) => {
        const existingEl = document.querySelector(`[data-message-id="${tempId}"]`);
        if (existingEl) {
            existingEl.outerHTML = MessageBubble(realMessage, conversationType, conversationId);
        } else {
            appendMessage(realMessage, conversationType, conversationId);
        }
        // Cache: replace at the SAME index (not remove+push, which reorders)
        const cache = chatState.messagesCache[conversationId];
        if (cache) {
            const idx = cache.messages.findIndex(m => m._id === tempId);
            if (idx !== -1) cache.messages[idx] = realMessage;
            else cache.messages.push(realMessage);
        }
        // Media containers in the real bubble need signed URLs (no-op for text-only)
        initializeMediaElements(conversationId);
    };

    // === CHAT MEDIA - Optimistic + Parallel + Progress inside bubble ===
    if (hasFiles) {
        const tempId = 'temp_' + Date.now();
        const filesToUpload = [...selectedFiles];

        // Optimistic message - appears instantly
        const optimisticMessage = {
            _id: tempId,
            conversationId,
            senderId: { _id: appState.user._id, name: appState.user.name, profileUrl: appState.user.profileUrl },
            text: text,
            attachments: filesToUpload.map(f => ({
                type: f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file",
                public_id: null,
                resource_type: f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "raw",
                originalName: f.name,
                size: f.size,
                progress: 0,
                isUploading: true
            })),
            createdAt: new Date().toISOString(),
            isOptimistic: true,
            isUploading: true
        };

        addMessageToCache(conversationId, optimisticMessage);
        const conversation = chatState.conversations.find(c => c._id === conversationId);
        appendMessage(optimisticMessage, conversation.type, conversationId);
        scrollToBottom();

        // Clear input immediately - non-blocking
        input.value = "";
        input.style.height = '38px';
        clearFileInput();
        updateSendButtonState();
        hideReplyPreview();

        // Track in chatState
        const abortController = new AbortController();
        chatState.activeChatUploads[conversationId] = {
            isUploading: true,
            totalProgress: 0,
            files: filesToUpload.map(f => ({ name: f.name, size: f.size, progress: 0, public_id: null, status: 'uploading' })),
            optimisticMessageId: tempId,
            abortController,
            listeners: []
        };

        const progressContainer = document.getElementById('chatUploadProgress');
        const progressBar = document.getElementById('chatProgressBar');
        const progressText = document.getElementById('chatProgressText');
        const progressCount = document.getElementById('chatProgressCount');
        const cancelBtn = document.getElementById('cancelChatUploadBtn');
        const attachBtn = document.getElementById('attachBtn');

        const updateUI = (state) => {
            const bubble = document.querySelector(`[data-message-id="${tempId}"]`);
            if (bubble) {
                state.files.forEach((f, idx) => {
                    const attEl = bubble.querySelectorAll('.chat-media-container, .chat-media-link')[idx];
                    if (!attEl) return;
                    const bar = attEl.querySelector('.upload-progress-bar');
                    if (bar) bar.style.width = f.progress + '%';
                    // Two-phase label: uploading % -> processing (bytes sent, waiting Cloudinary commit)
                    const label = (f.progress >= 100 && f.status !== 'done') ? 'Processing...' : f.progress + '%';
                    const smalls = attEl.querySelectorAll('small');
                    smalls.forEach(s => {
                        const t = s.textContent.trim();
                        if (/^(\d+)%$/.test(t) || t === 'Processing...') s.textContent = label;
                        else s.textContent = s.textContent.replace(/(\d+%|Processing\.\.\.)\s*$/, label);
                    });
                });
            }
            if (progressBar) progressBar.style.width = state.totalProgress + '%';

            // Input area: "Uploading X%" -> "Finishing..." once all bytes sent
            const allSent = state.files.every(f => f.progress >= 100);
            const allDone = state.files.every(f => f.status === 'done');
            if (progressText) progressText.textContent = allSent && !allDone ? 'Finishing...' : state.totalProgress + '%';
            if (progressCount) progressCount.textContent = `${state.files.filter(f => f.status === 'done').length}/${state.files.length}`;
        };

        chatState.activeChatUploads[conversationId].listeners.push(updateUI);
        if (progressContainer) progressContainer.classList.remove('d-none');
        if (cancelBtn) cancelBtn.classList.remove('d-none');
        if (attachBtn) attachBtn.disabled = true;

        if (cancelBtn) {
            cancelBtn.onclick = () => cancelChatUpload(conversationId, tempId);
        }

        try {
            const uploaded = await Promise.all(
                filesToUpload.map(file => uploadChatFileToCloudinary(file, conversationId, null, abortController.signal))
            );

            // THE MOMENT uploads resolved - cancel is now impossible (same as feed)
            const st = chatState.activeChatUploads[conversationId];
            if (st) st.isFinishing = true;
            if (cancelBtn) {
                cancelBtn.disabled = true;
                cancelBtn.style.opacity = '0.5';
                cancelBtn.style.pointerEvents = 'none';
            }

            const data = await saveChatMediaMessage(conversationId, uploaded, text, replyTo);

            if (data.success) {
                // Swap in place - no jump, order preserved, media gets signed URLs
                swapOptimisticWithReal(tempId, data.data, conversation.type);
                updateConversationInList(conversationId, data.data, true);
            } else throw new Error(data.message);

        } catch (err) {
            if (err.name === 'AbortError') return;
            if (err.message.includes('Blocked')) {
                toast.error('Blocked users cannot send messages');
            } else {
                console.error(err);
                toast.error('Upload failed', 1500);
            }
            removeMessageFromCache(conversationId, tempId);
            document.querySelector(`[data-message-id="${tempId}"]`)?.remove();
            const uploadedIds = chatState.activeChatUploads[conversationId]?.files.filter(f => f.public_id).map(f => f.public_id) || [];
            if (uploadedIds.length > 0) {
                await cleanupChatUploads(uploadedIds)
            }
        } finally {
            delete chatState.activeChatUploads[conversationId];
            if (progressContainer) progressContainer.classList.add('d-none');
            if (cancelBtn) cancelBtn.classList.add('d-none');
            if (attachBtn) attachBtn.disabled = false;
        }
        return;
    }

    // Text only - OPTIMISTIC (same pattern as media branch)
    const tempId = 'temp_' + Date.now();
    const optimisticMessage = {
        _id: tempId,
        conversationId,
        senderId: { _id: appState.user._id, name: appState.user.name, profileUrl: appState.user.profileUrl },
        text: text,
        attachments: [],
        createdAt: new Date().toISOString(),
        isOptimistic: true,
    };

    // 1. Append instantly + free the input for the next message
    addMessageToCache(conversationId, optimisticMessage);
    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (conversation) appendMessage(optimisticMessage, conversation.type, conversationId);
    scrollToBottom();

    input.value = "";
    input.style.height = '38px';
    updateSendButtonState();
    hideReplyPreview();
    emitTypingStop(conversationId);

    try {
        const data = await sendTextMessage(conversationId, text, replyTo);

        if (data.success) {
            // 2. Swap in place - real _id -> ticks work, no jump
            swapOptimisticWithReal(tempId, data.data, conversation.type);
            updateConversationInList(conversationId, data.data, true);
        } else {
            // 3. Backend rejected - remove from DOM + cache
            removeMessageFromCache(conversationId, tempId);
            document.querySelector(`[data-message-id="${tempId}"]`)?.remove();
            toast.error(data.message || "Failed to send");
        }
    } catch (error) {
        console.error("Failed to send:", error);
        removeMessageFromCache(conversationId, tempId);
        document.querySelector(`[data-message-id="${tempId}"]`)?.remove();
        toast.error("Failed to send message");
        // Give the text back so nothing is lost
        input.value = text;
        input.focus();
    }
}


// messages action handlers
function handleTouchStart(e) {
    const messageWrapper = e.target.closest('.message-bubble-wrapper');
    if (!messageWrapper) return;

    const messageId = messageWrapper.dataset.messageId;
    if (!messageId) return;

    // Track starting position
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    longPressTimer = setTimeout(() => {
        activeMessageId = messageId;
        showMobileActionSheet(messageId);

        // Simple haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, LONG_PRESS_DURATION);
}

function handleTouchEnd(e) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function handleTouchMove(e) {
    if (!longPressTimer) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // Only cancel if moved more than threshold
    if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

// Shared: copy message text to clipboard (used by dropdown + action sheet)
async function handleCopyMessage(messageId) {
    const cached = chatState.messagesCache[chatState.activeConversationId];
    const message = cached?.messages.find(m => m._id === messageId);
    if (!message?.text || !message.text.trim()) {
        toast.error('Nothing to copy');
        return;
    }
    try {
        await navigator.clipboard.writeText(message.text);
        toast.success('Copied', 1200);
    } catch {
        toast.error('Copy failed');
    }
}

// Save ONE message media attachment (index from the action button)
async function handleSaveMessageMedia(messageId, attIndex = 0) {
    const cached = chatState.messagesCache[chatState.activeConversationId];
    const message = cached?.messages.find(m => m._id === messageId);
    const mediaAtts = (message?.attachments || []).filter(a => a.type === 'image' || a.type === 'video');

    const att = mediaAtts[parseInt(attIndex, 10)];
    if (!att) {
        toast.error('Nothing to save');
        return;
    }

    toast.info('Saving...', 1000);
    try {
        const data = await getChatMediaUrl(att.public_id, att.resource_type, chatState.activeConversationId);
        if (!data?.mediaUrl) throw new Error('No media URL');

        const res = await fetch(data.mediaUrl);
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = att.originalName?.trim() || `${att.public_id.split('/').pop()}.${att.format || 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        toast.success('Saved', 1500);
    } catch (err) {
        console.error('Save failed:', att.public_id, err);
        toast.error('Failed to save');
    }
}

// SINGLE source of truth for message actions (desktop dropdown + mobile sheet)
function buildMessageActionButtons(isOwn, hasAttachments, hasText, mediaAtts, btnClass) {
    const copyBtn = hasText ? `<button class="${btnClass}" data-action="copy">
        <svg viewBox="0 0 16 16"><path d="M4 1.5A1.5 1.5 0 0 1 5.5 0h8A1.5 1.5 0 0 1 15 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 10.5v-9zm1.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8z"/><path d="M2 3.5A1.5 1.5 0 0 0 .5 5v8A1.5 1.5 0 0 0 2 14.5h8a1.5 1.5 0 0 0 1.5-1.5V12h-1v1a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h1v-1H2z"/></svg>
        <span>Copy</span>
    </button>` : '';

    // One Save button per image/video attachment (browsers block bulk auto-downloads)
    const shortName = (n) => (n && n.length > 22 ? n.slice(0, 20) + '…' : n) || 'media';
    const saveBtn = (mediaAtts || []).length === 1
        ? `<button class="${btnClass}" data-action="save" data-att-index="0">
            <svg viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
            <span>Save</span>
        </button>`
        : (mediaAtts || []).map((att, idx) => `<button class="${btnClass}" data-action="save" data-att-index="${idx}">
            <svg viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
            <span>Save · ${shortName(att.originalName)}</span>
        </button>`).join('');

    const editBtn = isOwn && !hasAttachments ? `<button class="${btnClass}" data-action="edit">
        <svg viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
        <span>Edit</span>
    </button>` : '';

    const deleteEveryoneBtn = isOwn ? `<button class="${btnClass} danger" data-action="delete-everyone">
        <svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        <span>Delete for everyone</span>
    </button>` : '';

    return `
        ${copyBtn}
        ${saveBtn}
        <button class="${btnClass}" data-action="reply">
            <svg viewBox="0 0 16 16"><path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.65a.5.5 0 0 0 .5.5H14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h6.5v-.517a.144.144 0 0 1 .098-.134z"/></svg>
            <span>Reply</span>
        </button>
        ${editBtn}
        <button class="${btnClass}" data-action="delete-me">
            <svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
            <span>Delete for me</span>
        </button>
        ${deleteEveryoneBtn}
    `;
}

// Shared action dispatch (used by dropdown + sheet - one place, never drifts)
async function dispatchMessageAction(action, messageId, attIndex) {
    if (action === 'copy') {
        await handleCopyMessage(messageId);
    } else if (action === 'save') {
        await handleSaveMessageMedia(messageId, attIndex);
    } else if (action === 'reply') {
        showReplyPreview(messageId);
    } else if (action === 'edit') {
        showEditMessage(messageId);
    } else if (action === 'delete-me') {
        await handleDeleteForMe(messageId);
    } else if (action === 'delete-everyone') {
        await handleDeleteForEveryone(messageId);
    }
}

function showMobileActionSheet(messageId) {
    closeMobileActionSheet(true);

    const cached = chatState.messagesCache[chatState.activeConversationId];
    if (!cached) return;

    const message = cached.messages.find(m => m._id === messageId);
    if (!message) return;

    const isOwn = message.senderId._id === appState.user._id;
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const hasText = !!(message.text && message.text.trim());
    const mediaAtts = (message.attachments || []).filter(a => a.type === 'image' || a.type === 'video');

    const overlay = document.createElement('div');
    overlay.className = 'mobile-action-sheet-overlay';
    overlay.onclick = closeMobileActionSheet;

    const sheet = document.createElement('div');
    sheet.className = 'mobile-action-sheet';
    sheet.innerHTML = `<div style="padding: 8px 0;">` + buildMessageActionButtons(isOwn, hasAttachments, hasText, mediaAtts, "mobile-action-item") + `</div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    requestAnimationFrame(() => {
        overlay.classList.add('active');
        sheet.classList.add('active');
    });

    sheet.querySelectorAll('.mobile-action-item').forEach(btn => {
        btn.onclick = async (e) => {
            const action = btn.dataset.action;
            closeMobileActionSheet();
            await dispatchMessageAction(action, messageId, btn.dataset.attIndex);
        };
    });
}

function closeMobileActionSheet(immediate = false) {
    const overlays = document.querySelectorAll('.mobile-action-sheet-overlay');
    const sheets = document.querySelectorAll('.mobile-action-sheet');

    if (immediate === true) {
        overlays.forEach(el => el.remove());
        sheets.forEach(el => el.remove());
    } else {
        overlays.forEach(overlay => overlay.classList.remove('active'));
        sheets.forEach(sheet => sheet.classList.remove('active'));

        if (overlays.length > 0 || sheets.length > 0) {
            setTimeout(() => {
                overlays.forEach(el => el.remove());
                sheets.forEach(el => el.remove());
            }, 300);
        }
    }

    activeMessageId = null;
}

function showActionDropdown(button, messageId) {
    closeActionDropdown();

    const cached = chatState.messagesCache[chatState.activeConversationId];
    if (!cached) return;

    const message = cached.messages.find(m => m._id === messageId);
    if (!message) return;

    const isOwn = message.senderId._id === appState.user._id;
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const hasText = !!(message.text && message.text.trim());
    const mediaAtts = (message.attachments || []).filter(a => a.type === 'image' || a.type === 'video');

    // Same shared builder as the mobile sheet - no duplicated markup
    const dropdown = document.createElement('div');
    dropdown.className = 'action-dropdown';
    dropdown.innerHTML = buildMessageActionButtons(isOwn, hasAttachments, hasText, mediaAtts, "action-dropdown-item");
    document.body.appendChild(dropdown);

    const buttonRect = button.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    let top = buttonRect.top;
    let left = buttonRect.right + 8;

    if (left + dropdownRect.width > window.innerWidth) {
        left = buttonRect.left - dropdownRect.width - 8;
    }
    if (top + dropdownRect.height > window.innerHeight) {
        top = window.innerHeight - dropdownRect.height - 8;
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;

    requestAnimationFrame(() => {
        dropdown.classList.add('active');
    });

    activeDropdown = dropdown;

    dropdown.querySelectorAll('.action-dropdown-item').forEach(btn => {
        btn.onclick = async (e) => {
            const action = btn.dataset.action;
            closeActionDropdown();
            await dispatchMessageAction(action, messageId, btn.dataset.attIndex);
        };
    });
}

function closeActionDropdown() {
    if (activeDropdown) {
        activeDropdown.classList.remove('active');
        setTimeout(() => {
            if (activeDropdown) {
                activeDropdown.remove();
                activeDropdown = null;
            }
        }, 200);
    }
}


// Show edit input for message
function showEditMessage(messageId) {
    const cached = chatState.messagesCache[chatState.activeConversationId];
    if (!cached) return;

    const message = cached.messages.find(m => m._id === messageId);
    if (!message) return;

    const messageWrapper = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageWrapper) return;

    const bubble = messageWrapper.querySelector(".message-bubble");
    if (!bubble) return;

    bubble.dataset.originalHtml = bubble.innerHTML;
    bubble.dataset.editingId = messageId;
    bubble.innerHTML = `
        <div class="edit-message-container">
            <textarea class="edit-message-input form-control mb-2" rows="2">${escapeHtml(message.text)}</textarea>
            <div class="d-flex gap-2 justify-content-end">
                <button class="cancel-edit-btn btn btn-sm btn-light">Cancel</button>
                <button class="save-edit-btn btn btn-sm btn-primary">Save</button>
            </div>
        </div>
    `;

    const input = bubble.querySelector(".edit-message-input");
    if (input) {
        input.focus();
        input.select();
        input.addEventListener("keydown", async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await handleSaveEdit();
            } else if (e.key === "Escape") {
                hideEditMessage();
            }
        });
    }
}

function hideEditMessage() {
    const editingBubble = document.querySelector(".message-bubble[data-editing-id]");
    if (!editingBubble) return;

    const originalHtml = editingBubble.dataset.originalHtml;
    if (originalHtml) {
        editingBubble.innerHTML = originalHtml;
    }

    delete editingBubble.dataset.originalHtml;
    delete editingBubble.dataset.editingId;
}

// Save edited message with targeted DOM update
async function handleSaveEdit() {
    const editingBubble = document.querySelector(".message-bubble[data-editing-id]");
    if (!editingBubble) return;

    const messageId = editingBubble.dataset.editingId;
    const input = editingBubble.querySelector(".edit-message-input");
    if (!input) return;

    const newText = input.value.trim();
    if (!newText) {
        toast.error("Message cannot be empty");
        return;
    }

    if (newText.length > 5000) {
        toast.error("Message too long (max 5000 characters)");
        return;
    }

    const conversationId = chatState.activeConversationId;

    try {
        const data = await editMessage(messageId, newText);
        if (data.success) {
            updateMessageInCache(conversationId, messageId, {
                text: newText,
                editedAt: data.message.editedAt
            });
            hideEditMessage();
            updateMessageInDOM(messageId, { text: newText, editedAt: data.message.editedAt }, conversationId);
            toast.success("Message edited", 1000);
        } else {
            toast.error(data.message || "Failed to edit message");
            hideEditMessage();
        }
    } catch (error) {
        console.error("Failed to edit message:", error);
        toast.error("Failed to edit message");
        hideEditMessage();
    }
}

// Delete message for current user only
async function handleDeleteForMe(messageId) {
    if (!confirm("Delete this message for you?")) return;

    try {
        const data = await deleteForMe(messageId);
        if (data.success) {
            removeMessageFromCache(chatState.activeConversationId, messageId);
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) messageEl.remove();
            toast.success("Message deleted");
        } else {
            toast.error(data.message || "Failed to delete message");
        }
    } catch (error) {
        console.error("Failed to delete message:", error);
        toast.error("Failed to delete message");
    }
}

// Delete message for all participants
async function handleDeleteForEveryone(messageId) {
    if (!confirm("Delete this message for everyone? This cannot be undone.")) return;

    const conversationId = chatState.activeConversationId;

    try {
        const data = await deleteForEveryone(messageId);

        if (data.success) {
            const deletedAt = data.deletedForEveryoneAt;
            const cacheUpdated = updateMessageInCache(conversationId, messageId, {
                deletedForEveryoneAt: deletedAt,
                text: '',
                attachments: []
            });

            updateMessageInDOM(messageId, { deletedForEveryoneAt: deletedAt }, conversationId);

            toast.success("Message deleted for everyone");
        } else {
            toast.error(data.message || "Failed to delete message");
        }
    } catch (error) {
        console.error("Failed to delete message:", error);
        toast.error("Failed to delete message");
    }
}

function appendMessage(message, conversationType, conversationId) {
    const messagesList = document.getElementById("messagesList");
    if (!messagesList) return;

    const emptyState = messagesList.querySelector(".chat-empty-messages");
    if (emptyState) emptyState.remove();

    const autoScroll = shouldAutoScroll();
    const messageHtml = MessageBubble(message, conversationType, conversationId);
    messagesList.insertAdjacentHTML("beforeend", messageHtml);
    if (autoScroll) scrollToBottom();
    initializeMediaElements(conversationId);
}

// Update specific message in DOM without full re-render
function updateMessageInDOM(messageId, updates, conversationId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    if (updates.deletedForEveryoneAt !== undefined) {
        const conversation = chatState.conversations.find(c => c._id === chatState.activeConversationId);
        if (conversation) {
            const cached = chatState.messagesCache[chatState.activeConversationId];
            const message = cached?.messages.find(m => m._id === messageId);
            if (message) {
                messageEl.outerHTML = MessageBubble(message, conversation.type, conversationId);
            }
        }
        return;
    }

    if (updates.text !== undefined) {
        const textEl = messageEl.querySelector(".message-text");
        if (textEl) {
            textEl.textContent = updates.text;
        }
    }

    if (updates.editedAt !== undefined) {
        const timeContainer = messageEl.querySelector(".d-flex.align-items-center.justify-content-end");
        if (timeContainer && !timeContainer.querySelector(".message-edited")) {
            const bubble = messageEl.querySelector(".message-bubble");
            const isOwn = bubble && bubble.classList.contains("message-bubble-own");
            const editedClass = isOwn ? "message-edited message-edited-own" : "message-edited";
            const editedHtml = `<small class="${editedClass}">edited</small>`;
            timeContainer.insertAdjacentHTML("afterbegin", editedHtml);
        }
    }
}

// Update message tick status without re-render
function updateMessageTick(messageId, status) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    const bubbleContainer = messageEl.querySelector(".message-bubble-container");
    if (!bubbleContainer) return;

    const existingTick = bubbleContainer.querySelector(".message-tick");
    if (existingTick) existingTick.remove();

    let tickHtml = "";
    if (status === "read") {
        tickHtml = `<div class="message-tick"><svg width="16" height="11" fill="#53bdeb" viewBox="0 0 16 11"><path d="M8.97.653a.5.5 0 0 0-.478.316L4.82 9.973 1.936 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/><path d="M12.97.653a.5.5 0 0 0-.478.316L8.82 9.973 7.436 8.89a.5.5 0 1 0-.59.793l2 1.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    } else if (status === "delivered") {
        tickHtml = `<div class="message-tick"><svg width="16" height="11" fill="#4a4a4a" viewBox="0 0 16 11"><path d="M8.97.653a.5.5 0 0 0-.478.316L4.82 9.973 1.936 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/><path d="M12.97.653a.5.5 0 0 0-.478.316L8.82 9.973 7.436 8.89a.5.5 0 1 0-.59.793l2 1.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    } else if (status === "sent") {
        tickHtml = `<div class="message-tick"><svg width="12" height="11" fill="#4a4a4a" viewBox="0 0 16 11"><path d="M11.071.653a.5.5 0 0 0-.478.316L6.92 9.973 4.036 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    }

    if (tickHtml) {
        bubbleContainer.insertAdjacentHTML("beforeend", tickHtml);
    }
}

// Update online status indicator in chat header
function updateChatHeaderOnlineStatus() {
    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;

    const conv = chatState.conversations.find(c => c._id === conversationId);
    if (!conv || conv.type !== "direct") return;

    const otherParticipant = conv.participants.find(p => p.userId._id !== appState.user._id);
    if (!otherParticipant) return;

    const isOnline = chatState.onlineUsers.has(otherParticipant.userId._id);
    const onlineDot = document.querySelector(".chat-header-online-dot");

    if (isOnline) {
        if (!onlineDot) {
            const avatarContainer = document.querySelector(".chat-header .position-relative");
            if (avatarContainer) {
                avatarContainer.insertAdjacentHTML("beforeend",
                    `<span class="chat-header-online-dot position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"></span>`
                );
            }
        }
    } else {
        if (onlineDot) onlineDot.remove();
    }

    const subtitle = document.getElementById("chatSubtitle");
    if (subtitle && conv.type === "direct") {
        subtitle.textContent = isOnline ? "Online" : (otherParticipant.userId.job || "");
    }
}


function updateSendButtonState() {
    const input = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const fileInput = document.getElementById("fileInput");
    if (!input || !sendBtn) return;

    const hasText = input.value.trim().length > 0;
    const hasFiles = fileInput && fileInput.files && fileInput.files.length > 0;
    sendBtn.disabled = !hasText && !hasFiles;
}

function updateActiveListItem(conversationId) {
    document.querySelectorAll(".chat-list-item.active").forEach(item => {
        item.classList.remove("active");
    });

    const activeItem = document.querySelector(`.chat-list-item[data-conversation-id="${conversationId}"]`);
    if (activeItem) {
        activeItem.classList.add("active");
    }
}

function showReplyPreview(messageId) {
    const cached = chatState.messagesCache[chatState.activeConversationId];
    if (!cached) return;

    const message = cached.messages.find(m => m._id === messageId);
    if (!message) return;

    const preview = document.getElementById("replyPreview");
    const nameEl = document.getElementById("replyName");
    const textEl = document.getElementById("replyText");
    if (!preview || !nameEl || !textEl) return;

    preview.dataset.messageId = messageId;
    nameEl.textContent = message.senderId.name || "Unknown";
    textEl.textContent = message.text || (message.attachments?.length > 0 ? "📎 Attachment" : "");
    preview.classList.remove("d-none");

    const input = document.getElementById("messageInput");
    if (input) input.focus();
}

function hideReplyPreview() {
    const preview = document.getElementById("replyPreview");
    if (preview) {
        preview.classList.add("d-none");
        delete preview.dataset.messageId;
    }
}

// Update conversation in list with optional move to top
export function updateConversationInList(conversationId, lastMessage = null, moveToTop = true) {
    const convIndex = chatState.conversations.findIndex(c => c._id === conversationId);
    if (convIndex === -1) {
        console.warn(`Conversation ${conversationId} not found in list`);
        return;
    }

    if (lastMessage) {
        chatState.conversations[convIndex].lastMessage = lastMessage;
        chatState.conversations[convIndex].lastMessageAt = lastMessage.createdAt;
    }

    let conv;
    if (moveToTop) {
        [conv] = chatState.conversations.splice(convIndex, 1);
        chatState.conversations.unshift(conv);
    } else {
        conv = chatState.conversations[convIndex];
    }

    if (isSearchActive && currentSearchQuery) {
        performConversationSearch(currentSearchQuery);
        return;
    }

    const listContainer = document.getElementById("chatListContainer");
    if (!listContainer) return;

    const currentUserId = appState.user._id;
    const existingItem = listContainer.querySelector(`[data-conversation-id="${conversationId}"]`);

    if (existingItem) {
        const newItemHtml = ChatListItem(conv, currentUserId);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = newItemHtml;
        const newItem = tempDiv.firstElementChild;
        existingItem.replaceWith(newItem);

        if (moveToTop && listContainer.firstChild !== newItem) {
            listContainer.insertBefore(newItem, listContainer.firstChild);
        }
    } else {
        const newItemHtml = ChatListItem(conv, currentUserId);
        listContainer.insertAdjacentHTML("afterbegin", newItemHtml);
    }
}


function updateTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    if (!typingIndicator) return;

    const conversationId = chatState.activeConversationId;
    if (!conversationId) { typingIndicator.innerHTML = ""; return; }

    const conv = chatState.conversations.find(c => c._id === conversationId);
    if (!conv) { typingIndicator.innerHTML = ""; return; }

    typingIndicator.innerHTML = TypingIndicatorHTML(conv);
}

function updateConversationListOnlineStatus(userId, isOnline) {
    document.querySelectorAll(".chat-list-item").forEach(item => {
        const onlineDot = item.querySelector(".chat-list-item-online-dot");
        if (!onlineDot) return;

        const convId = item.dataset.conversationId;
        const conv = chatState.conversations.find(c => c._id === convId);
        if (!conv || conv.type !== "direct") return;

        const otherParticipant = conv.participants.find(
            p => p.userId._id !== appState.user._id
        );

        if (otherParticipant?.userId?._id === userId) {
            if (isOnline) {
                onlineDot.classList.add("online");
            } else {
                onlineDot.classList.remove("online");
            }
        }
    });
}

function renderConversationList() {
    const listContainer = document.getElementById("chatListContainer");
    if (!listContainer) return;

    const currentUserId = appState.user._id;

    if (chatState.conversations.length === 0) {
        listContainer.innerHTML = `
            <div class="chat-list-empty text-center text-muted p-4">
                <p class="mb-0">No conversations yet</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = chatState.conversations
            .map(conv => ChatListItem(conv, currentUserId))
            .join("");
    }
}

// Handle file selection with validation and append mode
function handleFileSelection(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    const fileInput = document.getElementById("fileInput");

    for (const file of newFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(`File type not allowed: ${file.name}`);
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File too large: ${file.name} (max 9MB)`);
            return;
        }

        const isDuplicate = selectedFiles.some(
            f => f.name === file.name && f.size === file.size
        );

        if (isDuplicate) {
            toast.error(`File already selected: ${file.name}`);
            return;
        }
    }

    const totalFiles = selectedFiles.length + newFiles.length;
    if (totalFiles > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed (currently ${selectedFiles.length})`);
        return;
    }

    const currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    const newFilesSize = Array.from(newFiles).reduce((sum, f) => sum + f.size, 0);
    const totalSize = currentTotalSize + newFilesSize;

    if (totalSize > MAX_TOTAL_SIZE) {
        toast.error(`Total file size exceeds 25MB limit`);
        return;
    }

    selectedFiles = [...selectedFiles, ...Array.from(newFiles)];

    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;

    showFilePreview(selectedFiles);
    updateSendButtonState();
}

// Show file preview with thumbnails
function showFilePreview(files) {
    const previewContainer = document.getElementById("filePreview");
    if (!previewContainer) return;

    previewContainer.innerHTML = "";

    if (files.length === 0) {
        previewContainer.classList.add("d-none");
        return;
    }

    previewContainer.classList.remove("d-none");

    files.forEach((file, index) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        const previewItem = document.createElement("div");
        previewItem.className = "file-preview-item";
        previewItem.dataset.fileIndex = index;

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${escapeHtml(file.name)}">
                    <div class="flex-grow-1 min-width-0">
                        <div class="text-truncate">${escapeHtml(file.name)}</div>
                        <small class="text-muted">${formatFileSize(file.size)}</small>
                    </div>
                    <button class="remove-file" data-index="${index}">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </button>
                `;
            };
            reader.readAsDataURL(file);
        } else if (isVideo) {
            previewItem.innerHTML = `
                <div style="width: 32px; height: 32px; background: #000; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                    </svg>
                </div>
                <div class="flex-grow-1 min-width-0">
                    <div class="text-truncate">${escapeHtml(file.name)}</div>
                    <small class="text-muted">${formatFileSize(file.size)}</small>
                </div>
                <button class="remove-file" data-index="${index}">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            `;
        } else {
            // File - icon by extension
            const ext = file.name.split('.').pop().toLowerCase();
            const fileIcon = getFileIcon(ext);
            previewItem.innerHTML = `
                <div class="chat-file-icon" style="width:32px;height:32px;background:${fileIcon.bg};border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${ext.toUpperCase()}</div>
                <div class="flex-grow-1 min-width-0">
                <div class="text-truncate">${escapeHtml(file.name)}</div>
                <small class="text-muted">${formatFileSize(file.size)}</small>
                </div>
                <button class="remove-file" data-index="${index}">✕</button>
            `;
        }

        previewContainer.appendChild(previewItem);
    });

    previewContainer.querySelectorAll(".remove-file").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFile(parseInt(btn.dataset.index));
        });
    });
}

function removeFile(index) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);

    const fileInput = document.getElementById("fileInput");
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;

    if (selectedFiles.length === 0) {
        clearFilePreview();
    } else {
        showFilePreview(selectedFiles);
    }

    updateSendButtonState();
}

function clearFileInput() {
    selectedFiles = [];
    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
    clearFilePreview();
    updateSendButtonState();
}

function clearFilePreview() {
    const previewContainer = document.getElementById("filePreview");
    if (previewContainer) {
        previewContainer.innerHTML = "";
        previewContainer.classList.add("d-none");
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}


function toggleGroupInfoPanel() {
    const existing = document.querySelector(".group-info-panel");
    if (existing) {
        closeGroupInfoPanel();
        return;
    }

    const conversationId = chatState.activeConversationId;
    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const chatWindowPanel = document.getElementById("chatWindowPanel");
    if (!chatWindowPanel) return;

    const panelHtml = GroupInfoPanel(conversation);
    chatWindowPanel.insertAdjacentHTML("beforeend", panelHtml);

    // Trigger animation after insert
    requestAnimationFrame(() => {
        const backdrop = document.getElementById("groupInfoBackdrop");
        const panel = document.getElementById("groupInfoPanel");
        if (backdrop) backdrop.classList.add("active");
        if (panel) panel.classList.add("active");
    });
}

function closeGroupInfoPanel() {
    const backdrop = document.getElementById("groupInfoBackdrop");
    const panel = document.getElementById("groupInfoPanel");

    if (backdrop) backdrop.classList.remove("active");
    if (panel) panel.classList.remove("active");

    // Remove after animation completes
    setTimeout(() => {
        if (backdrop) backdrop.remove();
        if (panel) panel.remove();
    }, 300);
}

async function handleLeaveGroup() {
    if (!confirm("Are you sure you want to leave this group?")) return;

    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;

    try {
        const data = await leaveGroup(conversationId);
        if (data.success) {
            chatState.conversations = chatState.conversations.filter(c => c._id !== conversationId);
            clearActiveConversation();
            leaveConversation(conversationId);
            renderChatWindow();
            renderConversationList();
            toast.success("Left group successfully");
        } else {
            toast.error(data.message || "Failed to leave group");
        }
    } catch (error) {
        console.error("Failed to leave group:", error);
        toast.error("Failed to leave group");
    }
}

async function openNewChatModal() {
    const chatListPanel = document.getElementById("chatListPanel");
    if (!chatListPanel) return;

    const existingModal = document.getElementById("newChatOverlay");
    if (existingModal) existingModal.remove();

    // Reset selection state, but keep the followingUsers cache intact!
    groupCreationState.view = 'list';
    groupCreationState.selectedParticipants = [];

    // 1. FAST PATH: If suggestions are already cached in memory, open instantly
    if (groupCreationState.followingUsers.length > 0) {
        chatListPanel.insertAdjacentHTML("beforeend", NewChatModal(groupCreationState.followingUsers, 'list'));
        requestAnimationFrame(() => {
            document.getElementById("newChatSearchInput")?.focus();
        });
        return;
    }

    // 2. SLOW PATH: First time only, show loader shell and fetch once
    chatListPanel.insertAdjacentHTML("beforeend", `
        <div class="new-chat-overlay" id="newChatOverlay">
          <div class="new-chat-modal">
            <div class="d-flex align-items-center justify-content-center p-5">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span class="ms-2">Loading suggestions...</span>
            </div>
          </div>
        </div>
    `);

    try {
        const data = await searchFollowing("");
        if (data.success) {
            // Store permanently in your existing state array
            groupCreationState.followingUsers = data.following || [];

            const overlay = document.getElementById("newChatOverlay");
            if (overlay) {
                overlay.outerHTML = NewChatModal(groupCreationState.followingUsers, 'list');
            }
        } else {
            toast.error(data.message || "Failed to load suggestions");
            closeNewChatModal();
        }
    } catch (error) {
        console.error("Failed to load following:", error);
        toast.error("Failed to load suggestions");
        closeNewChatModal();
    }
}

function closeNewChatModal() {
    const overlay = document.getElementById("newChatOverlay");
    if (overlay) overlay.remove();
}

// Create or open conversation with selected user
async function handleSelectNewChatUser(userId) {
    if (!userId) return;

    try {
        const data = await createOrOpenDirect(userId);
        if (data.success && data.conversation) {
            closeNewChatModal();

            const exists = chatState.conversations.find(c => c._id === data.conversation._id);
            if (!exists) {
                chatState.conversations.unshift(data.conversation);
            }

            const listContainer = document.getElementById("chatListContainer");
            if (listContainer) {
                import("../components/chat/ChatListItem.js").then(({ ChatListItem }) => {
                    const currentUserId = appState.user._id;
                    listContainer.innerHTML = chatState.conversations
                        .map(conv => ChatListItem(conv, currentUserId))
                        .join("");
                });
            }

            await openConversation(data.conversation._id);
        } else {
            toast.error(data.message || "Failed to start conversation");
        }
    } catch (error) {
        console.error("Failed to create conversation:", error);
        toast.error("Failed to start conversation");
    }
}

/**
 * Unified Search logic reusing your existing groupCreationState.followingUsers
 */
async function handleUserSearch(query, mode, cursor = null) {
    const isList = mode === 'list';
    const container = document.getElementById(isList ? "newChatUserList" : "groupParticipantList");
    if (!container) return;

    const trimmed = query.trim();

    // 1. CLEAR ACTION: Instantly restore suggestions from the in-memory array (0 DB hits!)
    if (!trimmed) {
        if (newChatSearchAbortController) newChatSearchAbortController.abort();

        const suggestions = groupCreationState.followingUsers; // Reusing your variable!
        container.innerHTML = "";

        if (isList) {
            container.innerHTML = `
                <div class="new-group-trigger-btn d-flex align-items-center p-3 border-bottom" style="cursor: pointer; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);">
                    <div class="new-group-icon rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                            <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
                        </svg>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="fw-semibold mb-0" style="font-size: 0.95rem; color: #1c1e21;">New Group</h6>
                        <small class="text-muted" style="font-size: 0.8rem;">Create a group conversation</small>
                    </div>
                    <svg width="18" height="18" fill="#65676b" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </div>
            ` + renderUserListHTML(suggestions, 'list');
        } else {
            container.innerHTML = renderUserListHTML(suggestions, 'groupSelect');
        }
        return;
    }

    // 2. Setup loader and abort controller for network search
    if (!cursor) {
        if (newChatSearchAbortController) newChatSearchAbortController.abort();
        newChatSearchAbortController = new AbortController();
        container.innerHTML = `
            <div class="d-flex align-items-center justify-content-center p-4">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2 text-muted">Searching database...</span>
            </div>
        `;
    }

    try {
        const data = await searchUsersForChat(trimmed, cursor || {}, newChatSearchAbortController?.signal);

        if (!cursor) container.innerHTML = ""; // Clear loader
        document.getElementById("searchLoadMoreWrapper")?.remove(); // Remove old pagination button

        if (data.success && data.users) {
            // For group selection, merge newly found DB users into our working array state so toggles don't break
            if (!isList) {
                data.users.forEach(u => {
                    if (!groupCreationState.followingUsers.some(f => f._id === u._id)) {
                        groupCreationState.followingUsers.push(u);
                    }
                });
            }

            container.insertAdjacentHTML("beforeend", renderUserListHTML(data.users, mode));

            if (data.hasMore) {
                const last = data.users[data.users.length - 1];
                container.insertAdjacentHTML("beforeend", `
                    <div class="text-center py-3" id="searchLoadMoreWrapper">
                        <button class="btn btn-sm btn-outline-primary rounded-pill load-more-search-btn"
                                data-query="${escapeHtml(trimmed)}"
                                data-created-at="${last.createdAt}"
                                data-id="${last._id}"
                                data-mode="${mode}">
                            Load More
                        </button>
                    </div>
                `);
            }
        } else {
            if (!cursor) {
                container.innerHTML = `<div class="text-center text-muted p-4"><p class="mb-0">No users found for "${escapeHtml(trimmed)}"</p></div>`;
            }
        }
    } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Search failed:", err);
        if (!cursor) {
            container.innerHTML = `<div class="text-center text-muted p-4"><p class="mb-0">Search failed</p></div>`;
        }
    }
}

function filterNewChatUsers(query) {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleUserSearch(query, 'list'), 300);
}

function filterGroupParticipants(query) {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleUserSearch(query, 'groupSelect'), 300);
}

function renderUserListHTML(users, mode) {
    if (!users || users.length === 0) {
        return `<div class="text-center text-muted p-4"><p class="mb-0" style="font-size: 0.9rem;">No people found</p></div>`;
    }
    const selectedIds = new Set(groupCreationState.selectedParticipants.map(p => p._id));

    return users.map(user => {
        if (mode === 'list') {
            return `
                <div class="new-chat-user-item d-flex align-items-center p-3" data-user-id="${user._id}" data-user-name="${escapeHtml(user.name)}">
                    <div class="position-relative me-3 flex-shrink-0">
                        <img src="${user.profileUrl || 'profiles/default-profile.png'}" class="rounded-circle" width="44" height="44" style="object-fit: cover;" onerror="this.onerror=null; this.src='profiles/default-profile.png'">
                    </div>
                    <div class="flex-grow-1 min-width-0">
                        <h6 class="fw-semibold mb-0 text-truncate" style="font-size: 0.9rem; color: #1c1e21;">${escapeHtml(user.name)}</h6>
                        <small class="text-muted text-truncate d-block" style="font-size: 0.8rem;">${escapeHtml(user.job || '')}</small>
                    </div>
                    <button class="btn btn-sm btn-primary rounded-pill new-chat-select-btn px-3">Message</button>
                </div>`;
        } else {
            const isSelected = selectedIds.has(user._id);
            return `
                <div class="group-participant-item d-flex align-items-center p-3 ${isSelected ? 'selected' : ''}" data-user-id="${user._id}" data-user-name="${escapeHtml(user.name)}" data-user-profile="${escapeHtml(user.profileUrl || 'profiles/default-profile.png')}" data-user-job="${escapeHtml(user.job || '')}">
                    <div class="form-check me-3">
                        <input class="form-check-input participant-checkbox" type="checkbox" ${isSelected ? 'checked' : ''} data-user-id="${user._id}">
                    </div>
                    <div class="position-relative me-3 flex-shrink-0">
                        <img src="${user.profileUrl || 'profiles/default-profile.png'}" class="rounded-circle" width="44" height="44" style="object-fit: cover;" onerror="this.onerror=null; this.src='profiles/default-profile.png'">
                    </div>
                    <div class="flex-grow-1 min-width-0">
                        <h6 class="fw-semibold mb-0 text-truncate" style="font-size: 0.9rem; color: #1c1e21;">${escapeHtml(user.name)}</h6>
                        <small class="text-muted text-truncate d-block" style="font-size: 0.8rem;">${escapeHtml(user.job || '')}</small>
                    </div>
                </div>`;
        }
    }).join("");
}

// coversations search inline

/**
 * Filter conversations as user types
 */
function filterConversations(query) {
    if (conversationSearchTimeout) {
        clearTimeout(conversationSearchTimeout);
    }

    // Track search state
    currentSearchQuery = query.trim();
    isSearchActive = currentSearchQuery.length > 0;

    const clearBtn = document.querySelector(".chat-search-clear");

    if (clearBtn) {
        if (query.length > 0) {
            clearBtn.classList.add("show");
        } else {
            clearBtn.classList.remove("show");
        }
    }

    conversationSearchTimeout = setTimeout(() => {
        performConversationSearch(query.trim());
    }, 150); // Fast response for inline search
}

/**
 * Perform conversation filtering
 */
function performConversationSearch(query) {
    const listContainer = document.getElementById("chatListContainer");
    if (!listContainer) return;

    const currentUserId = appState.user._id;

    if (!query) {
        // Show all conversations when search is empty
        renderAllConversations(listContainer, currentUserId);
        return;
    }

    // Filter conversations
    const filteredConversations = chatState.conversations.filter(conv => {
        return searchMatches(conv, query.toLowerCase(), currentUserId);
    });

    // Render filtered results
    // Replace the "No conversations found" section with:
    if (filteredConversations.length === 0) {
        listContainer.innerHTML = `
        <div class="chat-list-empty text-center text-muted p-4">
            <svg width="48" height="48" fill="currentColor" viewBox="0 0 16 16" class="mb-2 opacity-50">
                <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
                <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
            </svg>
            <p class="mb-1">No conversations found</p>
            <small class="text-muted">Search by name, job, or last message</small>
        </div>
    `;
    } else {
        listContainer.innerHTML = filteredConversations
            .map(conv => ChatListItem(conv, currentUserId))
            .join("");
    }
}

/**
 * Check if conversation matches search query
 */
function searchMatches(conversation, query, currentUserId) {
    // Search conversation name/participant names
    if (conversation.type === "direct") {
        const otherParticipant = conversation.participants.find(
            p => p.userId._id !== currentUserId
        );
        const name = otherParticipant?.userId?.name || "";
        if (name.toLowerCase().includes(query)) return true;

        // Search participant job/title
        const job = otherParticipant?.userId?.job || "";
        if (job.toLowerCase().includes(query)) return true;
    } else {
        // Group name
        const groupName = conversation.name || "";
        if (groupName.toLowerCase().includes(query)) return true;

        // Group member names
        const memberMatch = conversation.participants.some(p => {
            const memberName = p.userId?.name || "";
            return memberName.toLowerCase().includes(query);
        });
        if (memberMatch) return true;
    }

    // Search last message content
    const lastMsg = conversation.lastMessage;
    if (lastMsg && !lastMsg.deletedForEveryoneAt) {
        const messageText = lastMsg.text || "";
        if (messageText.toLowerCase().includes(query)) return true;

        // Search sender name of last message
        const senderName = lastMsg.senderId?.name || "";
        if (senderName.toLowerCase().includes(query)) return true;
    }

    return false;
}

/**
 * Render all conversations (clear search)
 */
function renderAllConversations(listContainer, currentUserId) {
    // If search is active, re-apply search instead of showing all
    if (isSearchActive && currentSearchQuery) {
        performConversationSearch(currentSearchQuery);
        return;
    }

    if (chatState.conversations.length === 0) {
        listContainer.innerHTML = `
            <div class="chat-list-empty text-center text-muted p-4">
                <p class="mb-0">No conversations yet</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = chatState.conversations
            .map(conv => ChatListItem(conv, currentUserId))
            .join("");
    }
}


// Message search handling

function showMessageSearch() {
    const conversation = chatState.conversations.find(c => c._id === chatState.activeConversationId);
    if (!conversation) return;

    const chatWindow = document.getElementById("chatWindowPanel");
    if (!chatWindow) return;

    // Improved search bar with results below
    const searchBarHtml = `
        <div class="message-search-bar border-bottom bg-white" id="messageSearchBar">
            <!-- Search Controls - Slimmer -->
            <div class="d-flex align-items-center gap-2 px-3 py-2 border-bottom border-light">
                <button class="close-message-search btn btn-sm btn-light rounded-circle p-0 flex-shrink-0" style="width: 28px; height: 28px;">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
                <div class="position-relative flex-grow-1">
                    <svg class="position-absolute top-50 start-0 translate-middle-y ms-2" width="12" height="12" fill="#65676b" viewBox="0 0 16 16">
                        <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
                        <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
                    </svg>
                    <input type="text"
                        class="form-control form-control-sm ps-4 py-1"
                        id="messageSearchInput"
                        placeholder="Search messages..."
                        style="font-size: 14px; height: 32px;"
                        >
                </div>
                <div class="search-navigation flex-shrink-0">
                    <button class="search-prev-match btn btn-sm btn-outline-secondary rounded-circle p-0 me-1" style="width: 28px; height: 28px;" disabled>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                        </svg>
                    </button>
                    <button class="search-next-match btn btn-sm btn-outline-secondary rounded-circle p-0" style="width: 28px; height: 28px;" disabled>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L10.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Slim Results -->
            <div class="search-results-container bg-light px-2 py-1" id="searchResultsContainer" style="display: none;">
                <div class="search-results-info" id="searchResultsInfo"></div>
            </div>
        </div>
    `;

    // Find chat header and insert search bar after it
    const chatHeader = chatWindow.querySelector(".chat-header");
    if (chatHeader) {
        chatHeader.insertAdjacentHTML("afterend", searchBarHtml);
    }
}

/**
 * Hide message search bar and cleanup
 */
function hideMessageSearch() {
    // Clear highlights
    clearSearchHighlights();

    // Remove search bar
    const searchBar = document.getElementById("messageSearchBar");
    if (searchBar) {
        searchBar.remove();
    }

    // Reset search state
    messageSearchMatches = [];
    currentMatchIndex = -1;
    messageSearchQuery = "";
}

/**
 * Perform message search in cached messages
 */
function performMessageSearch(query) {
    const trimmedQuery = query.trim();
    messageSearchQuery = trimmedQuery;

    // Clear previous highlights
    clearSearchHighlights();
    messageSearchMatches = [];
    currentMatchIndex = -1;

    const resultsInfo = document.getElementById("searchResultsInfo");
    const resultsContainer = document.getElementById("searchResultsContainer");
    const prevBtn = document.querySelector(".search-prev-match");
    const nextBtn = document.querySelector(".search-next-match");

    if (!trimmedQuery) {
        resultsContainer.style.display = "none";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const conversationId = chatState.activeConversationId;
    const cached = chatState.messagesCache[conversationId];

    if (!cached || !cached.messages) {
        resultsContainer.style.display = "block";
        resultsInfo.innerHTML = `
            <div class="alert alert-info py-2 mb-0">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
                <strong>No messages to search</strong>
            </div>
        `;
        return;
    }

    // Search through messages
    const matches = [];
    const queryLower = trimmedQuery.toLowerCase();

    cached.messages.forEach((message, index) => {
        if (message.deletedForEveryoneAt) return;
        if (!message.text) return;

        if (message.text.toLowerCase().includes(queryLower)) {
            matches.push({
                messageId: message._id,
                messageIndex: index,
                text: message.text
            });
        }
    });

    messageSearchMatches = matches;
    resultsContainer.style.display = "block";

    if (matches.length === 0) {
        resultsInfo.innerHTML = `
            <div class="alert alert-warning py-1 px-2 mb-0 small">
                <strong>No results</strong> • <span class="text-muted">Scroll up to load older messages</span>
            </div>
        `;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    // Highlight all matches
    highlightSearchMatches(queryLower);

    // Navigate to first match
    currentMatchIndex = 0;
    updateSearchNavigation();
    scrollToMatch(0);
}

function highlightSearchMatches(query) {
    const messagesList = document.getElementById("messagesList");
    if (!messagesList) return;

    messageSearchMatches.forEach((match, index) => {
        const messageElement = messagesList.querySelector(`[data-message-id="${match.messageId}"]`);
        if (!messageElement) return;

        const textElement = messageElement.querySelector(".message-text");
        if (!textElement) return;

        const originalText = match.text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        const highlightedText = originalText.replace(regex,
            `<span class="search-highlight" data-match-index="${index}">$1</span>`
        );

        textElement.innerHTML = highlightedText;
    });
}

function clearSearchHighlights() {
    const highlights = document.querySelectorAll(".search-highlight");
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}


function navigateSearchMatch(direction) {
    if (messageSearchMatches.length === 0) return;

    if (direction === "next") {
        currentMatchIndex = (currentMatchIndex + 1) % messageSearchMatches.length;
    } else {
        currentMatchIndex = currentMatchIndex <= 0
            ? messageSearchMatches.length - 1
            : currentMatchIndex - 1;
    }

    updateSearchNavigation();
    scrollToMatch(currentMatchIndex);
}


function updateSearchNavigation() {
    const resultsInfo = document.getElementById("searchResultsInfo");
    const resultsContainer = document.getElementById("searchResultsContainer");
    const prevBtn = document.querySelector(".search-prev-match");
    const nextBtn = document.querySelector(".search-next-match");

    if (messageSearchMatches.length === 0) return;

    resultsContainer.style.display = "block";

    // Update counter with nice styling
    resultsInfo.innerHTML = `
            <div class="alert alert-success py-1 px-2 mb-0 small text-center">
                <strong>${currentMatchIndex + 1} of ${messageSearchMatches.length}</strong>
            </div>
        `;

    // Enable/disable buttons
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    // Update highlight styling
    const highlights = document.querySelectorAll(".search-highlight");
    highlights.forEach((highlight, index) => {
        if (index === currentMatchIndex) {
            highlight.classList.add("search-highlight-current");
        } else {
            highlight.classList.remove("search-highlight-current");
        }
    });
}

/**
 * Scroll to specific match
 */
function scrollToMatch(matchIndex) {
    const highlight = document.querySelector(`[data-match-index="${matchIndex}"]`);
    if (!highlight) return;

    const container = document.getElementById("messagesContainer");
    if (!container) return;

    // Scroll to the highlight with some offset
    const highlightRect = highlight.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop + highlightRect.top - containerRect.top - 100;

    container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
    });
}

//  mute conversations

// Add this new function to chatEvent.js:
async function handleMuteConversation() {
    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;

    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    try {
        const data = await toggleMuteConversation(conversationId);

        if (data.success) {
            // Update state
            updateConversationMuteStatus(conversationId, data.isMuted);

            // Update total unread count
            chatState.totalUnreadCount = calculateTotalUnreadCount();
            updateNavbarBadge();

            // Update chat header dropdown text
            updateMuteDropdownText(data.isMuted);

            // Update conversation list item (add/remove mute icon)
            updateConversationInList(conversationId, null, false);

            // Show feedback
            toast.success(data.message, 1500);
        } else {
            toast.error(data.message || "Failed to update mute status");
        }
    } catch (error) {
        console.error("Failed to toggle mute:", error);
        toast.error("Failed to update mute status");
    }
}

// Add helper function to update dropdown text
function updateMuteDropdownText(isMuted) {
    const muteDropdownItem = document.querySelector('[data-action="mute"]');
    if (muteDropdownItem) {
        muteDropdownItem.textContent = isMuted ? "Unmute notifications" : "Mute notifications";
    }
}


// Handle "New Group" button click
function handleNewGroupTrigger() {
    groupCreationState.view = 'groupSelect';
    groupCreationState.selectedParticipants = [];

    const overlay = document.getElementById("newChatOverlay");
    if (overlay) {
        overlay.outerHTML = NewChatModal(
            groupCreationState.followingUsers,
            'groupSelect',
            groupCreationState.selectedParticipants
        );
    }
}

// Handle back from group select to list
function handleGroupBackToList() {
    groupCreationState.view = 'list';
    groupCreationState.selectedParticipants = [];

    const overlay = document.getElementById("newChatOverlay");
    if (overlay) {
        overlay.outerHTML = NewChatModal(groupCreationState.followingUsers, 'list');
    }
}

function handleParticipantToggle(userId) {
    // Locate the user in either the cached followingUsers array or our current selection
    const user = groupCreationState.followingUsers.find(u => u._id === userId) ||
        groupCreationState.selectedParticipants.find(p => p._id === userId);
    if (!user) return;

    const index = groupCreationState.selectedParticipants.findIndex(p => p._id === userId);

    if (index !== -1) {
        groupCreationState.selectedParticipants.splice(index, 1);
    } else {
        groupCreationState.selectedParticipants.push(user);
    }

    // Re-render select view using the search query state if present
    const overlay = document.getElementById("newChatOverlay");
    if (overlay) {
        const queryInput = document.getElementById("groupParticipantSearchInput");
        const query = queryInput ? queryInput.value : "";

        overlay.outerHTML = NewChatModal(
            groupCreationState.followingUsers,
            'groupSelect',
            groupCreationState.selectedParticipants
        );

        // Retain input state and focus if toggled mid-search
        if (query.trim()) {
            const newInput = document.getElementById("groupParticipantSearchInput");
            if (newInput) {
                newInput.value = query;
                newInput.focus();
                filterGroupParticipants(query);
            }
        }
    }
}

// Handle "Next" button (move to group details)
function handleGroupNext() {
    if (groupCreationState.selectedParticipants.length < 1) {
        toast.error("Select at least 1 participant");
        return;
    }

    groupCreationState.view = 'groupDetails';

    const overlay = document.getElementById("newChatOverlay");
    if (overlay) {
        overlay.outerHTML = NewChatModal(
            groupCreationState.followingUsers,
            'groupDetails',
            groupCreationState.selectedParticipants
        );
    }
}

// Handle back from group details to participant selection
function handleGroupDetailsBack() {
    groupCreationState.view = 'groupSelect';

    const overlay = document.getElementById("newChatOverlay");
    if (overlay) {
        overlay.outerHTML = NewChatModal(
            groupCreationState.followingUsers,
            'groupSelect',
            groupCreationState.selectedParticipants
        );
    }
}

// Handle final group creation
async function handleCreateGroup() {
    const nameInput = document.getElementById("newGroupNameInput");
    if (!nameInput) return;

    const groupName = nameInput.value.trim();

    if (!groupName || groupName.length < 2 || groupName.length > 45) {
        toast.error("Group name must be 2-45 characters");
        nameInput.focus();
        return;
    }

    if (groupCreationState.selectedParticipants.length < 1) {
        toast.error("Select at least 1 participant");
        return;
    }

    const createBtn = document.getElementById("groupCreateBtn");
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
      Creating...
    `;
    }

    try {
        const participantIds = groupCreationState.selectedParticipants.map(p => p._id);

        const data = await createGroup(groupName, participantIds);

        if (data.success && data.conversation) {
            // Add to conversation list if not exists
            const exists = chatState.conversations.find(c => c._id === data.conversation._id);
            if (!exists) {
                chatState.conversations.unshift(data.conversation);
            }

            // Close modal
            closeNewChatModal();

            // Re-render conversation list
            renderConversationList();

            // Open the new group
            await openConversation(data.conversation._id);

            toast.success("Group created successfully", 1500);
        } else {
            toast.error(data.message || "Failed to create group");
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = `
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
          </svg>
          Create Group
        `;
            }
        }
    } catch (error) {
        console.error("Failed to create group:", error);
        toast.error("Failed to create group");
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = `
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
        </svg>
        Create Group
      `;
        }
    }
}

async function handleUploadGroupImage(file) {
    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;
    const input = document.getElementById("groupImageInput");
    const changeBtn = document.getElementById("changeGroupImageBtn");

    if (!file.type.startsWith("image/")) { toast.error('Select image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }

    // Disable + spinner
    if (changeBtn) {
        changeBtn.disabled = true;
        changeBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    }

    try {
        const data = await uploadGroupImage(conversationId, file);
        if (data.success) {
            const conversation = chatState.conversations.find(c => c._id === conversationId);
            if (conversation) {
                conversation.imageUrl = data.imageUrl;
                conversation.imagePublicId = data.publicId || data.imagePublicId;
                syncGroupConversationUI(conversation);
            }
            toast.success("Group image updated", 1500);
        } else {
            toast.error(data.message || "Failed to upload image");
        }
    } catch (error) {
        console.error("Failed to upload group image:", error);
        toast.error("Failed to upload image");
    } finally {
        if (input) input.value = "";
        if (changeBtn) {
            changeBtn.disabled = false;
            changeBtn.innerHTML = `
                <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                  <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                  <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                </svg>
            `;
        }
    }
}

async function handleRemoveGroupImage() {
    const conversation = chatState.conversations.find(c => c._id === chatState.activeConversationId);
    if (conversation && (conversation.imageUrl === '/images/default-group.png' || conversation.imageUrl?.includes('default-group'))) {
        toast.error('No custom photo to remove');
        return;
    }
    if (!confirm("Remove group photo?")) return;

    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;

    try {
        const data = await removeGroupImage(conversationId);

        if (data.success) {
            const conversation = chatState.conversations.find(c => c._id === conversationId);
            if (conversation) {
                conversation.imageUrl = data.imageUrl || '/images/default-group.png';
                syncGroupConversationUI(conversation);
            }
            toast.success("Group image removed", 1500);
        } else {
            toast.error(data.message || "Failed to remove image");
        }
    } catch (error) {
        console.error("Failed to remove group image:", error);
        toast.error("Failed to remove image");
    }
}

// Show group name edit input
function showEditGroupNameInput() {
    const panelName = document.querySelector("#groupInfoPanel .group-info-name");
    if (!panelName) return;

    // Toggle: if already editing, cancel
    if (panelName.dataset.originalName) {
        hideEditGroupNameInput();
        return;
    }

    const currentName = panelName.textContent.trim();

    // Store original and replace with input
    panelName.dataset.originalName = currentName;
    panelName.innerHTML = `
    <div class="d-flex flex-column gap-2 align-items-center w-100" id="groupNameEditContainer">
      <input type="text"
             class="form-control form-control-sm text-center group-name-edit-input"
             id="editGroupNameInput"
             value="${escapeHtml(currentName)}"
             maxlength="45"
             placeholder="Group name...">
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 group-name-action-btn" id="cancelGroupNameBtn">Cancel</button>
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 group-name-action-btn group-name-save-btn" id="saveGroupNameBtn">Save</button>
      </div>
    </div>
  `;

    // Focus and select (no listener needed - delegated handler handles it)
    requestAnimationFrame(() => {
        const input = document.getElementById("groupNameInput");
        if (input) {
            input.focus();
            input.select();
        }
    });
}

// Hide group name edit input
function hideEditGroupNameInput() {
    const panelName = document.querySelector("#groupInfoPanel .group-info-name");
    if (!panelName || !panelName.dataset.originalName) return; // Not in edit mode

    const originalName = panelName.dataset.originalName;
    panelName.textContent = originalName;
    delete panelName.dataset.originalName;
}

// Save new group name
async function handleSaveGroupName() {
    const input = document.getElementById("editGroupNameInput");
    if (!input) return;

    const conversationId = chatState.activeConversationId;
    if (!conversationId) return;

    const newName = input.value.trim();
    if (!newName || newName.length < 2) {
        toast.error("Group name must be at least 2 characters");
        input.focus();
        return;
    }

    if (newName.length > 45) {
        toast.error("Group name too long (max 45 characters)");
        input.focus();
        return;
    }

    const saveBtn = document.getElementById("saveGroupNameBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    try {
        const data = await updateGroupName(conversationId, newName);

        if (data.success) {
            // FIX: Hide input FIRST (restore original DOM structure)
            hideEditGroupNameInput();

            // Then update cache
            const conversation = chatState.conversations.find(c => c._id === conversationId);
            if (conversation) {
                conversation.name = newName;
                // Now sync will work correctly (element is already restored)
                syncGroupConversationUI(conversation);
            }

            toast.success("Group name updated", 1500);
        } else {
            toast.error(data.message || "Failed to update name");
            // Re-enable button only on failure
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save";
            }
        }
    } catch (error) {
        console.error("Failed to update group name:", error);
        toast.error("Failed to update name");
        // Re-enable button on error
        const currentSaveBtn = document.getElementById("saveGroupNameBtn");
        if (currentSaveBtn) {
            currentSaveBtn.disabled = false;
            currentSaveBtn.textContent = "Save";
        }
    }
}

// Sync group conversation UI
/**
 * Single entry point for ANY group conversation change.
 * Handles automatic kicking, view clearing, and real-time DOM synchronization.
 */
function syncGroupConversationUI(conversation) {
    const conversationId = conversation._id;
    const currentUserId = appState.user._id.toString();

    // 1. Detect if the current user has been removed or is no longer an active member
    const myParticipant = conversation.participants.find(p => {
        const pid = p.userId?._id?.toString() || p.userId?.toString();
        return pid === currentUserId;
    });

    const isKicked = !myParticipant || myParticipant.leftAt !== null;

    if (isKicked) {
        // 2. Clear conversation from memory cache
        chatState.conversations = chatState.conversations.filter(c => c._id !== conversationId);

        // 3. Remove conversation row from the sidebar DOM
        renderConversationList();

        // 4. If this user currently has the kicked group open, kick them out of the view
        if (chatState.activeConversationId === conversationId) {
            clearActiveConversation();
            leaveConversation(conversationId); // Leave Socket.io room
            renderChatWindow();               // Will render EmptyChat() automatically
            updateMobileView("list");         // Reset mobile transition state

            toast.error("You have been removed from this group", 2000);
        }
        return;
    }

    // --- Standard Flow (For active group members) ---
    const index = chatState.conversations.findIndex(c => c._id === conversationId);
    if (index === -1) return;

    chatState.conversations[index] = conversation;

    // Re-render the conversation list row surgically
    updateConversationInList(conversationId, null, false);

    if (chatState.activeConversationId === conversationId) {
        syncActiveGroupHeader(conversation);
        syncActiveGroupPanel(conversation);
    }
}

function syncActiveGroupHeader(conversation) {
    const headerAvatar = document.querySelector(".chat-header-avatar");
    if (headerAvatar) {
        headerAvatar.src = conversation.imageUrl || '/images/default-group.png';
    }

    const headerName = document.querySelector(".chat-header-name");
    if (headerName) {
        headerName.textContent = conversation.name || "Group Chat";
    }

    const headerSubtitle = document.getElementById("chatSubtitle");
    if (headerSubtitle && conversation.type === "group") {
        const activeCount = conversation.participants.filter(p => !p.leftAt).length;
        headerSubtitle.textContent = `${activeCount} member${activeCount !== 1 ? 's' : ''}`;
    }
}

function syncActiveGroupPanel(conversation) {
    const panel = document.getElementById("groupInfoPanel");
    if (!panel) return;

    const panelAvatar = panel.querySelector(".group-info-avatar");
    if (panelAvatar) {
        panelAvatar.src = conversation.imageUrl || "/images/default-group.png";
    }

    const panelName = panel.querySelector(".group-info-name");
    if (panelName) {
        panelName.textContent = conversation.name || "Group Chat";
    }

    const currentUserId = appState.user._id;
    const activeParticipants = conversation.participants.filter(p => !p.leftAt);
    const activeCount = activeParticipants.length;

    const membersListEl = panel.querySelector(".group-info-members-list");
    if (membersListEl) {
        membersListEl.innerHTML = renderGroupMembersList(conversation, currentUserId);
    }

    const sectionTitle = document.getElementById("groupMembersSectionTitle");
    if (sectionTitle) {
        sectionTitle.textContent = `${activeCount} Member${activeCount !== 1 ? 's' : ''}`;
    }

    const profileCountText = document.getElementById("groupMemberCountText");
    if (profileCountText) {
        profileCountText.textContent = `${activeCount} member${activeCount !== 1 ? 's' : ''}`;
    }

    const viewerParticipant = activeParticipants.find(p => p.userId._id.toString() === currentUserId.toString());
    const viewerIsAdmin = viewerParticipant?.role === "admin";

    const avatarWrapper = panel.querySelector(".group-info-avatar")?.parentElement;
    if (avatarWrapper) {
        const existingChangeBtn = panel.querySelector("#changeGroupImageBtn");
        if (viewerIsAdmin) {
            if (!existingChangeBtn) {
                avatarWrapper.insertAdjacentHTML("beforeend", `
                    <button class="btn btn-primary rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center shadow"
                            style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;"
                            id="changeGroupImageBtn"
                            title="Change group photo">
                        <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                            <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                            <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 1 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                        </svg>
                    </button>
                    <input type="file" id="groupImageInput" class="d-none" accept="image/jpeg,image/jpg,image/png">
                `);
            }
        } else {
            existingChangeBtn?.remove();
            panel.querySelector("#groupImageInput")?.remove();
        }
    }

    // B. Group Action Buttons Wrapper (Edit / Remove Photo) - FIXED to hide when default
    const existingActionButtons = panel.querySelector("#groupActionButtons");
    const isDefaultGroupImage = !conversation.imageUrl || conversation.imageUrl === '/images/default-group.png' || conversation.imageUrl.includes('default-group');

    if (viewerIsAdmin) {
        if (!existingActionButtons) {
            const memberCountText = panel.querySelector("#groupMemberCountText");
            if (memberCountText) {
                memberCountText.insertAdjacentHTML("afterend", `
                    <div class="d-flex flex-column gap-2 align-items-center" id="groupActionButtons">
                        ${!isDefaultGroupImage ? `
                            <button class="btn btn-outline-secondary btn-sm rounded-pill group-remove-photo-btn" id="removeGroupImageBtn">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                                </svg>
                                Remove Photo
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-secondary btn-sm rounded-pill" id="editGroupNameBtn">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                            Edit Group Name
                        </button>
                    </div>
                `);
            }
        } else {
            const existingRemoveBtn = panel.querySelector("#removeGroupImageBtn");
            if (!isDefaultGroupImage && !existingRemoveBtn) {
                existingActionButtons.insertAdjacentHTML("afterbegin", `
                    <button class="btn btn-outline-secondary btn-sm rounded-pill group-remove-photo-btn" id="removeGroupImageBtn">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                        Remove Photo
                    </button>
                `);
            } else if (isDefaultGroupImage && existingRemoveBtn) {
                existingRemoveBtn.remove();
            }
        }
    } else {
        existingActionButtons?.remove();
    }

    const sectionTitleHeader = panel.querySelector("#groupMembersSectionTitle")?.parentElement;
    if (sectionTitleHeader) {
        const existingAddBtn = panel.querySelector("#openAddMembersBtn");
        if (viewerIsAdmin) {
            if (!existingAddBtn) {
                sectionTitleHeader.insertAdjacentHTML("beforeend", `
                    <button class="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-1"
                            id="openAddMembersBtn"
                            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; font-size: 0.85rem;">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                        </svg>
                        Add
                    </button>
                `);
            }
        } else {
            existingAddBtn?.remove();
        }
    }
}

// adding to group

async function handleOpenAddMembers() {
    const conversationId = chatState.activeConversationId;
    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const panel = document.getElementById("groupInfoPanel");
    if (!panel) return;

    // Reset temporary selection state
    addMembersState.selectedIds.clear();

    // Render Modal Shell instantly
    panel.insertAdjacentHTML("beforeend", `
        <div class="add-members-backdrop" id="addMembersBackdrop"></div>
        <div class="add-members-modal d-flex flex-column" id="addMembersModal">
            <div class="d-flex align-items-center p-3 border-bottom bg-white flex-shrink-0">
                <button class="btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center me-3"
                        style="width: 36px; height: 36px;" id="closeAddMembersBtn">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
                <h5 class="fw-bold mb-0 flex-grow-1 text-center">Add Members</h5>
                <div style="width: 36px;"></div>
            </div>
            <div class="flex-grow-1 d-flex flex-column" id="addMembersContent">
                <div class="flex-grow-1 d-flex align-items-center justify-content-center">
                    <div class="spinner-border spinner-border-sm text-primary"></div>
                    <span class="ms-2">Loading...</span>
                </div>
            </div>
        </div>
    `);

    requestAnimationFrame(() => {
        document.getElementById("addMembersBackdrop")?.classList.add("active");
        document.getElementById("addMembersModal")?.classList.add("active");
    });

    try {
        // Fetch suggestions and save to state cache only if it doesn't exist
        if (groupCreationState.followingUsers.length === 0) {
            const data = await searchFollowing("");
            if (data.success) {
                groupCreationState.followingUsers = data.following || [];
            }
        }

        const activeMemberIds = new Set(
            conversation.participants.filter(p => !p.leftAt).map(p => p.userId._id.toString())
        );

        // Keep suggestions pristine: Exclude existing group members
        const availableSuggestions = groupCreationState.followingUsers.filter(u => !activeMemberIds.has(u._id.toString()));

        const contentContainer = document.getElementById("addMembersContent");
        if (contentContainer) {
            contentContainer.innerHTML = renderAddMembersContentHTML(availableSuggestions, conversationId);
        }
    } catch (error) {
        console.error("Failed to open add members modal:", error);
        toast.error("Failed to load members modal");
        closeAddMembersModal();
    }
}

/**
 * Render modal inner content layout
 */
function renderAddMembersContentHTML(availableUsers, conversationId) {
    return `
        <div class="p-3 border-bottom flex-shrink-0" id="addMembersChipsContainer" style="display: none;">
            <div class="d-flex flex-wrap gap-2" id="addMembersChips"></div>
        </div>

        <div class="p-3 border-bottom flex-shrink-0">
            <div class="position-relative">
                <svg class="position-absolute top-50 start-0 translate-middle-y ms-3" width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
                    <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
                    <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
                </svg>
                <input type="text" class="form-control form-control-sm ps-5" 
                       id="addMembersSearchInput" placeholder="Search members...">
            </div>
        </div>

        <div class="flex-grow-1 overflow-auto" id="addMembersList">
            ${renderAddMembersListItemsHTML(availableUsers)}
        </div>

        <div class="p-3 border-top bg-white flex-shrink-0">
            <button class="btn btn-primary w-100 add-members-submit-btn" disabled data-conversation-id="${conversationId}">
                Add (0)
            </button>
        </div>
    `;
}

/**
 * Unified DB Search for Add Members Modal
 */
async function handleAddMembersSearch(query, cursor = null, expectedConversationId = null) {
    const listContainer = document.getElementById("addMembersList");
    if (!listContainer) return;

    const conversationId = expectedConversationId || chatState.activeConversationId;
    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const activeMemberIds = new Set(
        conversation.participants.filter(p => !p.leftAt).map(p => p.userId._id.toString())
    );

    const trimmed = query.trim();

    // 1. CLEAR SEARCH: Instant cache restoration (0 network requests, 0 DB hits)
    if (!trimmed) {
        if (newChatSearchAbortController) newChatSearchAbortController.abort();
        const suggestions = groupCreationState.followingUsers.filter(u => !activeMemberIds.has(u._id.toString()));
        listContainer.innerHTML = renderAddMembersListItemsHTML(suggestions);
        return;
    }

    // 2. Setup loading state on a fresh search query
    if (!cursor) {
        if (newChatSearchAbortController) newChatSearchAbortController.abort();
        newChatSearchAbortController = new AbortController();
        listContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center p-4">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2 text-muted">Searching database...</span>
            </div>
        `;
    }

    try {
        const data = await searchUsersForChat(trimmed, cursor || {}, newChatSearchAbortController?.signal);

        if (!cursor) listContainer.innerHTML = ""; // Clear loader
        document.getElementById("addMembersLoadMoreWrapper")?.remove(); // Remove previous Load More container

        if (data.success && data.users) {
            // Keep active group members filtered out of the search results
            const filteredUsers = data.users.filter(u => !activeMemberIds.has(u._id.toString()));

            listContainer.insertAdjacentHTML("beforeend", renderAddMembersListItemsHTML(filteredUsers));

            if (data.hasMore) {
                const last = data.users[data.users.length - 1];
                listContainer.insertAdjacentHTML("beforeend", `
                    <div class="text-center py-3" id="addMembersLoadMoreWrapper">
                        <button class="btn btn-sm btn-outline-primary rounded-pill load-more-search-btn"
                                data-query="${escapeHtml(trimmed)}"
                                data-created-at="${last.createdAt}"
                                data-id="${last._id}"
                                data-conversation-id="${conversationId}"
                                data-mode="addMembers">
                            Load More
                        </button>
                    </div>
                `);
            }
        } else {
            if (!cursor) {
                listContainer.innerHTML = `<div class="text-center text-muted p-4"><p class="mb-0">No users found</p></div>`;
            }
        }
    } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Add members search failed:", err);
        if (!cursor) {
            listContainer.innerHTML = `<div class="text-center text-muted p-4"><p class="mb-0">Search failed</p></div>`;
        }
    }
}

// Map the input events to your consolidated search engine
function filterAddMembersList(query) {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleAddMembersSearch(query), 300);
}

// Micro-HTML template for List Items
function renderAddMembersListItemsHTML(users) {
    if (users.length === 0) {
        return `<div class="text-center text-muted p-4"><p class="mb-0">No users available</p></div>`;
    }
    return users.map(user => {
        const isSelected = addMembersState.selectedIds.has(user._id.toString());
        return `
            <div class="add-member-item d-flex align-items-center p-3 ${isSelected ? 'selected' : ''}" data-user-id="${user._id}">
                <div class="form-check me-3">
                    <input class="form-check-input add-member-checkbox" type="checkbox" data-user-id="${user._id}" ${isSelected ? 'checked' : ''}>
                </div>
                <img src="${user.profileUrl || 'profiles/default-profile.png'}" 
                     class="rounded-circle me-3" width="44" height="44"
                     style="object-fit: cover;" onerror="this.onerror=null; this.src='profiles/default-profile.png'">
                <div class="flex-grow-1 min-width-0 add-member-info">
                    <h6 class="fw-semibold mb-0 text-truncate add-member-name">${escapeHtml(user.name)}</h6>
                    <small class="text-muted text-truncate d-block add-member-job">${escapeHtml(user.job || '')}</small>
                </div>
            </div>
        `;
    }).join("");
}


// Close add members modal
export function closeAddMembersModal() {
    const backdrop = document.getElementById("addMembersBackdrop");
    const modal = document.getElementById("addMembersModal");

    backdrop?.classList.remove("active");
    modal?.classList.remove("active");

    setTimeout(() => {
        backdrop?.remove();
        modal?.remove();
        addMembersState.selectedIds.clear();
    }, 300);
}

// Toggle member selection
function handleToggleAddMember(userId) {
    const item = document.querySelector(`.add-member-item[data-user-id="${userId}"]`);
    const checkbox = item?.querySelector(".add-member-checkbox");
    if (!checkbox) return;

    if (addMembersState.selectedIds.has(userId)) {
        addMembersState.selectedIds.delete(userId);
        checkbox.checked = false;
        item.classList.remove("selected");
        removeChip(userId);
    } else {
        addMembersState.selectedIds.add(userId);
        checkbox.checked = true;
        item.classList.add("selected");
        addChip(userId, item);
    }

    updateSubmitButton();
}

// Add selection chip
function addChip(userId, itemElement) {
    const container = document.getElementById("addMembersChipsContainer");
    const chipsEl = document.getElementById("addMembersChips");
    if (!container || !chipsEl) return;

    const name = itemElement.querySelector(".add-member-name")?.textContent || "User";

    chipsEl.insertAdjacentHTML("beforeend", `
        <div class="add-member-chip" data-chip-id="${userId}">
            <span>${escapeHtml(name)}</span>
            <button class="remove-chip-btn" data-user-id="${userId}">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
            </button>
        </div>
    `);

    container.style.display = "";
}

// Remove selection chip
function removeChip(userId) {
    const chip = document.querySelector(`[data-chip-id="${userId}"]`);
    chip?.remove();

    const container = document.getElementById("addMembersChipsContainer");
    const chipsEl = document.getElementById("addMembersChips");
    if (chipsEl?.children.length === 0 && container) {
        container.style.display = "none";
    }
}

// Update submit button
function updateSubmitButton() {
    const btn = document.querySelector(".add-members-submit-btn");
    if (!btn) return;

    const count = addMembersState.selectedIds.size;
    btn.disabled = count === 0;
    btn.textContent = `Add (${count})`;
}

// Submit add members
async function handleSubmitAddMembers() {
    const btn = document.querySelector(".add-members-submit-btn");
    const conversationId = btn?.dataset.conversationId;

    if (!conversationId || addMembersState.selectedIds.size === 0) return;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

    try {
        const participantIds = Array.from(addMembersState.selectedIds);
        const data = await addMembersToGroup(conversationId, participantIds);

        if (data.success && data.conversation) {
            const index = chatState.conversations.findIndex(c => c._id === conversationId);
            if (index !== -1) chatState.conversations[index] = data.conversation;

            closeAddMembersModal();
            refreshGroupMembersUI(data.conversation);

            toast.success("Members added", 1500);
        } else {
            toast.error(data.message || "Failed to add members");
            const count = addMembersState.selectedIds.size;
            btn.disabled = false;
            btn.textContent = `Add (${count})`;
        }
    } catch (error) {
        console.error("Failed to add members:", error);
        toast.error("Failed to add members");
        const count = addMembersState.selectedIds.size;
        btn.disabled = false;
        btn.textContent = `Add (${count})`;
    }
}

// Refresh members UI
function refreshGroupMembersUI(conversation) {
    const panel = document.getElementById("groupInfoPanel");
    if (!panel) return;

    const currentUserId = appState.user._id;
    const activeCount = conversation.participants.filter(p => !p.leftAt).length;

    const membersListEl = panel.querySelector(".group-info-members-list");
    if (membersListEl) {
        membersListEl.innerHTML = renderGroupMembersList(conversation, currentUserId);
    }

    const sectionTitle = document.getElementById("groupMembersSectionTitle");
    if (sectionTitle) {
        sectionTitle.textContent = `${activeCount} Member${activeCount !== 1 ? 's' : ''}`;
    }

    const profileCountText = document.getElementById("groupMemberCountText");
    if (profileCountText) {
        profileCountText.textContent = `${activeCount} member${activeCount !== 1 ? 's' : ''}`;
    }

    // Update header subtitle if this group is active
    if (chatState.activeConversationId === conversation._id) {
        const headerSubtitle = document.getElementById("chatSubtitle");
        if (headerSubtitle) {
            headerSubtitle.textContent = `${activeCount} member${activeCount !== 1 ? 's' : ''}`;
        }
    }
}


async function handleMakeAdmin(userId) {
    const conversationId = chatState.activeConversationId;
    if (!conversationId || !userId) return;

    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const targetParticipant = conversation.participants.find(
        p => p.userId._id.toString() === userId.toString() && !p.leftAt
    );
    if (!targetParticipant) return;

    const newRole = targetParticipant.role === "admin" ? "member" : "admin";
    const actionText = newRole === "admin" ? "make admin" : "remove admin";

    if (!confirm(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} this user?`)) return;

    try {
        const data = await updateMemberRole(conversationId, userId, newRole);

        if (data.success && data.conversation) {
            // Update local cache
            syncGroupConversationUI(data.conversation);
            toast.success(data.message, 1500);
        } else {
            toast.error(data.message || "Failed to update role");
        }
    } catch (error) {
        console.error("Failed to update role:", error);
        toast.error("Failed to update role");
    }
}

async function handleRemoveMember(userId) {
    const conversationId = chatState.activeConversationId;
    if (!conversationId || !userId) return;

    const conversation = chatState.conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const target = conversation.participants.find(
        p => p.userId._id.toString() === userId.toString() && !p.leftAt
    );
    if (!target) return;

    if (!confirm(`Remove ${target.userId.name} from this group?`)) return;

    try {
        const data = await removeMember(conversationId, userId);

        if (data.success) {
            if (data.dissolved) {
                // Group was dissolved because only 1 person remained
                chatState.conversations = chatState.conversations.filter(c => c._id !== conversationId);
                delete chatState.messagesCache[conversationId];
                delete chatState.unreadCounts[conversationId];
                chatState.totalUnreadCount = calculateTotalUnreadCount();
                updateNavbarBadge();

                clearActiveConversation();
                leaveConversation(conversationId);
                renderChatWindow();
                updateMobileView("list");
                renderConversationList();

                toast.info("Group dissolved as only 1 member remained", 2000);
            } else if (data.conversation) {
                // Normal removal
                syncGroupConversationUI(data.conversation);
                toast.success("Member removed", 1500);
            }
        } else {
            toast.error(data.message || "Failed to remove member");
        }
    } catch (error) {
        console.error("Failed to remove member:", error);
        toast.error("Failed to remove member");
    }
}

// Escape regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}