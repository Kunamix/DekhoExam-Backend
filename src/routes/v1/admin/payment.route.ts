import { Router } from "express";
import { verifyToken, verifyAdmin } from "@/middlewares/auth.middleware";
import {
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  exportPayments,
  refundPayment,
} from "@/controllers/admin/payment.controller";

const router = Router();

router.get("/", verifyToken, verifyAdmin, getAllPayments);
router.get("/stats", verifyToken, verifyAdmin, getPaymentStats);
router.get("/export", verifyToken, verifyAdmin, exportPayments);
router.get("/:id", verifyToken, verifyAdmin, getPaymentById);
router.post("/:id/refund", verifyToken, verifyAdmin, refundPayment);

export default router;