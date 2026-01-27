import { getAttemptHistory, getPopularTests, getTestById, getTestInstructions, getTestQuestions, getTestResult, getTestsByCategory, saveAnswer, startTest, submitTest, viewTestSolution } from "@/controllers/mobile/test.controller";

import { verifyToken } from "@/middlewares";
import { Router } from "express";

const router = Router();

// Browse tests
router.get("/popular", verifyToken, getPopularTests);
router.get("/category/:categoryId", verifyToken, getTestsByCategory);
router.get("/:testId/instructions", verifyToken, getTestInstructions);
router.get("/:testId", verifyToken, getTestById);

// Test attempts
router.post("/:testId/start", verifyToken, startTest);
router.get("/attempts/:attemptId/questions", verifyToken, getTestQuestions);
router.post("/attempts/:attemptId/save-answer", verifyToken, saveAnswer);
router.post("/attempts/:attemptId/submit", verifyToken, submitTest);
router.get("/attempts/:attemptId/result", verifyToken, getTestResult);
router.get("/attempts/:attemptId/solution", verifyToken, viewTestSolution);

// History
router.get("/my/history", verifyToken, getAttemptHistory);

export default router;