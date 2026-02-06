import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";
import { subscriptionPlanService } from "@/services/subscription.service";
import { ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const getAllPlans = asyncHandler(async (req: Request, res: Response) => {
  const { page = "1", limit = "10", isActive, type, categoryId } = req.query;

  const result = await subscriptionPlanService.getAllPlans({
    page: Number(page),
    limit: Number(limit),
    isActive: isActive as string | undefined,
    type: type as string | undefined,
    categoryId: categoryId as string | undefined,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        result,
        SUCCESS_MESSAGES.SUBSCRIPTION_PLANS_FETCHED,
      ),
    );
});

export const getPlanById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await subscriptionPlanService.getPlanById(id.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        plan,
        SUCCESS_MESSAGES.SUBSCRIPTION_PLAN_FETCHED,
      ),
    );
});

export const getMySubscriptions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "10",
      isActive,
      userId,
      planId,
      categoryId,
    } = req.query;

    const result = await subscriptionPlanService.getMySubscriptions({
      page: Number(page),
      limit: Number(limit),
      isActive: isActive as string | undefined,
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
