export const chatState = {
  activeConversationId: null,
  messagesCache: {},
  conversations: [],
  conversationsPage: 1,
  conversationsHasMore: false,
  onlineUsers: new Set(),
  typingUsers: {},
  mobileView: "list",
  unreadCounts: {},
  totalUnreadCount: 0,
  chatEventsActive: false,
  conversationsLastFetched: null,
  CACHE_DURATION: 5 * 60 * 1000,
  pendingConversationId: null,
  // NEW: Professional upload tracking for 5 files parallel
  activeChatUploads: {}, // { [conversationId]: { isUploading, totalProgress, files: [], optimisticMessageId, abortControllers: [] } }
};

export const downloadedFiles = new Map();

export function setActiveConversation(conversationId) {
  chatState.activeConversationId = conversationId;
  chatState.mobileView = "chat";
}

export function clearActiveConversation() {
  chatState.activeConversationId = null;
  chatState.mobileView = "list";
}

export function cacheMessages(conversationId, messages, hasMore, nextCursor, recipientLastReadAt = null, isComplete = true) {
  chatState.messagesCache[conversationId] = { messages, hasMore, nextCursor, recipientLastReadAt, isComplete, cachedAt: Date.now() };
}

export function getCachedMessages(conversationId) {
  return chatState.messagesCache[conversationId] || null;
}

export function addMessageToCache(conversationId, message) {
  const cache = chatState.messagesCache[conversationId];
  if (!cache) {
    chatState.messagesCache[conversationId] = { messages: [message], hasMore: true, nextCursor: null, recipientLastReadAt: null, isComplete: false };
    return;
  }
  const exists = cache.messages.some(m => m._id.toString() === message._id.toString());
  if (!exists) cache.messages.push(message);
}

export function updateMessageInCache(conversationId, messageId, updates) {
  const cache = chatState.messagesCache[conversationId];
  if (!cache) return false;
  const msgIndex = cache.messages.findIndex(m => m._id.toString() === messageId.toString());
  if (msgIndex !== -1) { cache.messages[msgIndex] = { ...cache.messages[msgIndex], ...updates }; return true; }
  return false;
}

export function removeMessageFromCache(conversationId, messageId) {
  const cache = chatState.messagesCache[conversationId];
  if (!cache) return false;
  const msgIndex = cache.messages.findIndex(m => m._id.toString() === messageId.toString());
  if (msgIndex !== -1) { cache.messages.splice(msgIndex, 1); return true; }
  return false;
}

export function setUserOnline(userId) { chatState.onlineUsers.add(userId.toString()); }
export function setUserOffline(userId) { chatState.onlineUsers.delete(userId.toString()); }
export function isUserOnline(userId) { return chatState.onlineUsers.has(userId.toString()); }

export function setTyping(conversationId, userId, isTyping) {
  if (!chatState.typingUsers[conversationId]) chatState.typingUsers[conversationId] = new Set();
  if (isTyping) chatState.typingUsers[conversationId].add(userId.toString());
  else {
    chatState.typingUsers[conversationId].delete(userId.toString());
    if (chatState.typingUsers[conversationId].size === 0) delete chatState.typingUsers[conversationId];
  }
}

export function getTypingUsers(conversationId) { return chatState.typingUsers[conversationId] || new Set(); }
export function updateUnreadCount(conversationId, count) { chatState.unreadCounts[conversationId] = count; }
export function getUnreadCount(conversationId) { return chatState.unreadCounts[conversationId] || 0; }

export function clearChatState() {
  chatState.activeConversationId = null;
  chatState.messagesCache = {};
  chatState.conversations = [];
  chatState.conversationsPage = 1;
  chatState.conversationsHasMore = false;
  chatState.onlineUsers.clear();
  chatState.typingUsers = {};
  chatState.mobileView = "list";
  chatState.unreadCounts = {};
  chatState.totalUnreadCount = 0;
  chatState.activeChatUploads = {};

  downloadedFiles.clear();
}

export function setMessageDelivered(messageId) {
  if (!chatState.messageStatus) chatState.messageStatus = {};
  if (!chatState.messageStatus[messageId]) chatState.messageStatus[messageId] = { delivered: false, read: false };
  chatState.messageStatus[messageId].delivered = true;
}

export function setMessageRead(messageId) {
  if (!chatState.messageStatus) chatState.messageStatus = {};
  if (!chatState.messageStatus[messageId]) chatState.messageStatus[messageId] = { delivered: true, read: false };
  chatState.messageStatus[messageId].read = true;
}

export function getMessageStatus(messageId) {
  if (!chatState.messageStatus) chatState.messageStatus = {};
  return chatState.messageStatus[messageId] || { delivered: false, read: false };
}

export function updateConversationMuteStatus(conversationId, isMuted) {
  const convIndex = chatState.conversations.findIndex(c => c._id === conversationId);
  if (convIndex !== -1) chatState.conversations[convIndex].isMuted = isMuted;
}

export function calculateTotalUnreadCount() {
  return Object.entries(chatState.unreadCounts)
    .filter(([conversationId]) => {
      const conversation = chatState.conversations.find(c => c._id === conversationId);
      return !conversation?.isMuted;
    })
    .reduce((sum, [_, count]) => sum + count, 0);
}

// NEW: Chat upload helpers
export function setChatUploadState(conversationId, uploadData) {
  chatState.activeChatUploads[conversationId] = uploadData;
}

export function getChatUploadState(conversationId) {
  return chatState.activeChatUploads[conversationId] || null;
}

export function clearChatUploadState(conversationId) {
  delete chatState.activeChatUploads[conversationId];
}