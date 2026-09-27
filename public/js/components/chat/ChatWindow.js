import { ChatHeader } from "./ChatHeader.js";
import { MessageBubble } from "./MessageBubble.js";
import { MessageInput } from "./MessageInput.js";
import { TypingIndicatorHTML } from "./TypingIndicator.js";
import { chatState, getCachedMessages } from "../../chat/chatState.js";

/**
 * Active chat window with header, messages, and input
 */
export function ChatWindow() {
  const conversationId = chatState.activeConversationId;
  if (!conversationId) return "";

  // Find conversation from state
  const conversation = chatState.conversations.find(c => c._id === conversationId);
  if (!conversation) return "";

  // Get cached messages
  const cached = getCachedMessages(conversationId);
  const messages = cached?.messages || [];

  return `
  ${ChatHeader(conversation)}

  <div class="chat-messages-container flex-grow-1 overflow-auto d-flex flex-column" id="messagesContainer">
    <div class="py-3" id="messagesList">
      ${messages.length === 0 ? `
        <div class="chat-empty-messages text-center text-muted py-5">
          <p class="mb-0">No messages yet. Start the conversation!</p>
        </div>
      ` : messages.map(msg => MessageBubble(msg, conversation.type, conversationId)).join("")}
    </div>

    <div class="chat-typing-indicator px-3 py-1" id="typingIndicator">
      ${TypingIndicatorHTML(conversation)}
    </div>
  </div>

  ${MessageInput()}
`;
}