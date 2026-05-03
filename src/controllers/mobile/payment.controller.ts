import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { paymentService } from "@/services/payment.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const createPaymentOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { planId } = req.body;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    if (!planId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PLAN_ID_REQUIRED,
      );
    }

    const paymentData = await paymentService.createPaymentOrder(userId, planId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          paymentData,
          SUCCESS_MESSAGES.PAYMENT_ORDER_CREATED,
        ),
      );
  },
);

export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const result = await paymentService.verifyPayment({
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (result.alreadyProcessed) {
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new ApiResponse(
            HTTP_STATUS.OK,
            {},
            SUCCESS_MESSAGES.PAYMENT_ALREADY_PROCESSED,
          ),
        );
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { success: true },
          SUCCESS_MESSAGES.PAYMENT_VERIFIED_SUBSCRIPTION,
        ),
      );
  },
);

// GET /payments/history
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const payments = await paymentService.getPaymentHistory(userId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          payments,
          SUCCESS_MESSAGES.PAYMENT_HISTORY_FETCHED,
        ),
      );
  },
);

// GET /payments/:id
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
