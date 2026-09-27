import express from "express";
import * as conversationController from "../../controllers/api/conversation.js";


const router = express.Router();

router.get("/", conversationController.getMyConversations)

router.get('/unread-count', conversationController.getTotalUnreadCount)

router.post("/direct", conversationController.createOrOpenDirectConversation);

router.post("/group", conversationController.createGroupConversation)

router.post("/:conversationId/read", conversationController.markAsRead)

router.post("/:conversationId/members", conversationController.addMembersToGroup);

router.post("/:conversationId/leave", conversationController.leaveGroup);

router.get('/online-users', conversationController.getOnlineUsersList);

router.put('/:conversationId/mute', conversationController.toggleMuteConversation);

router.put("/:conversationId/image", conversationController.uploadGroupImage);

router.delete("/:conversationId/image", conversationController.removeGroupImage);

router.put("/:conversationId/name", conversationController.updateGroupName)

router.put("/:conversationId/members/:userId/role", conversationController.updateMemberRole)

router.post("/:conversationId/members/:userId/remove", conversationController.removeMember)

router.get('/:conversationId', conversationController.getSingleConversation)    // this hould always be at the end

export default router;