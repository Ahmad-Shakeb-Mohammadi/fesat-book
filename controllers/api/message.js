import mongoose from "mongoose";
import Conversation from "../../models/Conversation.js";
import Block from "../../models/Block.js"
import Message from "../../models/Message.js";
import { emitToConversation, isUserOnline, emitToUser } from "../../config/socket.js";
import { deleteFromCloudinary } from "../../services/cloudinaryService.js";

export const getConversationMessages = async (req, res, next) => {
    try {
        const currentUserId = req.userId;
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversationId"
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: {
                $elemMatch: {
                    userId: currentUserId,
                    leftAt: null
                }
            }
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this conversation"
            });
        }

        const limit = Math.min(Number(req.query.limit) || 30, 50);

        const filter = {
            conversationId,
            deletedFor: {
                $ne: currentUserId
            }
        };

        if (req.query.beforeCreatedAt && req.query.beforeId) {
            const beforeDate = new Date(req.query.beforeCreatedAt);

            if (
                !Number.isNaN(beforeDate.getTime()) &&
                mongoose.Types.ObjectId.isValid(req.query.beforeId)
            ) {
                filter.$or = [
                    {
                        createdAt: {
                            $lt: beforeDate
                        }
                    },
                    {
                        createdAt: beforeDate,
                        _id: {
                            $lt: req.query.beforeId
                        }
                    }
                ];
            }
        }

        const messages = await Message.find(filter)
            .sort({
                createdAt: -1,
                _id: -1
            })
            .limit(limit + 1)
            .populate("senderId", "name profileUrl")
            .populate({
                path: "replyTo",
                select: "text attachments senderId createdAt deletedForEveryoneAt",
                populate: {
                    path: "senderId",
                    select: "name profileUrl"
                }
            })
            .lean();

        const hasMore = messages.length > limit;
        if (hasMore) {
            messages.pop()
        }
        const oldestMessage = messages[messages.length - 1];
        const orderedMessages = [...messages].reverse();

        // Get recipient's lastReadAt for this conversation
        const otherParticipant = conversation.participants.find(
            p => p.userId.toString() !== currentUserId.toString()
        );
        const recipientLastReadAt = otherParticipant?.lastReadAt || null;

        return res.status(200).json({
            success: true,
            count: orderedMessages.length,
            messages: orderedMessages,
            hasMore,
            nextCursor: oldestMessage
                ? {
                    beforeCreatedAt: oldestMessage.createdAt,
                    beforeId: oldestMessage._id
                }
                : null,
            recipientLastReadAt
        });
    } catch (error) {
        next(error);
    }
};

export const sendTextMessage = async (req, res, next) => {
    try {
        const currentUserId = req.userId;
        const { conversationId } = req.params;
        const { text, replyTo } = req.body;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversationId"
            });
        }

        const cleanText = text?.trim();
        if (!cleanText || cleanText.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message text should be 1-5000"
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: {
                $elemMatch: { userId: currentUserId, leftAt: null }
            }
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to send message in this conversation"
            });
        }

        if (conversation.type === "direct") {
            const otherParticipant = conversation.participants.find(
                (p) => p.userId.toString() !== currentUserId.toString()
            );

            const isBlocked = await Block.findOne({
                $or: [
                    { blocker: currentUserId, blocked: otherParticipant.userId },
                    { blocker: otherParticipant.userId, blocked: currentUserId }
                ]
            });

            if (isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: "Message is not allowed between these users (blocked)"
                });
            }
        }

        if (replyTo) {
            if (!mongoose.Types.ObjectId.isValid(replyTo)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid replyTo message"
                });
            }

            const repliedMessage = await Message.findOne({
                _id: replyTo,
                conversationId
            });

            if (!repliedMessage) {
                return res.status(400).json({
                    success: false,
                    message: "Reply message does not belong to this conversation"
                });
            }
        }

        let message = await Message.create({
            conversationId,
            senderId: currentUserId,
            text: cleanText,
            replyTo: replyTo || null
        });

        await Conversation.updateOne(
            { _id: conversationId },
            {
                $set: {
                    lastMessage: message._id,
                    lastMessageAt: message.createdAt
                }
            }
        );

        message = await message.populate([
            { path: "senderId", select: "name profileUrl" },
            {
                path: "replyTo",
                select: "text attachments senderId createdAt deletedForEveryoneAt",
                populate: { path: "senderId", select: "name profileUrl" }
            }
        ]);
        // Update sender's lastReadAt (so their own messages show as read)
        await Conversation.updateOne(
            {
                _id: conversationId,
                "participants.userId": currentUserId
            },
            {
                $set: { "participants.$.lastReadAt": new Date() }
            }
        );

        // This ensures recipients receive the message even if they haven't opened the conversation
        const participantIds = conversation.participants
            .filter(p => !p.leftAt)
            .map(p => p.userId.toString());

        participantIds.forEach(participantId => {
            emitToUser(participantId, "message:new", { message, conversationId: conversationId.toString() });
        });

        if (conversation.type === "direct") {
            const recipientId = conversation.participants.find(
                p => p.userId.toString() !== currentUserId.toString()
            )?.userId;

            if (recipientId && isUserOnline(recipientId)) {
                emitToUser(currentUserId.toString(), "message:delivered", {
                    messageId: message._id.toString(),
                    conversationId: conversationId
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: "Message sent",
            data: message
        });
    } catch (error) {
        next(error);
    }
};

