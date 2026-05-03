import { getGlobalRankings, getTestRankings, updatePassword, updateProfile } from "@/controllers/mobile/profile.controller";
import { verifyToken } from "@/middlewares";
import { Router } from "express";

const router = Router();

router.put("/password", verifyToken, updatePassword);
router.put("/", verifyToken, updateProfile);
// router.post("/avatar", verifyToken, upload.single("avatar"), uploadAvatar);
// router.delete("/", verifyToken, deleteAccount);
router.get('/api/rankings/global', verifyToken, getGlobalRankings);
router.get('/tests/:testId/rankings', verifyToken, getTestRankings);

export default router;