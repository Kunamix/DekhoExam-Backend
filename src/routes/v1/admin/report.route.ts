import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  getAllReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  getReportStats,
} from "@/controllers/admin/report.controller";

const router = Router();

router.get("/", verifyToken, verifyAdmin, getAllReports);
router.get("/stats", verifyToken, verifyAdmin, getReportStats);
router.get("/:id", verifyToken, verifyAdmin, getReportById);
router.patch("/:id/status", verifyToken, verifyAdmin, updateReportStatus);
router.delete("/:id", verifyToken, verifyAdmin, deleteReport);

export default router;