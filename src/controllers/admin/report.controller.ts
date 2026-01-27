import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { reportService } from "@/services/report.service";

export const getAllReports = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, status, type, search, startDate, endDate } = req.query;

    const result = await reportService.getAllReports({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
      type: type as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Reports retrieved successfully"));
  }
);

export const getReportStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await reportService.getReportStats();

    return res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Report statistics retrieved successfully")
      );
  }
);

export const getReportById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const report = await reportService.getReportById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, report, "Report retrieved successfully"));
  }
);

export const updateReportStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ApiError(400, "Status is required");
    }

    const updatedReport = await reportService.updateReportStatus(id.toString(), {
      status,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedReport, "Report status updated successfully")
      );
  }
);

export const deleteReport = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await reportService.deleteReport(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, {}, result.message));
  }
);