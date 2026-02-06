import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "@/utils";
import { userSubscriptionService } from "@/services/user-subscription.service";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";

export const createUserSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, planId, startDate, durationDays } = req.body;

    const subscription = await userSubscriptionService.create({
      userId,
      planId,
      startDate: startDate ? new Date(startDate) : undefined,
      durationDays:
        durationDays !== undefined ? Number(durationDays) : undefined,
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          subscription,
          SUCCESS_MESSAGES.USER_SUBSCRIPTION_CREATED,
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

    const result = await userSubscriptionService.getAll({
      page: Number(page),
      limit: Number(limit),
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      userId: userId as string | undefined,
      planId: planId as string | undefined,
      categoryId: categoryId as string | undefined,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.USER_SUBSCRIPTIONS_FETCHED,
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedSubscription,
          `Subscription extended by ${additionalDays} days`,
        ),
      );
  },
);

export const cancelSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subscription = await userSubscriptionService.cancel(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          subscription,
          SUCCESS_MESSAGES.SUBSCRIPTION_CANCELLED,
        ),
      );
  },
);
