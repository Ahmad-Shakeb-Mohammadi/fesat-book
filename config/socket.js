import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";

let io;
const onlineUsers = new Map(); // userId -> Set<socketId>

export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Auth Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (!decoded.userId || !mongoose.Types.ObjectId.isValid(decoded.userId)) {
        return next(new Error("Invalid token"));
      }

      socket.userId = decoded.userId.toString();
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new Error("TokenExpiredError"));
      }
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;

    // Track socket per user (supports multi-tab/device)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Only broadcast "online" on first socket for this user
    if (onlineUsers.get(userId).size === 1) {
      io.emit("user:online", { userId });
    }

    // ─── Join conversation room ───────────────────────────────────
    socket.on("conversation:join", async (conversationId) => {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) return;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: {
          $elemMatch: {
            userId: userId,
            leftAt: null
          }
        }
      }).select("_id");

      if (!conversation) return;

      socket.join(`conversation:${conversationId}`);
    });

    // ─── Leave conversation room ─────────────────────────────────
    socket.on("conversation:leave", (conversationId) => {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // ─── Typing indicators ───────────────────────────────────────
    let lastTypingEvent = 0;
    socket.on("typing:start", ({ conversationId }) => {
      // just a small rate limitting on socket without overgineering
      const now = Date.now();
      if (now - lastTypingEvent < 500) return;
      lastTypingEvent = now;

      if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        userId
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {

      const now = Date.now();
      if (now - lastTypingEvent < 500) return;
      lastTypingEvent = now;

      if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        userId
      });
    });

    // ─── Disconnection ───────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;

      sockets.delete(socket.id);

      // Only broadcast "offline" when ALL sockets for this user are gone
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user:offline", { userId });
      }
    });
  });

  return io;
};

// ─── Emit Helpers (used by controllers) ─────────────────────────────

/**
 * Emit event to all sockets in a conversation room
 */
export const emitToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, data);
};

/**
 * Emit event to a specific user (all their sockets)
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets) return;
  for (const socketId of sockets) {
    io.to(socketId).emit(event, data);
  }
};

/**
 * Emit event to specific users (e.g., all participants except sender)
 */
export const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  for (const userId of userIds) {
    emitToUser(userId, event, data);
  }
};

/**
 * Check if a user is currently online
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

/**
 * Get all online user IDs
 */
export function getOnlineUsers() {
  return onlineUsers; // This should be your Set of online user IDs
}

/**
 * Get Socket.IO instance
 */
export const getIO = () => io;