import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { reportService } from "@/services/report.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

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
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.REPORTS_FETCHED,
        ),
      );
  },
);

export const getReportStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await reportService.getReportStats();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.REPORT_STATS_FETCHED,
        ),
      );
  },
);

export const getReportById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const report = await reportService.getReportById(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          report,
          SUCCESS_MESSAGES.REPORT_FETCHED,
        ),
      );
  },
);

export const updateReportStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.STATUS_REQUIRED,
      );
    }

    const updatedReport = await reportService.updateReportStatus(
      id.toString(),
      {
        status,
      },
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedReport,
          SUCCESS_MESSAGES.REPORT_STATUS_UPDATED,
        ),
      );
  },
);

export const deleteReport = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await reportService.deleteReport(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, {}, result.message));
  },
);
