// chat/globalSocketHandlers.js
import { onEvent, offEvent } from "./socketManager.js";
import { chatState, addMessageToCache, calculateTotalUnreadCount } from "./chatState.js";
import { updateNavbarBadge } from "../loaders/chatLoader.js";
import { appState } from "../state.js";
import { updateConversationInList } from "./chatEvent.js";


let isInitialized = false;

/**
 * Setup global socket handlers (call once on app init)
 * These handlers are always active regardless of current page
 */
export function setupGlobalSocketHandlers() {
  if (isInitialized) return;

  onEvent("message:new", handleGlobalNewMessage);
  onEvent("message:deleted", handleGlobalDeletedMessage);
  onEvent("conversation:new", handleGlobalConversationNew);
  onEvent("conversation:updated", handleGlobalConversationUpdated);
  onEvent("conversation:deleted", handleGlobalConversationDeleted);

  isInitialized = true;
}

/**
 * Cleanup global handlers (call on logout)
 */
export function cleanupGlobalSocketHandlers() {
  if (!isInitialized) return;

  offEvent("message:new", handleGlobalNewMessage);
  offEvent("message:deleted", handleGlobalDeletedMessage);
  offEvent("conversation:new", handleGlobalConversationNew);
  offEvent("conversation:updated", handleGlobalConversationUpdated);
  offEvent("conversation:deleted", handleGlobalConversationDeleted);

  isInitialized = false;
}

/**
 * Global handler for new messages - updates unread counts
 */
function handleGlobalNewMessage(data) {
  const { message } = data;
  if (!message || !message.conversationId) return;

  const currentUserId = appState.user._id.toString();
  const senderId = message.senderId?._id?.toString() || message.senderId?.toString();

  if (senderId === currentUserId) return;
  if (chatState.chatEventsActive) return;

  const conversationId = message.conversationId;
  if (chatState.activeConversationId === conversationId) return;

  // Add message to cache (marked as incomplete)
  addMessageToCache(conversationId, message);

  // Update individual conversation count
  const currentCount = chatState.unreadCounts[conversationId] || 0;
  chatState.unreadCounts[conversationId] = currentCount + 1;

  // FIX: Recalculate total to respect mute status
  chatState.totalUnreadCount = calculateTotalUnreadCount();

  updateNavbarBadge();
}

function handleGlobalDeletedMessage(data) {
  const { messageId, deletedForEveryoneAt, conversationId } = data;
  if (!messageId || !conversationId) return;

  // Only handle when NOT in messenger mode
  if (chatState.chatEventsActive) return;

  // Update cached message if it exists
  const cache = chatState.messagesCache[conversationId];
  if (cache && cache.messages) {
    const msgIndex = cache.messages.findIndex(m => m._id.toString() === messageId.toString());

    if (msgIndex !== -1) {
      // Update message in cache (NO counter logic at all)
      cache.messages[msgIndex] = {
        ...cache.messages[msgIndex],
        deletedForEveryoneAt,
        text: '',
        attachments: []
      };
    }
  }

  // Update conversation list to show "Message deleted" as last message  
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

      updateConversationInList(conversationId, conv.lastMessage, false);
    }
  }
}

function handleGlobalConversationNew(data) {
  const { conversation } = data;
  if (!conversation) return;

  // Only handle if NOT in messenger mode (chatEvent.js handles it when active)
  if (chatState.chatEventsActive) return;

  // Add to cache if doesn't exist
  const exists = chatState.conversations.find(c => c._id === conversation._id);
  if (!exists) {
    chatState.conversations.unshift(conversation);
    chatState.unreadCounts[conversation._id] = conversation.unreadCount || 0;
    chatState.totalUnreadCount = calculateTotalUnreadCount();
    updateNavbarBadge();
  }
}

function handleGlobalConversationUpdated(data) {
  const { conversation } = data;
  if (!conversation) return;

  // Only handle when NOT in messenger
  if (chatState.chatEventsActive) return;

  // Update cache (group photo/name/members changed)
  const index = chatState.conversations.findIndex(c => c._id === conversation._id);
  if (index !== -1) {
    chatState.conversations[index] = conversation;
  }
}

function handleGlobalConversationDeleted(data) {
  const { conversationId } = data;
  if (!conversationId) return;

  // Only handle when NOT in messenger (chatEvent.js handles it there with UI updates)
  if (chatState.chatEventsActive) return;

  // Remove from cache so the stale list never renders
  chatState.conversations = chatState.conversations.filter(c => c._id !== conversationId);
  delete chatState.messagesCache[conversationId];
  delete chatState.unreadCounts[conversationId];

  // Clear stale active pointer if it pointed at the deleted conversation
  if (chatState.activeConversationId === conversationId) {
    chatState.activeConversationId = null;
  }

  chatState.totalUnreadCount = calculateTotalUnreadCount();
  updateNavbarBadge();
}