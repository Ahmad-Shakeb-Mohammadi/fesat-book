import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { tokenManager } from "../tokenManager.js"
import { refreshAccessToken } from "../api.js";
import { chatState } from "./chatState.js";

let socket = null;

/**
 * Initialize socket connection (call once on boot if authenticated)
 */
export function initSocket() {
  if (socket?.connected) return socket;

  const token = tokenManager.get();
  if (!token) {
    console.warn("No token available, socket not initialized");
    return null;
  }

  socket = io({
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
  });

  // Handle connection errors
  socket.on("connect_error", async (err) => {
    console.warn("Socket connect_error:", err.message);

    if (err.message === "TokenExpiredError") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        tokenManager.set(newToken);
        // Update socket auth before reconnecting
        socket.auth = { token: newToken };
        socket.connect();
      } else {
        console.error("Socket refresh failed, disconnecting");
        disconnectSocket();
      }
    } else if (err.message === "Invalid token" || err.message === "No token provided") {
      console.error("Socket auth failed, disconnecting");
      disconnectSocket();
    }
    // Network errors — let Socket.IO handle reconnection automatically
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    // FIX: Emit directly to bypass the !socket.connected guard check during handshake
    if (chatState?.activeConversationId) {
      const activeId = chatState.activeConversationId.toString();
      socket.emit("conversation:join", activeId);
      console.log("[Socket] Restored active room:", activeId);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
}

/**
 * Disconnect socket (call on logout)
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function joinConversation(conversationId) {
  if (!socket?.connected) {
    console.warn("Socket not connected, cannot join conversation");
    return false;
  }
  socket.emit("conversation:join", conversationId);
  return true;
}

export function leaveConversation(conversationId) {
  if (!socket?.connected) {
    console.warn("Socket not connected, cannot leave conversation");
    return false;
  }
  socket.emit("conversation:leave", conversationId);
  return true;
}

export function emitTypingStart(conversationId) {
  if (!socket?.connected) return false;
  socket.emit("typing:start", { conversationId });
  return true;
}

export function emitTypingStop(conversationId) {
  if (!socket?.connected) return false;
  socket.emit("typing:stop", { conversationId });
  return true;
}

/**
 * Listen for socket events
 */
export function onEvent(event, callback) {
  if (!socket) {
    console.warn(`Socket not initialized, cannot listen to "${event}"`);
    return;
  }
  socket.on(event, callback);
}

export function offEvent(event, callback) {
  if (!socket) return;
  socket.off(event, callback);
}