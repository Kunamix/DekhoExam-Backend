import {
  bulkUploadQuestions,
  createQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionById,
  getQuestionStats,
  updateQuestion,
} from "@/controllers/admin/question.controller";
import {
  docUpload,
  imageUpload,
  verifyAdmin,
  verifyToken,
} from "@/middlewares";
import { Router } from "express";

const router = Router();

router.post(
  "/create",
  verifyToken,
  verifyAdmin,
  imageUpload.fields([
    { name: "questionImage", maxCount: 1 },
    { name: "explanationImage", maxCount: 1 },
  ]),
  createQuestion,
);
router.get("/", verifyToken, verifyAdmin, getAllQuestions);
router.get("/stats", verifyToken, verifyAdmin, getQuestionStats);
router.post(
  "/bulk-upload",
  verifyToken,
  verifyAdmin,
  docUpload.single("file"),
  bulkUploadQuestions,
);
router.get("/:id", verifyToken, verifyAdmin, getQuestionById);
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  imageUpload.fields([
    { name: "questionImage", maxCount: 1 },
    { name: "explanationImage", maxCount: 1 },
  ]),
  updateQuestion,
);
router.delete("/:id", verifyToken, verifyAdmin, deleteQuestion);

// router.post("/bulk-delete", verifyToken, verifyAdmin, bulkDelete);
// router.get("/export", verifyToken, verifyAdmin, exportQuestions);

export default router;
