import { Request, Response } from "express";
import { asyncHandler,ApiResponse, ApiError } from "@/utils";
import { paymentService } from "@/services/payment.service";

export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const payments = await paymentService.getAllPayments({
    startDate: startDate as string,
    endDate: endDate as string,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payments, "Payments fetched successfully"));
});

export const getPaymentStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await paymentService.getPaymentStats();

    return res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Payment statistics fetched successfully")
      );
  }
);

export const exportPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await paymentService.exportPayments({
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${result.filename}`);

    return res.status(200).send(result.data);
  }
);

export const getPaymentById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const payment = await paymentService.getPaymentById(userId, id.toString());

    return res.status(200).json(
      new ApiResponse(200, payment, "Payment fetched successfully")
    );
  }
);

export const refundPayment = asyncHandler(async (_req: Request, _res:Response) => {

});