export const editMessage = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { messageId } = req.params;
        const { text } = req.body;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ success: false, message: "Invalid message ID" });
        }

        const cleanText = text?.trim();
        if (!cleanText || cleanText.length === 0 || cleanText.length > 5000) {
            return res.status(400).json({ success: false, message: "Text should be 1-5000 character length" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        if (message.senderId.toString() !== currentUserId.toString()) {
            return res.status(403).json({ success: false, message: "You can only edit your own messages" });
        }

        if (message.deletedForEveryoneAt) {
            return res.status(400).json({ success: false, message: "Cannot edit deleted message" });
        }

        message.text = cleanText;
        message.editedAt = new Date();
        await message.save();
        await message.populate("senderId", "name profileUrl");

        emitToConversation(message.conversationId, "message:edited", {
            messageId: message._id,
            text: message.text,
            editedAt: message.editedAt,
            conversationId: message.conversationId.toString()
        });

        return res.status(200).json({ success: true, message });
    } catch (error) {
        console.error("editMessage error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteForMe = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { messageId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ success: false, message: "Invalid message ID" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Verify user is participant in the conversation
        const conversation = await Conversation.findOne({
            _id: message.conversationId,
            participants: { $elemMatch: { userId: currentUserId, leftAt: null } }
        });

        if (!conversation) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Add user to deletedFor array (atomic, idempotent)
        await Message.updateOne(
            { _id: messageId },
            { $addToSet: { deletedFor: currentUserId } }
        );

        return res.status(200).json({ success: true, message: "Message deleted for you" });
    } catch (error) {
        console.error("deleteForMe error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteForEveryone = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.userId;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: "Not found" });
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only sender can delete" });
        }
        if (message.deletedForEveryoneAt) {
            return res.status(400).json({ success: false, message: "Already deleted" });
        }

        const deletedAt = new Date();
        await Message.updateOne({ _id: messageId }, { $set: { deletedForEveryoneAt: deletedAt } });

        // Socket emit - realtime first
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
            conversation.participants.filter(p => !p.leftAt).forEach(p => {
                emitToUser(p.userId.toString(), "message:deleted", {
                    messageId: message._id,
                    deletedForEveryoneAt: deletedAt,
                    conversationId: message.conversationId.toString()
                });
            });
        }

        res.json({ success: true, deletedForEveryoneAt: deletedAt });

        // Background delete - no await after res, non-blocking
        if (message.attachments?.length > 0) {
            for (const att of message.attachments) {
                if (att.public_id) {
                    deleteFromCloudinary(att.public_id, att.resource_type, att.delivery_type).catch(err => {
                        console.error("Cloudinary delete failed:", att.public_id, err.message);
                    });
                }
            }
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};