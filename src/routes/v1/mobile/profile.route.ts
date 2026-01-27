import { updatePassword, updateProfile } from "@/controllers/mobile/profile.controller";
import { verifyToken } from "@/middlewares";
import { Router } from "express";

const router = Router();

router.put("/password", verifyToken, updatePassword);
router.put("/", verifyToken, updateProfile);
// router.post("/avatar", verifyToken, upload.single("avatar"), uploadAvatar);
// router.delete("/", verifyToken, deleteAccount);

export default router;