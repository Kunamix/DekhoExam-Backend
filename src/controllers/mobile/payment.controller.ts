import { paymentService } from "@/services/payment.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const createPaymentOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { planId } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!planId) {
      throw new ApiError(400, "planId is required");
    }

    const paymentData = await paymentService.createPaymentOrder(
      userId,
      planId
    );

    return res.status(200).json(
      new ApiResponse(200, paymentData, "Payment order created")
    );
  }
);

export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const result = await paymentService.verifyPayment({
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (result.alreadyProcessed) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Payment already processed"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { success: true },
        "Payment verified and subscription activated"
      )
    );
  }
);

// GET /payments/history
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const payments = await paymentService.getPaymentHistory(userId);

    return res.status(200).json(
      new ApiResponse(
        200,
        payments,
        "Payment history fetched successfully"
      )
    );
  }
);

// GET /payments/:id
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