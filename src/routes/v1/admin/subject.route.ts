import { Router } from "express";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  toggleStatus,
  reorderSubjects,
} from "@/controllers/admin/subject.controller";
import { upload, verifyAdmin, verifyToken } from "@/middlewares";

const router = Router();

router.post(
  "/",
  verifyToken,
  verifyAdmin,
  upload.single("image"),
  createSubject,
);
router.get("/", verifyToken, verifyAdmin, getAllSubjects);
router.get("/:id", verifyToken, verifyAdmin, getSubjectById);
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  upload.single("image"),
  updateSubject,
);
router.patch("/:id/toggle-status", verifyToken, verifyAdmin, toggleStatus);
router.patch("/reorder", verifyToken, verifyAdmin, reorderSubjects);
router.delete("/:id", verifyToken, verifyAdmin, deleteSubject);

export default router;
