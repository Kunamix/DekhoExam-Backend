import { toggleStatus } from "@/controllers/admin/subject.controller";
import { createTopic, deleteTopic, getAllTopics, getTopicById, updateTopic } from "@/controllers/admin/topic.controller";
import { verifyAdmin, verifyToken } from "@/middlewares";
import { Router } from "express";


const router = Router();

router.post("/", verifyToken, verifyAdmin, createTopic);
router.get("/", verifyToken, verifyAdmin, getAllTopics);
router.get("/:id", verifyToken, verifyAdmin, getTopicById);
router.put("/:id", verifyToken, verifyAdmin, updateTopic);
router.patch("/:id/toggle-status", verifyToken, verifyAdmin, toggleStatus);
router.delete("/:id", verifyToken, verifyAdmin, deleteTopic);

// router.post("/:id/materials", verifyToken, verifyAdmin, upload.single("file"), uploadMaterials);

export default router;