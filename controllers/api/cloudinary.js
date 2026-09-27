import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import {
    ALLOWED_FOLDERS,
    FOLDER_RULES,
    deleteFromCloudinary,
    generateUploadSignature,
} from "../../services/cloudinaryService.js";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import Block from "../../models/Block.js";
import { emitToUser, isUserOnline } from "../../config/socket.js";

export const getUploadSignature = async (req, res) => {
    try {
        const { folder, conversationId } = req.body;
        const userId = req.userId;
        if (!folder || !Object.values(ALLOWED_FOLDERS).includes(folder)) {
            return res.status(400).json({ message: "Invalid folder" });
        }
        const isChatFolder = folder.startsWith("social-app/chat/");
        if (isChatFolder) {
            if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
                return res.status(400).json({ message: "conversationId required" });
            }
            const isParticipant = await Conversation.exists({
                _id: conversationId,
                participants: { $elemMatch: { userId, leftAt: null } },
            });
            if (!isParticipant) {
                return res.status(403).json({ message: "Not participant" });
            }
        }
        if (folder === ALLOWED_FOLDERS.GROUP_IMAGE) {
            if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
                return res.status(400).json({ message: "conversationId required" });
            }
            const isAdmin = await Conversation.exists({
                _id: conversationId,
                type: "group",
                participants: { $elemMatch: { userId, leftAt: null, role: "admin" } },
            });
            if (!isAdmin) {
                return res.status(403).json({ message: "Only admins" });
            }
        }
        return res.json(generateUploadSignature(folder));
    } catch (err) {
        console.error("Signature error:", err);
        return res.status(500).json({ message: "Failed to generate signature" });
    }
};


// Helper - deletes without blocking event loop
function cleanupFilesInBackground(files) {
    if (!Array.isArray(files) || files.length === 0) return;
    for (const f of files) {
        if (!f?.public_id || !f?.folder) continue;
        const rules = FOLDER_RULES[f.folder];
        if (!rules) continue;
        deleteFromCloudinary(f.public_id, rules.resource_type, rules.type).catch(() => { });
    }
}

