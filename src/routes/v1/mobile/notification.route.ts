import { Router } from "express";
import { verifyToken } from "@/middlewares";
import { deleteNotification, getNotifications, markAllAsRead, markAsRead } from "@/controllers/mobile/notification.controller";

const router = Router();

router.get("/", verifyToken, getNotifications);
router.patch("/read-all", verifyToken, markAllAsRead);
router.patch("/:id/read", verifyToken, markAsRead);
router.delete("/:id", verifyToken, deleteNotification);

export default router;