import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "@/utils";
import { dashboardService } from "@/services/dashboard.service";

export const getStats = asyncHandler(
  async (_req: Request, res: Response) => {

    const stats = await dashboardService.getStats();

    return res.status(200).json(
      new ApiResponse(
        200,
        stats,
        "Dashboard stats fetched",
      ),
    );
  },
);

export const getCharts = asyncHandler(
  async (_req: Request, res: Response) => {
    const charts = await dashboardService.getCharts();

    return res.status(200).json(
      new ApiResponse(200, charts, "Chart data fetched"),
    );
  },
);

export const getAnalytics = asyncHandler(
  async (_req: Request, res: Response) => {
    const analytics =
      await dashboardService.getAnalytics();

    return res.status(200).json(
      new ApiResponse(
        200,
        analytics,
        "Reports analytics fetched successfully",
      ),
    );
  },
);

export const getRecentUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users =
      await dashboardService.getRecentUsers();

    return res.status(200).json(
      new ApiResponse(
        200,
        users,
        "Recent users fetched",
      ),
    );
  },
);

export const getRecentPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit } = req.query;

    const payments = await dashboardService.getRecentPayments(
      limit ? Number(limit) : undefined
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, payments, "Recent payments retrieved successfully")
      );
  }
);

export const getRecentTests = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit } = req.query;

    const tests = await dashboardService.getRecentTests(
      limit ? Number(limit) : undefined
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, tests, "Recent tests retrieved successfully")
      );
  }
);