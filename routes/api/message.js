import express from "express";
import * as messageController from "../../controllers/api/message.js"
import { saveChatMedia } from "../../controllers/api/cloudinary.js";

const router = express.Router();

router.get("/:conversationId/messages", messageController.getConversationMessages)

router.post("/:conversationId/messages", messageController.sendTextMessage);

router.put("/messages/:messageId", messageController.editMessage);

router.delete("/messages/:messageId/me", messageController.deleteForMe);

router.delete("/messages/:messageId/everyone", messageController.deleteForEveryone);


// ADD this line
router.post("/:conversationId/messages/media/cloudinary", saveChatMedia);

export default router;