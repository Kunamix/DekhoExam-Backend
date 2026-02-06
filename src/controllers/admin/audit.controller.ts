import { Request, Response } from "express";
import { asyncHandler, ApiResponse } from "@/utils";
import { auditLogService } from "@/services/audit.service";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";

export const getAllAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, action, entity, userId, startDate, endDate, search } =
      req.query;

    const result = await auditLogService.getAllAuditLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action: action as string,
      entity: entity as string,
      userId: userId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.AUDIT_LOGS_FETCHED,
        ),
      );
  },
);

export const getAuditLogById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const auditLog = await auditLogService.getAuditLogById(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          auditLog,
          SUCCESS_MESSAGES.AUDIT_LOG_FETCHED,
        ),
      );
  },
);

export const exportAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const { action, entity, userId, startDate, endDate, format } = req.query;

    const result = await auditLogService.exportAuditLogs({
      action: action as string,
      entity: entity as string,
      userId: userId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      format: (format as string) || "csv",
    });

    res.setHeader(
      "Content-Type",
      result.format === "csv" ? "text/csv" : "application/json",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audit-logs-${new Date().toISOString()}.${result.format}`,
    );

    return res.status(HTTP_STATUS.OK).send(result.data);
  },
);
