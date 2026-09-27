// frontend/components/chat/ChatListItem.js
import { chatState, getUnreadCount } from "../../chat/chatState.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function ChatListItem(conversation, currentUserId) {
  const isActive = chatState.activeConversationId === conversation._id;
  const unreadCount = getUnreadCount(conversation._id);
  const isMuted = conversation.isMuted || false;
  
  // Get display info based on conversation type
  let name, imageUrl, fallbackImage, isOnline;
  
  if (conversation.type === "direct") {
    const otherParticipant = conversation.participants.find(
      p => p.userId._id !== currentUserId
    );
    name = otherParticipant?.userId?.name || "Unknown";
    imageUrl = otherParticipant?.userId?.profileUrl || "profiles/default-profile.png";
    fallbackImage = "profiles/default-profile.png";
    isOnline = chatState.onlineUsers.has(otherParticipant?.userId?._id);
  } else {
    name = conversation.name || "Group Chat";
    imageUrl = conversation.imageUrl || "profiles/default-group.png";
    fallbackImage = "profiles/default-group.png";
    isOnline = false;
  }
  
  // Last message preview
  const lastMsg = conversation.lastMessage;
  let lastMsgText = "";
  let lastMsgTime = "";
  
  if (lastMsg) {
    if (lastMsg.deletedForEveryoneAt) {
      lastMsgText = "Message deleted";
    } else if (lastMsg.attachments?.length > 0) {
      const type = lastMsg.attachments[0].type;
      lastMsgText = type === "image" ? "📷 Photo" : type === "video" ? "🎥 Video" : "📄 File";
      if (lastMsg.text) lastMsgText += ` ${lastMsg.text}`;
    } else {
      lastMsgText = lastMsg.text || "";
    }
    
    // Truncate
    if (lastMsgText.length > 40) {
      lastMsgText = lastMsgText.substring(0, 40) + "...";
    }
    
    // Time formatting (clamped to prevent negative diffDays from clock skew)
    const date = new Date(lastMsg.createdAt);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now - date) / (1000 * 60 * 60 * 24)));
    
    if (diffDays === 0) {
      lastMsgTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      lastMsgTime = "Yesterday";
    } else if (diffDays < 7) {
      lastMsgTime = date.toLocaleDateString([], { weekday: "short" });
    } else {
      lastMsgTime = date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }
  
  return `
    <div class="chat-list-item d-flex align-items-center p-3 ${isActive ? "active" : ""}" 
         data-conversation-id="${conversation._id}">
      
      <!-- Avatar with online indicator -->
      <div class="position-relative me-3 flex-shrink-0">
        <img src="${imageUrl}" 
             class="chat-list-item-avatar rounded-circle" 
             width="48" height="48" 
             onerror="this.onerror=null; this.src='${fallbackImage}'">
        ${conversation.type === "direct" ? `
          <span class="chat-list-item-online-dot position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle ${isOnline ? "online" : ""}"></span>
        ` : ""}
      </div>

      <!-- Content -->
      <div class="flex-grow-1 min-width-0">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <div class="d-flex align-items-center gap-1 min-width-0">
            <h6 class="chat-list-item-name fw-semibold mb-0 text-truncate">${escapeHtml(name)}</h6>
            ${isMuted ? `
              <svg width="14" height="14" fill="#6c757d" viewBox="0 0 16 16" title="Muted" class="flex-shrink-0">
                <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                <path fill-rule="evenodd" d="M12.853 5.146a.5.5 0 0 1 0 .708l-1 1 1 1a.5.5 0 0 1-.708.708l-1-1-1 1a.5.5 0 0 1-.708-.708l1-1-1-1a.5.5 0 0 1 .708-.708l1 1 1-1a.5.5 0 0 1 .708 0z"/>
              </svg>
            ` : ""}
          </div>
          ${lastMsgTime ? `<small class="chat-list-item-time text-muted flex-shrink-0 ms-2">${lastMsgTime}</small>` : ""}
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <p class="chat-list-item-preview mb-0 text-truncate ${unreadCount > 0 ? "fw-semibold" : "text-muted"}">
            ${lastMsgText ? escapeHtml(lastMsgText) : "No messages yet"}
          </p>
          ${unreadCount > 0 ? `
            <span class="chat-list-item-badge badge rounded-pill ms-2 flex-shrink-0 ${isMuted ? 'muted-badge' : ''}">${unreadCount > 99 ? "99+" : unreadCount}</span>
          ` : ""}
        </div>
      </div>

    </div>
  `;
}