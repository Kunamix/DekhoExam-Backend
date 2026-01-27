import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  getAllUsers,
  getUserById,
  getUserStats,
  searchUsers,
  updateProfile,
  toggleUserBan,
  deleteUser,
  resetUserFreeTests,
  invalidateUserSessions,
} from "@/controllers/admin/user.controller";

const router = Router();

router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.get("/stats", verifyToken, verifyAdmin, getUserStats);
router.get("/search", verifyToken, verifyAdmin, searchUsers);
router.get("/:id", verifyToken, verifyAdmin, getUserById);
router.put("/update-profile", verifyToken, verifyAdmin, updateProfile);
router.patch("/:id/toggle-ban", verifyToken, verifyAdmin, toggleUserBan);
router.patch("/:id/reset-free-tests", verifyToken, verifyAdmin, resetUserFreeTests);
router.post("/:id/invalidate-sessions", verifyToken, verifyAdmin, invalidateUserSessions);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

// router.get("/:id/activity", verifyToken, verifyAdmin, getUserActivity);
// router.get("/export", verifyToken, verifyAdmin, exportUsers);
export default router;