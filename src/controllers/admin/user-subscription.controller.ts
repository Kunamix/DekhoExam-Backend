import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "@/utils";
import { userSubscriptionService } from "@/services/user-subscription.service";

export const createUserSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, planId, startDate, durationDays } =
      req.body;

    const subscription =
      await userSubscriptionService.create({
        userId,
        planId,
        startDate: startDate ? new Date(startDate) : undefined,
        durationDays:
          durationDays !== undefined
            ? Number(durationDays)
            : undefined,
      });

    return res.status(201).json(
      new ApiResponse(
        201,
        subscription,
        "User subscription created successfully",
      ),
    );
  },
);

export const getAllUserSubscriptions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      isActive,
      userId,
      planId,
      categoryId,
    } = req.query;

    const result =
      await userSubscriptionService.getAll({
        page: Number(page),
        limit: Number(limit),
        isActive:
          isActive !== undefined
            ? isActive === "true"
            : undefined,
        userId: userId as string | undefined,
        planId: planId as string | undefined,
        categoryId: categoryId as string | undefined,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "User subscriptions fetched successfully",
      ),
    );
  },
);

export const extendSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { additionalDays } = req.body;

    const updatedSubscription =
      await userSubscriptionService.extendSubscription(
        id.toString(),
        Number(additionalDays),
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        updatedSubscription,
        `Subscription extended by ${additionalDays} days`,
      ),
    );
  },
);

export const cancelSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subscription =
      await userSubscriptionService.cancel(id.toString());

    return res.status(200).json(
      new ApiResponse(
        200,
        subscription,
        "Subscription cancelled successfully",
      ),
    );
  },
);