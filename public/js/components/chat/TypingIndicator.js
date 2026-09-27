import { getTypingUsers } from "../../chat/chatState.js";
import { appState } from "../../state.js";

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

export function TypingIndicatorHTML(conversation) {
    if (!conversation) return "";

    const typingIds = Array.from(getTypingUsers(conversation._id))
        .filter(id => id !== appState.user._id);

    if (typingIds.length === 0) return "";

    const users = typingIds
        .map(id => {
            const p = conversation.participants.find(p => p.userId._id === id && !p.leftAt);
            return p?.userId ? {
                name: p.userId.name || "Someone",
                profileUrl: p.userId.profileUrl || "/images/default-profile.png"
            } : null;
        })
        .filter(u => u !== null);

    if (users.length === 0) return "";

    // WhatsApp behaviour: names cut at 10 chars
    const shortName = (n) => (n.length > 10 ? n.slice(0, 10).trim() + "…" : n);

    // Max 2 avatars + 2 names
    const shown = users.slice(0, 2);
    const more = users.length - shown.length;

    const avatars = shown.map(u => `
        <img src="${u.profileUrl}" class="typing-avatar" alt=""
             onerror="this.onerror=null;this.src='/images/default-profile.png'">`).join("");

    let text;
    if (conversation.type === "direct") {
        text = "typing";
    } else if (users.length === 1) {
        text = `${escapeHtml(shortName(shown[0].name))} is typing`;
    } else if (users.length === 2) {
        text = `${escapeHtml(shortName(shown[0].name))} and ${escapeHtml(shortName(shown[1].name))} are typing`;
    } else {
        text = `${escapeHtml(shortName(shown[0].name))}, ${escapeHtml(shortName(shown[1].name))} and ${more} more are typing`;
    }

    return `
        <div class="chat-typing d-flex align-items-center">
            <span class="typing-avatars">${avatars}</span>
            <small class="chat-typing-text text-muted">${text}</small>
            <span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        </div>
    `;
}