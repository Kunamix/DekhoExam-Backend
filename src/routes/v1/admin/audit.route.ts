import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  getAllAuditLogs,
  getAuditLogById,
  exportAuditLogs,
} from "@/controllers/admin/audit.controller";

const router = Router();

router.get("/", verifyToken, verifyAdmin, getAllAuditLogs);
router.get("/export", verifyToken, verifyAdmin, exportAuditLogs);
router.get("/:id", verifyToken, verifyAdmin, getAuditLogById);

export default router;