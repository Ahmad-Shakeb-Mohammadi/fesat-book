import express  from "express";
import * as settingController from "../../controllers/api/setting.js";
import { body } from "express-validator";

const router = express.Router();

router.put("/setting/personalInformation",
body("name")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Name must be between 3 and 30 characters"),
    body("country").trim().isLength({ min: 3, max: 30 }).withMessage("Country must be between 3 and 30 characters").matches(/^[a-zA-Z\s]+$/).withMessage('Numbers arent allowed'),
    body("city").trim().isLength({ min: 3, max: 30 }).withMessage("City must be between 3 and 30 characters").matches(/^[a-zA-Z\s]+$/).withMessage('Numbers arent allowed'),
    body("job").trim().isLength({min: 3, max: 45}).withMessage("Job must be between 3 and 45 characters").matches(/^[a-zA-Z\s]+$/).withMessage('Numbers arent allowed'),
    body("gender").trim().isLength({ min: 3, max: 30 }).withMessage("Gender must be between 3 and 30 characters").matches(/^[a-zA-Z\s]+$/).withMessage('Numbers arent allowed'),
    settingController.updatePersonalInforamtion
)

router.post("/setting/removeCover",settingController.removeCoverPhoto)
router.post("/setting/removeProfile",settingController.removeProfilePhoto)
router.get("/setting/blockedPeople",settingController.getBlockedPeople)
router.post("/setting/unblock",settingController.postUnblockUser)

router.post("/setting/changePassword",
    body("oldPassword").trim().isLength({min: 8, max: 45}).withMessage("Password must be between 8 and 45 characters"),
    body("newPassword").trim().isLength({min: 8, max: 45}).withMessage("Password must be between 8 and 45 characters"),
    settingController.postChangePassword
)

router.post("/setting/changeEmail",
    body("newEmail").isEmail().normalizeEmail(),
    body("currentPassword").trim().isLength({min: 8,max: 45}).withMessage("Password must be between 8 and 45 characters"),
    settingController.postChangeEmail
)

router.post("/setting/logout",settingController.postLogout)

router.delete("/setting/deleteAccount",settingController.deleteAccount)

export default router;