import mongoose from "mongoose";
import Conversation from "../../models/Conversation.js";
import Block from "../../models/Block.js";
import Message from "../../models/Message.js";
import { emitToConversation, emitToUser, emitToUsers, getOnlineUsers } from "../../config/socket.js";
import cloudinary from "../../config/cloudinary.js";
import { ALLOWED_FOLDERS, FOLDER_RULES, deleteFromCloudinary, generatePublicUrl } from "../../services/cloudinaryService.js";


/**
 * Reusable notifier for ANY group mutation (photo, name, members, admin...)
 * Excludes the actor (they already have optimistic local update)
 */
async function notifyGroupUpdate(conversation, excludeUserId) {
  await conversation.populate("participants.userId", "name profileUrl job");

  const recipientIds = conversation.participants
    .filter(p => !p.leftAt && p.userId._id.toString() !== excludeUserId.toString())
    .map(p => p.userId._id.toString());

  emitToUsers(recipientIds, "conversation:updated", { conversation });
}

// we will do optimization when needed like only get onlineusers that are in conversation with req.userid....
export const getOnlineUsersList = async function (req, res, next) {
  try {
    const onlineUsers = getOnlineUsers();
    res.json({ success: true, onlineUsers: Array.from(onlineUsers) });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Failed to fetch online users' });
  }
};