export const saveChatMedia = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { files, text, replyTo } = req.body;
        const userId = req.userId;

        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files" });
        }
        if (files.length > 5) {
            cleanupFilesInBackground(files);
            return res.status(400).json({ success: false, message: "Max 5 files" });
        }
        if (text && text.trim().length > 5000) {
            cleanupFilesInBackground(files);
            return res.status(400).json({ success: false, message: "Text max 5000" });
        }
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            cleanupFilesInBackground(files);
            return res.status(400).json({ success: false, message: "Invalid conversationId" });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: { $elemMatch: { userId, leftAt: null } },
        });
        if (!conversation) {
            cleanupFilesInBackground(files);
            return res.status(403).json({ success: false, message: "Not participant" });
        }

        if (conversation.type === "direct") {
            const otherParticipant = conversation.participants.find((p) => p.userId.toString() !== userId.toString());
            if (!otherParticipant) {
                cleanupFilesInBackground(files);
                return res.status(400).json({ success: false, message: "Invalid conversation" });
            }
            const isBlocked = await Block.exists({
                $or: [
                    { blocker: userId, blocked: otherParticipant.userId },
                    { blocker: otherParticipant.userId, blocked: userId },
                ],
            });
            if (isBlocked) {
                cleanupFilesInBackground(files);
                return res.status(403).json({ success: false, message: "Blocked" });
            }
        }

        if (replyTo) {
            if (!mongoose.Types.ObjectId.isValid(replyTo)) {
                cleanupFilesInBackground(files);
                return res.status(400).json({ success: false, message: "Invalid replyTo" });
            }
            const exists = await Message.exists({ _id: replyTo, conversationId });
            if (!exists) {
                cleanupFilesInBackground(files);
                return res.status(400).json({ success: false, message: "Reply not in conversation" });
            }
        }

        const attachments = [];
        let totalSize = 0;
        for (const file of files) {
            const { public_id, folder, originalName, mimeType } = file;
            if (!public_id || !folder) throw new Error("Missing public_id/folder");
            const rules = FOLDER_RULES[folder];
            if (!rules) throw new Error("Invalid folder");
            if (!public_id.startsWith(`${folder}/`)) throw new Error("Folder mismatch");

            let resource;
            try {
                resource = await cloudinary.api.resource(public_id, {
                    resource_type: rules.resource_type,
                    type: rules.type,
                });
            } catch (err) {
                // Raw fallback: trust Cloudinary's own upload response fields sent by the client
                // (they originate from the XHR response, and folder/formats were signature-locked)
                if (rules.resource_type === "raw" && bytes) {
                    resource = {
                        public_id: public_id,
                        resource_type: "raw",
                        type: rules.type,
                        bytes: bytes,
                        format: public_id.split(".").pop()?.toLowerCase(),
                    };
                } else {
                    throw new Error(`File not found: ${public_id}`);
                }
            }

            const actualFormat = rules.resource_type === "raw" ? public_id.split(".").pop()?.toLowerCase() : resource.format?.toLowerCase();
            if (!actualFormat || !rules.allowed_formats.includes(actualFormat)) {
                cleanupFilesInBackground(files);
                throw new Error(`Invalid format: ${actualFormat || "unknown"}`);
            }
            if (resource.bytes > rules.max_bytes) {
                cleanupFilesInBackground(files);
                throw new Error(`File too large: ${originalName || public_id}`);
            }
            totalSize += resource.bytes;
            if (totalSize > 25 * 1024 * 1024) {
                cleanupFilesInBackground(files);
                throw new Error("Total exceeds 25MB");
            }

            let attachmentType = "image";
            if (resource.resource_type === "video") attachmentType = "video";
            if (resource.resource_type === "raw") attachmentType = "file";

            attachments.push({
                type: attachmentType,
                public_id: resource.public_id,
                resource_type: resource.resource_type,
                delivery_type: resource.type || rules.type,
                format: actualFormat,
                size: resource.bytes,
                originalName: typeof originalName === "string" && originalName.trim() ? originalName.trim() : resource.public_id.split("/").pop(),
                mimeType: typeof mimeType === "string" && mimeType.trim() ? mimeType.trim() : "application/octet-stream",
            });
        }

        let message = await Message.create({
            conversationId,
            senderId: userId,
            text: text?.trim() || "",
            attachments,
            replyTo: replyTo || null,
        });

        await Conversation.updateOne({ _id: conversationId }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } });
        await Conversation.updateOne({ _id: conversationId }, { $set: { "participants.$[elem].lastReadAt": new Date() } }, { arrayFilters: [{ "elem.userId": userId, "elem.leftAt": null }] });

        message = await message.populate([
            { path: "senderId", select: "name profileUrl" },
            { path: "replyTo", select: "text attachments senderId createdAt deletedForEveryoneAt", populate: { path: "senderId", select: "name profileUrl" } },
        ]);

        conversation.participants.filter((p) => !p.leftAt).forEach((p) => emitToUser(p.userId.toString(), "message:new", { message }));
        if (conversation.type === "direct") {
            const recipientId = conversation.participants.find((p) => p.userId.toString() !== userId.toString())?.userId;
            if (recipientId && isUserOnline(recipientId)) {
                emitToUser(userId.toString(), "message:delivered", { messageId: message._id.toString(), conversationId });
            }
        }

        return res.status(201).json({ success: true, data: message });
    } catch (err) {
        console.error("saveChatMedia error:", err);
        cleanupFilesInBackground(req.body?.files || []);
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const cleanupChatUploads = async (req, res) => {
    try {
        const { public_ids } = req.body;
        if (!Array.isArray(public_ids) || public_ids.length === 0) {
            return res.json({ success: true });
        }
        for (const publicId of public_ids) {
            if (typeof publicId !== "string" || !publicId.trim()) {
                continue;
            }
            const folder = publicId.split("/").slice(0, -1).join("/");
            const rules = FOLDER_RULES[folder];
            if (!rules) {
                continue;
            }
            await deleteFromCloudinary(publicId, rules.resource_type, rules.type).catch(() => { });
        }
        return res.json({ success: true });
    } catch (err) {
        console.error("cleanupChatUploads error:", err);
        return res.status(500).json({ message: "Cleanup failed" });
    }
};