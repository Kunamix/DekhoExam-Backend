import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { notificationService } from "@/services/notification.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

// GET /notifications
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const notifications = await notificationService.getNotifications(userId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          notifications,
          SUCCESS_MESSAGES.NOTIFICATIONS_FETCHED,
        ),
      );
  },
);

// PATCH /notifications/:id/read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
    );
  }

  await notificationService.markAsRead(userId, id.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, {}, SUCCESS_MESSAGES.NOTIFICATION_READ),
    );
});

// PATCH /notifications/read-all
export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    await notificationService.markAllAsRead(userId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          {},
          SUCCESS_MESSAGES.ALL_NOTIFICATIONS_READ,
        ),
      );
  },
);

// DELETE /notifications/:id
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    await notificationService.deleteNotification(userId, id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          {},
          SUCCESS_MESSAGES.NOTIFICATION_DELETED,
        ),
      );
  },
);
