import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";

interface GetAllSubscriptionPlansInput {
  page?: number;
  limit?: number;
  isActive?: string;
  type?: string;
  categoryId?: string;
}

interface GetMySubscriptions {
  page?: number;
  limit?: number;
  isActive?: string;
  userId?: string;
  planId?: string;
  categoryId?: string;
}

interface CreateSubscriptionPlanInput {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  type: "CATEGORY_SPECIFIC" | "ALL_CATEGORIES";
  categoryId?: string;
  displayOrder?: number;
}

interface UpdateSubscriptionPlanInput {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  durationDays?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export class SubscriptionPlanService {
  async create({
    name,
    description,
    price,
    durationDays,
    type,
    categoryId,
    displayOrder = 0,
  }: CreateSubscriptionPlanInput) {
    if (!name || !price || !durationDays || !type) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.SUBSCRIPTION_FIELDS_REQUIRED,
      );
    }

    if (type === "CATEGORY_SPECIFIC" && !categoryId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_ID_REQUIRED_FOR_PLAN,
      );
    }

    if (type === "ALL_CATEGORIES" && categoryId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_ID_NOT_ALLOWED_FOR_PLAN,
      );
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.CATEGORY_NOT_FOUND,
        );
      }
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price,
        durationDays,
        type,
        categoryId,
        displayOrder,
      },
    });

    return plan;
  }

  async getAllPlans({
    page = 1,
    limit = 10,
    isActive,
    type,
    categoryId,
  }: GetAllSubscriptionPlansInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              userSubscriptions: true,
            },
          },
        },
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    return {
      plans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlanById(planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        userSubscriptions: {
          where: { isActive: true },
          select: {
            id: true,
            userId: true,
            startDate: true,
            endDate: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            userSubscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    return plan;
  }

  async getStats() {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalPlans,
      activePlans,
      totalSubscriptions,
      activeSubscriptions,
      expiringSoon,
      revenueData,
    ] = await Promise.all([
      prisma.subscriptionPlan.count(),

      prisma.subscriptionPlan.count({
        where: { isActive: true },
      }),

      prisma.userSubscription.count(),

      prisma.userSubscription.count({
        where: {
          isActive: true,
          endDate: { gte: now },
        },
      }),

      prisma.userSubscription.count({
        where: {
          isActive: true,
          endDate: {
            gte: now,
            lte: sevenDaysFromNow,
          },
        },
      }),

      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
    ]);

    return {
      plans: {
        total: totalPlans,
        active: activePlans,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        expiringSoon,
      },
      revenue: {
        total: Number(revenueData._sum.amount || 0),
      },
    };
  }

  async update({
    id,
    name,
    description,
    price,
    durationDays,
    displayOrder,
    isActive,
  }: UpdateSubscriptionPlanInput) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(durationDays !== undefined && {
          durationDays,
        }),
        ...(displayOrder !== undefined && {
          displayOrder,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return updatedPlan;
  }

  async toggleStatus(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        isActive: !plan.isActive,
      },
    });

    return updatedPlan;
  }

  async delete(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userSubscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    // If plan has subscribers → soft delete
    if (plan._count.userSubscriptions > 0) {
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        deleted: false,
        deactivated: true,
      };
    }

    // No subscribers → hard delete
    await prisma.subscriptionPlan.delete({
      where: { id },
    });

    return {
      deleted: true,
      deactivated: false,
    };
  }

  async getMySubscriptions({
    page = 1,
    limit = 10,
    isActive,
    userId,
    planId,
    categoryId,
  }: GetMySubscriptions) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
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
}

export const subscriptionPlanService = new SubscriptionPlanService();
