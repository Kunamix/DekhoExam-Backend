import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "@/utils";
import { dashboardService } from "@/services/dashboard.service";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardService.getStats();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        stats,
        SUCCESS_MESSAGES.DASHBOARD_STATS_FETCHED,
      ),
    );
});

export const getCharts = asyncHandler(async (_req: Request, res: Response) => {
  const charts = await dashboardService.getCharts();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        charts,
        SUCCESS_MESSAGES.CHART_DATA_FETCHED,
      ),
    );
});

export const getAnalytics = asyncHandler(
  async (_req: Request, res: Response) => {
    const analytics = await dashboardService.getAnalytics();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          analytics,
          SUCCESS_MESSAGES.ANALYTICS_FETCHED,
        ),
      );
  },
);

export const getRecentUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await dashboardService.getRecentUsers();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          users,
          SUCCESS_MESSAGES.RECENT_USERS_FETCHED,
        ),
      );
  },
);

export const getRecentPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit } = req.query;

    const payments = await dashboardService.getRecentPayments(
      limit ? Number(limit) : undefined,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          payments,
          SUCCESS_MESSAGES.RECENT_PAYMENTS_FETCHED,
        ),
      );
  },
);

export const getRecentTests = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit } = req.query;

    const tests = await dashboardService.getRecentTests(
      limit ? Number(limit) : undefined,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          tests,
          SUCCESS_MESSAGES.RECENT_TESTS_FETCHED,
        ),
      );
  },
);
