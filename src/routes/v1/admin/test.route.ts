import { toggleStatus } from "@/controllers/admin/category.controller";
import { cloneTest, createTest, deleteTest, getAllTests, getTestById, getTestStats, updateTest } from "@/controllers/admin/test.controller";
import { verifyAdmin, verifyToken } from "@/middlewares";
import { Router } from "express";

const router = Router();

router.post("/", verifyToken, verifyAdmin, createTest);
router.get("/", verifyToken, verifyAdmin, getAllTests);
router.get("/stats", verifyToken, verifyAdmin, getTestStats);
router.get("/:id", verifyToken, verifyAdmin, getTestById);
router.put("/:id", verifyToken, verifyAdmin, updateTest);
router.patch("/:id/toggle-status", verifyToken, verifyAdmin, toggleStatus);
router.post("/:id/clone", verifyToken, verifyAdmin, cloneTest);
router.delete("/:id", verifyToken, verifyAdmin, deleteTest);

// router.get("/:id/attempts", verifyToken, verifyAdmin, getTestAttempts);
// router.get("/:id/export", verifyToken, verifyAdmin, exportTestResults);

export default router;