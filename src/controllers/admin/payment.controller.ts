import { Request, Response } from "express";
import { asyncHandler, ApiResponse, ApiError } from "@/utils";
import { paymentService } from "@/services/payment.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const getAllPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const payments = await paymentService.getAllPayments({
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          payments,
          SUCCESS_MESSAGES.PAYMENTS_FETCHED,
        ),
      );
  },
);

export const getPaymentStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await paymentService.getPaymentStats();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.PAYMENT_STATS_FETCHED,
        ),
      );
  },
);

export const exportPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await paymentService.exportPayments({
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${result.filename}`,
    );

    return res.status(HTTP_STATUS.OK).send(result.data);
  },
);

export const getPaymentById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const payment = await paymentService.getPaymentById(userId, id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          payment,
          SUCCESS_MESSAGES.PAYMENT_FETCHED,
        ),
      );
  },
);

export const refundPayment = asyncHandler(
  async (_req: Request, _res: Response) => {},
);
