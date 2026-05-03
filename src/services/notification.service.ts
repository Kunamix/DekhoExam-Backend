import { prisma } from "@/configs";
import { ApiError } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

export class NotificationService {
  async getNotifications(userId: string) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return notifications;
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
      );
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}

export const notificationService = new NotificationService();