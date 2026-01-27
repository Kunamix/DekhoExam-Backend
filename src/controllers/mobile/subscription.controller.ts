import { subscriptionPlanService } from "@/services/subscription.service";
import { ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const getAllPlans = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = "1", limit = "10", isActive, type, categoryId } = req.query;

    const result = await subscriptionPlanService.getAllPlans({
      page: Number(page),
      limit: Number(limit),
      isActive: isActive as string | undefined,
      type: type as string | undefined,
      categoryId: categoryId as string | undefined,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Subscription plans fetched successfully"
      )
    );
  }
);

export const getPlanById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const plan = await subscriptionPlanService.getPlanById(id.toString());

    return res.status(200).json(
      new ApiResponse(
        200,
        plan,
        "Subscription plan fetched successfully"
      )
    );
  }
);

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

    const result =
      await subscriptionPlanService.getMySubscriptions({
        page: Number(page),
        limit: Number(limit),
        isActive: isActive as string | undefined,
        userId: userId as string | undefined,
        planId: planId as string | undefined,
        categoryId: categoryId as string | undefined,
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "User subscriptions fetched successfully"
      )
    );
  }
);