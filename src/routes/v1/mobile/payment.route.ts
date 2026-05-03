import { Router } from "express";
import { verifyToken } from "@/middlewares";
import { createPaymentOrder, getPaymentById, getPaymentHistory, verifyPayment } from "@/controllers/mobile/payment.controller";

const router = Router();

router.post("/create-order", verifyToken, createPaymentOrder);
router.post("/verify", verifyToken, verifyPayment);
router.get("/history", verifyToken, getPaymentHistory);
router.get("/:id", verifyToken, getPaymentById);

export default router;