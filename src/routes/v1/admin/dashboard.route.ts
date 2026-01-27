import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  getStats,
  getCharts,
  getAnalytics,
  getRecentUsers,
  getRecentPayments,
  getRecentTests,
} from "@/controllers/admin/dashboard.controller";

const router = Router();

router.get("/stats", verifyToken, verifyAdmin, getStats);
router.get("/charts", verifyToken, verifyAdmin, getCharts);
router.get("/analytics", verifyToken, verifyAdmin, getAnalytics);
router.get("/recent-users", verifyToken, verifyAdmin, getRecentUsers);
router.get("/recent-payments", verifyToken, verifyAdmin, getRecentPayments);
router.get("/recent-tests", verifyToken, verifyAdmin, getRecentTests);

export default router;