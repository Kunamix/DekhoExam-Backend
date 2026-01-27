import { Router } from "express";
import { verifyToken } from "@/middlewares";
import { getMe, login, logout, verifyOTP } from "@/controllers/mobile/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

export default router;
