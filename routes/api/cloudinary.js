import express from "express";
import { getUploadSignature , cleanupChatUploads} from "../../controllers/api/cloudinary.js";
const router = express.Router();

router.post("/signature", getUploadSignature);
router.post("/cleanup", cleanupChatUploads);

export default router;