import { notificationService } from "@/services/notification.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

// GET /notifications
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const notifications =
      await notificationService.getNotifications(userId);

    return res.status(200).json(
      new ApiResponse(
        200,
        notifications,
        "Notifications fetched successfully"
      )
    );
  }
);

// PATCH /notifications/:id/read
export const markAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    await notificationService.markAsRead(userId, id.toString());

    return res.status(200).json(
      new ApiResponse(200, {}, "Notification marked as read")
    );
  }
);

// PATCH /notifications/read-all
export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    await notificationService.markAllAsRead(userId);

    return res.status(200).json(
      new ApiResponse(200, {}, "All notifications marked as read")
    );
  }
);

// DELETE /notifications/:id
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    await notificationService.deleteNotification(userId, id.toString());

    return res.status(200).json(
      new ApiResponse(200, {}, "Notification deleted successfully")
    );
  }
);
