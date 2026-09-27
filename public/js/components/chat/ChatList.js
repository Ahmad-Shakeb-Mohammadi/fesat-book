// frontend/components/chat/ChatList.js

import { ChatListItem } from "./ChatListItem.js";
import { chatState } from "../../chat/chatState.js";
import { appState } from "../../state.js";

/**
 * Conversation list panel with search
 */
export function ChatList() {
  const currentUserId = appState.user._id;
  const conversations = chatState.conversations;
  
  return `
    <div class="d-flex flex-column h-100">
      
      <!-- Header -->
      <div class="chat-list-header p-3 border-bottom">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="chat-list-title fw-bold mb-0">Conversations</h5>
          <button class="chat-list-new-btn btn btn-sm btn-light rounded-circle p-0 d-flex align-items-center justify-content-center" 
                  id="newChatBtn"
                  title="New conversation">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
          </button>
        </div>
        
        <!-- Search -->
          <div class="position-relative">
              <svg class="chat-search-icon position-absolute top-50 start-0 translate-middle-y ms-3" width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
                <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
                <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
              </svg>
              <input type="text" 
                    class="chat-search-input form-control form-control-sm ps-5 pe-4" 
                    id="chatSearchInput"
                    placeholder="Search conversations...">
                <button class="chat-search-clear">
                  <svg width="16" height="16" fill="#000000" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                  </svg>
                </button>
          </div>
      </div>

      <!-- Conversation List -->
      <div class="flex-grow-1 overflow-auto" id="chatListContainer">
        ${conversations.length === 0 ? `
          <div class="chat-list-empty text-center text-muted p-4">
            <p class="mb-0">No conversations yet</p>
          </div>
        ` : conversations.map(conv => ChatListItem(conv, currentUserId)).join("")}
      </div>

    </div>
  `;
}