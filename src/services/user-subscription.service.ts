import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";

interface GetAllUserSubscriptionsInput {
  page?: number;
  limit?: number;
  isActive?: boolean;
  userId?: string;
  planId?: string;
  categoryId?: string;
}

interface CreateUserSubscriptionInput {
  userId: string;
  planId: string;
  startDate?: Date;
  durationDays?: number;
}

export class UserSubscriptionService {
  async getAll({
    page = 1,
    limit = 10,
    isActive,
    userId,
    planId,
    categoryId,
  }: GetAllUserSubscriptionsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (userId) {
      where.userId = userId;
    }

    if (planId) {
      where.planId = planId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              durationDays: true,
              type: true,
            },
          },
        },
      }),
      prisma.userSubscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async extendSubscription(id: string, additionalDays: number) {
    if (!additionalDays || additionalDays <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_ADDITIONAL_DAYS,
      );
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    const updatedSubscription = await prisma.userSubscription.update({
      where: { id },
      data: { endDate: newEndDate },
    });

    return updatedSubscription;
  }

  async create({
    userId,
    planId,
    startDate,
    durationDays,
  }: CreateUserSubscriptionInput) {
    if (!userId || !planId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.USER_SUBSCRIPTION_FIELDS_REQUIRED,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const start = startDate ? new Date(startDate) : new Date();
    const duration = durationDays ?? plan.durationDays;

    if (duration <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_SUBSCRIPTION_DURATION,
      );
    }

    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        planId,
        type: plan.type,
        categoryId: plan.categoryId,
        startDate: start,
        endDate: end,
        isActive: true,
      },
    });

    return subscription;
  }

  async cancel(id: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const updatedSubscription = await prisma.userSubscription.update({
      where: { id },
      data: {
        isActive: false,
        autoRenew: false,
      },
    });

    return updatedSubscription;
  }
}

export const userSubscriptionService = new UserSubscriptionService();