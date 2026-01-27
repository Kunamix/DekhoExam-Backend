import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  getSubscriptionStats,
  updatePlan,
  deletePlan,
  toggleStatus,
} from "@/controllers/admin/subscription.controller";
import {
  cancelSubscription,
  createUserSubscription,
  extendSubscription,
  getAllUserSubscriptions,
} from "@/controllers/admin/user-subscription.controller";

const router = Router();

// Plans
router.post("/plans/create", verifyToken, verifyAdmin, createPlan);
router.get("/plans", verifyToken, verifyAdmin, getAllPlans);
router.get("/plans/stats", verifyToken, verifyAdmin, getSubscriptionStats);
router.get("/plans/:id", verifyToken, verifyAdmin, getPlanById);
router.put("/plans/:id", verifyToken, verifyAdmin, updatePlan);
router.patch(
  "/plans/:id/toggle-status",
  verifyToken,
  verifyAdmin,
  toggleStatus,
);
router.delete("/plans/:id", verifyToken, verifyAdmin, deletePlan);

// User Subscriptions
router.post("/users", verifyToken, verifyAdmin, createUserSubscription);
router.get("/users", verifyToken, verifyAdmin, getAllUserSubscriptions);
router.patch("/users/:id/extend", verifyToken, verifyAdmin, extendSubscription);
router.patch("/users/:id/cancel", verifyToken, verifyAdmin, cancelSubscription);

export default router;
