import { Router } from "express";
import { verifyToken } from "@/middlewares";
import { getAllPlans, getMySubscriptions, getPlanById } from "@/controllers/mobile/subscription.controller";

const router = Router();

router.get("/plans", verifyToken, getAllPlans);
router.get("/plans/:id", verifyToken, getPlanById);
router.get("/my", verifyToken, getMySubscriptions);

export default router;