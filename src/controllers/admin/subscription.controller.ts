import { subscriptionPlanService } from "@/services/subscription.service";
import { ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    description,
    price,
    durationDays,
    type,
    categoryId,
    displayOrder,
  } = req.body;

  const plan = await subscriptionPlanService.create({
    name,
    description,
    price: Number(price),
    durationDays: Number(durationDays),
    type,
    categoryId,
    displayOrder,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        plan,
        SUCCESS_MESSAGES.SUBSCRIPTION_CREATED,
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

export const getSubscriptionStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await subscriptionPlanService.getStats();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.SUBSCRIPTION_STATS_FETCHED,
        ),
      );
  },
);

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, durationDays, displayOrder, isActive } =
    req.body;

  const updatedPlan = await subscriptionPlanService.update({
    id: id.toString(),
    name,
    description,
    price: price !== undefined ? Number(price) : undefined,
    durationDays: durationDays !== undefined ? Number(durationDays) : undefined,
    displayOrder,
    isActive,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        updatedPlan,
        SUCCESS_MESSAGES.SUBSCRIPTION_UPDATED,
      ),
    );
});

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const plan = await subscriptionPlanService.toggleStatus(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          plan,
          `Subscription plan ${
            plan.isActive ? "activated" : "deactivated"
          } successfully`,
        ),
      );
  },
);

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await subscriptionPlanService.delete(id.toString());

  const message = result.deactivated
    ? "Subscription plan deactivated because it has active subscribers"
    : "Subscription plan deleted successfully";

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, message));
});

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
