import { ChatList } from "./ChatList.js";
import { ChatWindow } from "./ChatWindow.js";
import { EmptyChat } from "./EmptyChat.js";
import { chatState } from "../../chat/chatState.js";

export function ChatLayout() {
  return `
    <div class="chat-layout d-flex w-100" data-view="${chatState.mobileView}">
      
      <!-- Conversation List Panel -->
      <div class="chat-list-panel" id="chatListPanel">
        ${ChatList()}
      </div>

      <!-- Chat Window Panel -->
      <div class="chat-window-panel flex-grow-1 d-flex flex-column" id="chatWindowPanel">
        ${chatState.activeConversationId ? ChatWindow() : EmptyChat()}
      </div>

    </div>
  `;
}

/**
 * Re-render chat window panel (call when activeConversationId changes)
 */
export function renderChatWindow() {
  const panel = document.getElementById("chatWindowPanel");
  if (!panel) return;
  
  panel.innerHTML = chatState.activeConversationId ? ChatWindow() : EmptyChat();
}

/**
 * Update mobile view toggle
 */
export function updateMobileView(view) {
  chatState.mobileView = view;
  const layout = document.querySelector(".chat-layout");
  if (layout) {
    layout.setAttribute("data-view", view);
  }
}