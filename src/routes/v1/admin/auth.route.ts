import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  login,
  verifyOTP,
  refreshToken,
  logout,
  getMe,
} from "@/controllers/admin/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyToken, verifyAdmin, logout);
router.get("/me", verifyToken, verifyAdmin, getMe);

export default router;
