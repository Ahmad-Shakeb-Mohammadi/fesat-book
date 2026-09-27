// frontend/components/chat/ChatHeader.js
import { chatState } from "../../chat/chatState.js";
import { appState } from "../../state.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function ChatHeader(conversation) {
  const currentUserId = appState.user._id;
  const isMuted = conversation.isMuted || false;

  let name, imageUrl, subtitle, isOnline;

  if (conversation.type === "direct") {
    const other = conversation.participants.find(p => p.userId._id !== currentUserId);
    name = other?.userId?.name || "Unknown";
    imageUrl = other?.userId?.profileUrl || "profiles/default-profile.png";
    isOnline = chatState.onlineUsers.has(other?.userId?._id);
    subtitle = other?.userId?.job || "";
  } else {
    name = conversation.name || "Group Chat";
    imageUrl = conversation.imageUrl || "profiles/default-group.png";
    isOnline = false;
    const memberCount = conversation.participants.filter(p => !p.leftAt).length;
    subtitle = `${memberCount} member${memberCount !== 1 ? "s" : ""}`;
  }

  const fallbackImage = conversation.type === "direct"
    ? "profiles/default-profile.png"
    : "profiles/default-group.png";

  return `
    <div class="chat-header d-flex align-items-center p-3 border-bottom bg-white">
      
      <!-- Back button (mobile only) -->
      <button class="btn btn-sm btn-light rounded-circle me-2 chat-back-btn chat-header-btn">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
        </svg>
      </button>

      <!-- Avatar -->
      <div class="position-relative me-3 flex-shrink-0">
        <img src="${imageUrl}" 
             class="chat-header-avatar rounded-circle" 
             width="40" height="40" 
             onerror="this.onerror=null; this.src='${fallbackImage}'">
        ${isOnline ? `<span class="chat-header-online-dot position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"></span>` : ""}
      </div>

      <!-- Info -->
      <div class="flex-grow-1 min-width-0">
        <h6 class="chat-header-name fw-semibold mb-0 text-truncate">${escapeHtml(name)}</h6>
        <small class="chat-header-subtitle text-muted" id="chatSubtitle">${escapeHtml(subtitle)}</small>
      </div>

      <!-- Actions -->
      <div class="d-flex gap-2 flex-shrink-0">
        ${conversation.type === "group" ? `
          <button class="toggle-group-info-btn btn btn-sm btn-light rounded-circle chat-header-btn" 
                  title="Group info">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
          </button>
        ` : ""}
        
        <div class="dropdown">
          <button class="btn btn-sm btn-light rounded-circle dropdown-toggle chat-header-btn" 
                  data-bs-toggle="dropdown" aria-expanded="false">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
            </svg>
          </button>
          <ul class="dropdown-menu dropdown-menu-end modern-dropdown">
            <li><a class="dropdown-item" data-action="search" style="cursor: pointer;">Search messages</a></li>
            <li><a class="dropdown-item" data-action="mute" style="cursor: pointer;">${isMuted ? 'Unmute notifications' : 'Mute notifications'}</a></li>
          </ul>
        </div>
      </div>

    </div>
  `;
}