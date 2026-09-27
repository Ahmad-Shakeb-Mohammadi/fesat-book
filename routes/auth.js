import express from "express";
import * as authController from "../controllers/auth.js";
import { body } from "express-validator";
import { generateUploadSignature, ALLOWED_FOLDERS } from "../services/cloudinaryService.js";


const router = express.Router()

router.post("/signup",
    body("email").isEmail().normalizeEmail(),
    body("password").trim().isLength({ min: 8 }),
    body("name").trim().isLength({ min: 3 }),
    body("country").trim().isLength({ min: 3 }).matches(/^[a-zA-Z\s]+$/).withMessage('Numbers and symbols arent allowed'),
    body("city").trim().isLength({ min: 3 }).matches(/^[a-zA-Z\s]+$/).withMessage('Numbers and symbols arent allowed'),
    body("gender").trim().isLength({ min: 3 }).matches(/^[a-zA-Z\s]+$/).withMessage('Numbers and symbols arent allowed')
    , authController.postSignUp
)

// ADD public signature route for signup (no auth)
router.post("/cloudinary/signup-signature", (req, res) => {
    try {
        const data = generateUploadSignature(ALLOWED_FOLDERS.PROFILE);
        res.json(data);
    } catch (err) {
        res.status(400).json({ message: "Failed" });
    }
});

router.post("/login",
    body("email").isEmail().normalizeEmail(),
    authController.postLogin
)

router.post("/auth/refresh", authController.postRefresh)


export default router;