export const createOrOpenDirectConversation = async (req, res, next) => {
  try {
    const currentUserId = req.userId;
    const { recipientId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "Valid recipientId is required"
      });
    }

    if (currentUserId.toString() === recipientId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a conversation with yourself"
      });
    }

    const isBlocked = await Block.findOne({
      $or: [
        {
          blocker: currentUserId,
          blocked: recipientId
        },
        {
          blocker: recipientId,
          blocked: currentUserId
        }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Conversation is not allowed between these users"
      });
    }

    const participantIds = [
      currentUserId.toString(),
      recipientId.toString()
    ].sort();

    const directKey = participantIds.join("_");

    let conversation = await Conversation.findOne({
      type: "direct",
      directKey
    })
      .populate("participants.userId", "name profileUrl job")
      .populate("lastMessage");

    if (conversation) {
      return res.status(200).json({
        success: true,
        message: "Conversation opened",
        conversation
      });
    }

    try {
      conversation = await Conversation.create({
        type: "direct",
        participants: participantIds.map((id) => ({
          userId: id,
          role: "member"
        })),
        createdBy: currentUserId
      });
    } catch (error) {
      if (error.code === 11000) {
        conversation = await Conversation.findOne({
          type: "direct",
          directKey
        })
          .populate("participants.userId", "name profileUrl job")
          .populate("lastMessage");

        return res.status(200).json({
          success: true,
          message: "Conversation opened",
          conversation
        });
      }

      throw error;
    }

    conversation = await conversation.populate(
      "participants.userId",
      "name profileUrl job"
    );

    // Notify the other participant about the new conversation
    emitToUser(recipientId, "conversation:new", { conversation });

    return res.status(201).json({
      success: true,
      message: "Conversation created",
      conversation
    });
  } catch (error) {
    console.error('createconversationError', error)
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createGroupConversation = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { name, participantIds } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 45) {
      return res.status(400).json({ success: false, message: "Group name must be 2-45 characters" });
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one participant required" });
    }

    // Dedupe: include creator + provided participants
    const uniqueIds = [...new Set([currentUserId.toString(), ...participantIds.map(String)])];

    if (uniqueIds.length < 2) {
      return res.status(400).json({ success: false, message: "Group needs at least 2 participants" });
    }

    if (!uniqueIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: "Invalid participant ID format" });
    }

    const otherIds = uniqueIds.filter(id => id !== currentUserId.toString());
    const blocks = await Block.find({
      $or: [
        { blocker: currentUserId, blocked: { $in: otherIds } },
        { blocker: { $in: otherIds }, blocked: currentUserId }
      ]
    }).lean();

    if (blocks.length > 0) {
      return res.status(403).json({ success: false, message: "Cannot create group with blocked users" });
    }

    // Build participants array: creator = admin, others = member
    const participants = uniqueIds.map(id => ({
      userId: id,
      role: id === currentUserId.toString() ? "admin" : "member"
    }));

    const conversation = await Conversation.create({
      type: "group",
      name: name.trim(),
      participants,
      createdBy: currentUserId
    });

    // Populate participant details
    await conversation.populate("participants.userId", "name profileUrl job");
    // Notify all participants about the new group
    const participantUserIds = uniqueIds.filter(id => id !== currentUserId.toString());
    emitToUsers(participantUserIds, "conversation:new", { conversation });

    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    console.error("createGroupConversation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const skip = (page - 1) * limit;

    const filter = { participants: { $elemMatch: { userId: currentUserId, leftAt: null } } };

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("participants.userId", "name profileUrl job")
      .populate({ path: "lastMessage", populate: { path: "senderId", select: "name profileUrl" } })
      .lean();

    const count = await Conversation.countDocuments(filter);

    if (conversations.length > 0) {
      const unreadConditions = conversations.map(conv => {
        const userParticipant = conv.participants.find(p => p.userId._id.toString() === currentUserId.toString());
        const lastReadAt = userParticipant?.lastReadAt || new Date(0);
        return {
          conversationId: conv._id,
          createdAt: { $gt: lastReadAt },
          senderId: { $ne: currentUserId },
          deletedFor: { $ne: currentUserId },
        };
      });

      const unreadCounts = await Message.aggregate([
        { $match: { $or: unreadConditions } },
        { $group: { _id: "$conversationId", count: { $sum: 1 } } }
      ]);

      const unreadMap = new Map(unreadCounts.map(u => [u._id.toString(), u.count]));
      conversations.forEach(conv => {
        const userParticipant = conv.participants.find(p => p.userId._id.toString() === currentUserId.toString());
        conv.unreadCount = unreadMap.get(conv._id.toString()) || 0;
        conv.isMuted = userParticipant?.isMuted || false;
      });
    }

    return res.status(200).json({ success: true, page, limit, count, conversations });
  } catch (error) {
    console.error("getMyConversations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getTotalUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const conversations = await Conversation.find({
      participants: { $elemMatch: { userId: currentUserId, leftAt: null } }
    }).select('_id participants').lean();

    if (conversations.length === 0) return res.status(200).json({ success: true, totalUnread: 0 });

    const unreadConditions = conversations.map(conv => {
      const userParticipant = conv.participants.find(p => p.userId.toString() === currentUserId.toString() && !p.leftAt);
      const lastReadAt = userParticipant?.lastReadAt || new Date(0);
      const isMuted = userParticipant?.isMuted || false;
      if (isMuted) return null;
      return {
        conversationId: conv._id,
        createdAt: { $gt: lastReadAt },
        senderId: { $ne: currentUserId },
        deletedFor: { $ne: currentUserId },
      };
    }).filter(c => c !== null);

    const totalUnread = unreadConditions.length > 0 ? await Message.countDocuments({ $or: unreadConditions }) : 0;
    return res.status(200).json({ success: true, totalUnread });
  } catch (error) {
    console.error("getTotalUnreadCount error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add this new function to your conversations.js controller:
export const toggleMuteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    // Find conversation and user's participant record
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $elemMatch: { userId: currentUserId, leftAt: null } }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found or access denied" });
    }

    // Get current mute status
    const userParticipant = conversation.participants.find(
      p => p.userId.toString() === currentUserId.toString() && !p.leftAt
    );

    const currentMuteStatus = userParticipant?.isMuted || false;
    const newMuteStatus = !currentMuteStatus;

    // Update mute status
    await Conversation.updateOne(
      {
        _id: conversationId,
        "participants.userId": currentUserId,
        "participants.leftAt": null
      },
      {
        $set: { "participants.$.isMuted": newMuteStatus }
      }
    );

    return res.status(200).json({
      success: true,
      message: newMuteStatus ? "Conversation muted" : "Conversation unmuted",
      isMuted: newMuteStatus
    });
  } catch (error) {
    console.error("toggleMuteConversation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const executionTime = new Date();

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        participants: { $elemMatch: { userId: currentUserId, leftAt: null } }
      },
      {
        $set: { "participants.$[elem].lastReadAt": executionTime }
      },
      {
        arrayFilters: [{ "elem.userId": currentUserId, "elem.leftAt": null }],
        returnDocument: "after",
        select: "type participants",
        lean: true
      }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found or access denied" });
    }

    const eventData = {
      conversationId,
      userId: currentUserId,
      lastReadAt: executionTime
    };

    if (conversation.type === "direct") {
      const otherParticipant = conversation.participants.find(
        p => p.userId.toString() !== currentUserId.toString()
      );
      if (otherParticipant) {
        emitToUser(otherParticipant.userId.toString(), "conversation:read", eventData);
      }
    } else {
      emitToConversation(conversationId, "conversation:read", eventData);
    }

    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addMembersToGroup = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one participant ID required" });
    }
    if (!participantIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: "Invalid participant ID format" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (conversation.type !== "group") return res.status(400).json({ success: false, message: "Can only add members to group conversations" });

    const currentParticipant = conversation.participants.find(p => p.userId.toString() === currentUserId.toString() && !p.leftAt);
    if (!currentParticipant || currentParticipant.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can add members" });
    }

    const activeIds = new Set(conversation.participants.filter(p => !p.leftAt).map(p => p.userId.toString()));
    const leftIds = new Set(conversation.participants.filter(p => p.leftAt).map(p => p.userId.toString()));
    const toAddIds = participantIds.filter(id => !activeIds.has(id.toString()));
    if (toAddIds.length === 0) return res.status(400).json({ success: false, message: "All users are already participants" });

    const blocks = await Block.find({
      $or: [{ blocker: currentUserId, blocked: { $in: toAddIds } }, { blocker: { $in: toAddIds }, blocked: currentUserId }]
    }).lean();
    if (blocks.length > 0) return res.status(403).json({ success: false, message: "Cannot add blocked users" });

    const rejoinIds = toAddIds.filter(id => leftIds.has(id.toString()));
    const newIds = toAddIds.filter(id => !leftIds.has(id.toString()));
    const updateOps = [];

    for (const userId of rejoinIds) {
      updateOps.push({
        updateOne: {
          filter: { _id: conversationId, "participants.userId": userId },
          update: { $set: { "participants.$.leftAt": null, "participants.$.joinedAt": new Date(), "participants.$.lastReadAt": new Date() } }
        }
      });
    }

    if (newIds.length > 0) {
      const newParticipants = newIds.map(id => ({
        userId: id,
        role: "member",
        joinedAt: new Date(),
        leftAt: null,
        lastReadAt: new Date()
      }));
      updateOps.push({
        updateOne: {
          filter: { _id: conversationId },
          update: { $push: { participants: { $each: newParticipants } } }
        }
      });
    }

    if (updateOps.length > 0) await Conversation.bulkWrite(updateOps);

    const updatedConversation = await Conversation.findById(conversationId)
      .populate("participants.userId", "name profileUrl job")
      .lean();

    emitToUsers(toAddIds, "conversation:new", { conversation: updatedConversation });
    const existingMemberIds = [...activeIds].filter(id => id !== currentUserId.toString());
    emitToUsers(existingMemberIds, "conversation:updated", { conversation: updatedConversation });

    return res.status(200).json({ success: true, conversation: updatedConversation });
  } catch (error) {
    console.error("addMembersToGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getSingleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.userId;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $elemMatch: { userId: currentUserId, leftAt: null } }
    }).populate("participants.userId", "name profileUrl job").populate({ path: "lastMessage", populate: { path: "senderId", select: "name profileUrl" } }).lean();
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    const userParticipant = conversation.participants.find(p => p.userId._id.toString() === currentUserId.toString());
    const lastReadAt = userParticipant?.lastReadAt || new Date(0);
    const isMuted = userParticipant?.isMuted || false;
    const unreadCount = await Message.countDocuments({ conversationId: conversation._id, createdAt: { $gt: lastReadAt }, senderId: { $ne: currentUserId }, deletedFor: { $ne: currentUserId } });
    conversation.unreadCount = unreadCount;
    conversation.isMuted = isMuted;
    res.json({ success: true, conversation });
  } catch (error) {
    console.error("getConversation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export const uploadGroupImage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { public_id } = req.body;
    const userId = req.userId;

    if (!public_id) return res.status(400).json({ success: false, message: "public_id required" });
    if (!public_id.startsWith(ALLOWED_FOLDERS.GROUP_IMAGE + "/")) {
      return res.status(400).json({ success: false, message: "Invalid folder" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      participants: { $elemMatch: { userId, leftAt: null, role: "admin" } }
    });
    if (!conversation) return res.status(403).json({ success: false, message: "Only admins" });

    let resource;
    try {
      resource = await cloudinary.api.resource(public_id, { resource_type: "image", type: "upload" });
    } catch {
      return res.status(400).json({ success: false, message: "Image not found" });
    }

    if (conversation.imageUrl && conversation.imagePublicId) {
      await deleteFromCloudinary(conversation.imagePublicId, "image", "upload").catch(() => { });
    }

    conversation.imagePublicId = resource.public_id;
    conversation.imageUrl = generatePublicUrl(resource.public_id, "image", 400);
    await conversation.save();

    await notifyGroupUpdate(conversation, userId);

    res.json({ success: true, imageUrl: conversation.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeGroupImage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      participants: { $elemMatch: { userId, leftAt: null, role: "admin" } }
    });
    if (!conversation) return res.status(403).json({ success: false, message: "Only admins" });

    if (conversation.imageUrl === '/images/default-group.png') {
      return res.status(400).json({ success: false, message: "No custom image to remove" });
    }

    if (conversation.imagePublicId) {
      await deleteFromCloudinary(conversation.imagePublicId, "image", "upload").catch(() => { });
    }

    conversation.imageUrl = '/images/default-group.png';
    conversation.imagePublicId = null;
    await conversation.save();

    await notifyGroupUpdate(conversation, userId);

    res.json({ success: true, imageUrl: conversation.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateGroupName = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.userId;
    const { name } = req.body;

    // Validate name
    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: "Group name must be at least 2 characters" });
    }

    if (trimmedName.length > 45) {
      return res.status(400).json({ success: false, message: "Group name too long (max 45 characters)" });
    }

    // Find group and verify admin permission
    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      participants: { $elemMatch: { userId: currentUserId, leftAt: null, role: "admin" } }
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: "Only admins can change group name" });
    }

    // Update name
    conversation.name = trimmedName;
    await conversation.save();

    // Notify all participants
    await notifyGroupUpdate(conversation, currentUserId);

    return res.status(200).json({
      success: true,
      message: "Group name updated",
      name: trimmedName
    });
  } catch (error) {
    console.error("updateGroupName error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'admin' or 'member'" });
    }

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot change your own role" });
    }

    // 1. Fetch genuine Mongoose document (do NOT use .lean())
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // 2. Verify the actor is an active admin
    const actorParticipant = conversation.participants.find(
      p => p.userId.toString() === currentUserId.toString() && !p.leftAt
    );
    if (!actorParticipant || actorParticipant.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can change roles" });
    }

    // 3. Find the target member
    const targetParticipant = conversation.participants.find(
      p => p.userId.toString() === userId.toString() && !p.leftAt
    );
    if (!targetParticipant) {
      return res.status(404).json({ success: false, message: "User is not an active member" });
    }

    if (targetParticipant.role === role) {
      return res.status(400).json({ success: false, message: `User is already ${role}` });
    }

    // 4. Prevent demoting the last admin
    if (role === "member") {
      const activeAdmins = conversation.participants.filter(
        p => !p.leftAt && p.role === "admin"
      );
      if (activeAdmins.length <= 1 && targetParticipant.role === "admin") {
        return res.status(400).json({ success: false, message: "Cannot demote the last admin" });
      }
    }

    // Creator protection: nobody can demote the group creator
    if (userId.toString() === conversation.createdBy.toString() && role === "member") {
      return res.status(403).json({ success: false, message: "Cannot demote the group creator" });
    }

    // 5. Update role directly on the Mongoose document and save
    targetParticipant.role = role;
    await conversation.save();

    // 6. notifyGroupUpdate will now have access to .populate()
    await notifyGroupUpdate(conversation, currentUserId);

    return res.status(200).json({
      success: true,
      message: `User is now ${role}`,
      conversation
    });
  } catch (error) {
    console.error("updateMemberRole error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ success: false, message: "Can only leave group conversations" });
    }

    // 1. Verify active membership
    const currentParticipant = conversation.participants.find(
      p => p.userId.toString() === currentUserId.toString() && !p.leftAt
    );

    if (!currentParticipant) {
      return res.status(403).json({ success: false, message: "You are not an active member of this group" });
    }

    // 2. Calculate remaining active participants after leaving
    const activeParticipants = conversation.participants.filter(p => !p.leftAt);
    const remainingParticipants = activeParticipants.filter(
      p => p.userId.toString() !== currentUserId.toString()
    );

    // CASE 1: GROUP DISSOLUTION (< 2 active members remain)
    if (remainingParticipants.length < 2) {
      // Clean up uploaded group photo if custom
      if (conversation.imagePublicId) {
        await deleteFromCloudinary(conversation.imagePublicId, "image", "upload").catch(() => { });
      }

      const messages = await Message.find({ conversationId }).select('attachments').lean();
      const publicIds = messages.flatMap(m => m.attachments.map(a => a.public_id)).filter(Boolean);
      // Delete all messages and the conversation permanently
      await Promise.all([
        Message.deleteMany({ conversationId }),
        Conversation.findByIdAndDelete(conversationId)
      ]);

      // Notify the last lone member (if 1 person was left behind)
      if (remainingParticipants.length === 1) {
        emitToUser(
          remainingParticipants[0].userId.toString(),
          "conversation:deleted",
          { conversationId }
        );
      }

      res.status(200).json({
        success: true,
        message: "Group dissolved as not enough members remain",
        dissolved: true
      });

      if (publicIds.length > 0) {
        cloudinary.api.delete_resources(publicIds, { resource_type: 'image', type: 'authenticated' }).catch(() => { });
        cloudinary.api.delete_resources(publicIds, { resource_type: 'video', type: 'authenticated' }).catch(() => { });
        cloudinary.api.delete_resources(publicIds, { resource_type: 'raw', type: 'authenticated' }).catch(() => { });
      }
      return;
    }

    // CASE 2: NORMAL LEAVE (2 or more members remain)
    const activeAdmins = activeParticipants.filter(p => p.role === "admin");
    const isLastAdmin = currentParticipant.role === "admin" && activeAdmins.length === 1;

    const updateOps = [];

    // If leaver was the only admin, auto-promote the first remaining member
    if (isLastAdmin) {
      const memberToPromote = remainingParticipants.find(p => p.role === "member");
      if (memberToPromote) {
        updateOps.push({
          updateOne: {
            filter: { _id: conversationId, "participants.userId": memberToPromote.userId },
            update: { $set: { "participants.$.role": "admin" } }
          }
        });
      }
    }

    // Mark current user as left
    updateOps.push({
      updateOne: {
        filter: { _id: conversationId, "participants.userId": currentUserId },
        update: { $set: { "participants.$.leftAt": new Date() } }
      }
    });

    await Conversation.bulkWrite(updateOps);

    // Fetch fresh populated conversation
    const updatedConversation = await Conversation.findById(conversationId)
      .populate("participants.userId", "name profileUrl job")
      .lean();

    // Notify all remaining members
    const remainingIds = remainingParticipants.map(p => p.userId.toString());
    emitToUsers(remainingIds, "conversation:updated", { conversation: updatedConversation });

    return res.status(200).json({
      success: true,
      message: "Left group successfully",
      conversation: updatedConversation
    });
  } catch (error) {
    console.error("leaveGroup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot remove yourself. Use leave group instead." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // 1. Verify actor is an active admin
    const actorParticipant = conversation.participants.find(
      p => p.userId.toString() === currentUserId.toString() && !p.leftAt
    );
    if (!actorParticipant || actorParticipant.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can remove members" });
    }

    // 2. Find target member
    const targetParticipant = conversation.participants.find(
      p => p.userId.toString() === userId.toString() && !p.leftAt
    );
    if (!targetParticipant) {
      return res.status(404).json({ success: false, message: "User is not an active member" });
    }

    // 3. Creator protection: nobody can remove the group creator
    if (userId.toString() === conversation.createdBy.toString()) {
      return res.status(403).json({ success: false, message: "Cannot remove the group creator" });
    }

    // 4. Calculate active members remaining AFTER this removal
    const activeParticipants = conversation.participants.filter(p => !p.leftAt);
    const remainingParticipants = activeParticipants.filter(
      p => p.userId.toString() !== userId.toString()
    );

    // CASE 1: GROUP DISSOLUTION (< 2 active members remain)
    if (remainingParticipants.length < 2) {
      // Clean up custom group photo
      if (conversation.imagePublicId) {
        await deleteFromCloudinary(conversation.imagePublicId, "image", "upload").catch(() => { });
      }

      // 2. Background bulk delete (1 API call for 100 files, not 5000 loops)
      const messages = await Message.find({ conversationId }).select('attachments').lean();
      const publicIds = messages.flatMap(m => m.attachments.map(a => a.public_id)).filter(Boolean);

      await Promise.all([
        Message.deleteMany({ conversationId }),
        Conversation.findByIdAndDelete(conversationId)
      ]);

      res.status(200).json({
        success: true,
        message: "Member removed and group dissolved (less than 2 members remain)",
        dissolved: true,
        conversationId
      });
      emitToUser(userId, "conversation:deleted", { conversationId });

      if (publicIds.length > 0) {
        cloudinary.api.delete_resources(publicIds, { resource_type: 'image', type: 'authenticated' }).catch(() => { });
        cloudinary.api.delete_resources(publicIds, { resource_type: 'video', type: 'authenticated' }).catch(() => { });
        cloudinary.api.delete_resources(publicIds, { resource_type: 'raw', type: 'authenticated' }).catch(() => { });
      }
      return;
    }

    // CASE 2: NORMAL REMOVE (2 or more members remain)    
    // Last admin guard: cannot remove the only other admin if 2+ members remain
    if (targetParticipant.role === "admin") {
      const activeAdmins = activeParticipants.filter(p => p.role === "admin");
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove the last admin" });
      }
    }

    // Mark the member as left
    await Conversation.updateOne(
      { _id: conversationId, "participants.userId": userId },
      { $set: { "participants.$.leftAt": new Date() } }
    );

    const updatedConversation = await Conversation.findById(conversationId)
      .populate("participants.userId", "name profileUrl job")
      .lean();

    // Notify the removed user (their client will auto-close the active chat)
    emitToUser(userId, "conversation:updated", { conversation: updatedConversation });

    // Notify other remaining members
    const otherMemberIds = remainingParticipants
      .filter(p => p.userId.toString() !== currentUserId.toString())
      .map(p => p.userId.toString());

    if (otherMemberIds.length > 0) {
      emitToUsers(otherMemberIds, "conversation:updated", { conversation: updatedConversation });
    }

    return res.status(200).json({
      success: true,
      message: "Member removed",
      conversation: updatedConversation
    });
  } catch (error) {
    console.error("removeMember error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};