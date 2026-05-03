import { Router } from "express";
import mobileRoutes from "./mobile";
import adminRoutes from "./admin";

const router = Router();

// Mobile App Routes - /api/v1/mobile/*
router.use("/mobile", mobileRoutes);

// Admin Dashboard Routes - /api/v1/admin/*
router.use("/admin", adminRoutes);

export default router;
