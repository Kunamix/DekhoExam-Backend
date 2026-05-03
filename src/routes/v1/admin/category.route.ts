import { Router } from "express";
import { imageUpload, verifyAdmin, verifyToken } from "@/middlewares";
import {
  assignSubjects,
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  reorderCategories,
  toggleStatus,
  updateCategory,
} from "@/controllers/admin/category.controller";

const router = Router();

router.post(
  "/create",
  verifyToken,
  verifyAdmin,
  imageUpload.single("image"),
  createCategory,
);
router.get("/", verifyToken, verifyAdmin, getAllCategories);
router.get("/:id", verifyToken, verifyAdmin, getCategoryById);
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  imageUpload.single("image"),
  updateCategory,
);
router.patch("/:id/toggle-status", verifyToken, verifyAdmin, toggleStatus);
router.put("/:id/assign-subjects", verifyToken, verifyAdmin, assignSubjects);
router.delete("/:id", verifyToken, verifyAdmin, deleteCategory);
router.patch("/reorder", verifyToken, verifyAdmin, reorderCategories);

export default router;
