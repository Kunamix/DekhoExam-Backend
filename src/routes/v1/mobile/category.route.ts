import { Router } from "express";
import { verifyToken } from "@/middlewares";
import { checkCategoryAccess, getAllCategories, getCategoryById } from "@/controllers/mobile/category.controller";


const router = Router();

router.get("/", verifyToken, getAllCategories);
router.get("/:id/check-access", verifyToken, checkCategoryAccess);
router.get("/:id", verifyToken, getCategoryById);
// router.get("/:id/subjects", verifyToken, getCategorySubjects);

export default router;