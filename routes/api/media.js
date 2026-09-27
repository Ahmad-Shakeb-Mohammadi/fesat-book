import express from "express";
import * as mediaController from "../../controllers/api/media.js";
const router = express.Router();

router.post("/access", mediaController.getMediaAccess);

export default router;