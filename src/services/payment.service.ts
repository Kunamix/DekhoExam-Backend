import crypto from "crypto";
import { ApiError } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import logger from "@/logger/winston.logger";
import { myEnvironment, prisma, razorpayInstance } from "@/configs";

interface VerifyPaymentInput {
  userId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface HandleWebhookInput {
  event: string;
  payload: any;
  signature: string;
}

interface GetPaymentsInput {
  startDate?: string;
  endDate?: string;
}

export class PaymentService {
  async createPaymentOrder(userId: string, planId: string) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_USER_MISSING,
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const amountInPaisa = Math.round(Number(plan.price) * 100);

    const options = {
      amount: amountInPaisa,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${userId.slice(0, 4)}`,
      notes: {
        userId,
        planId,
      },
    };

    try {
      const order = await razorpayInstance.orders.create(options);

      if (!order) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.PAYMENT_ORDER_FAILED,
        );
      }

      await prisma.payment.create({
        data: {
          userId,
          amount: plan.price,
          currency: "INR",
          paymentGateway: "RAZORPAY",
          orderId: order.id,
          status: "PENDING",
          metadata: {
            planId: plan.id,
            planName: plan.name,
            durationDays: plan.durationDays,
            planType: plan.type,
            categoryId: plan.categoryId,
          },
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: myEnvironment.RAZORPAY_KEY_ID,
        planName: plan.name,
        description: plan.description,
      };
    } catch (error) {
      logger.error("Razorpay order creation failed", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.PAYMENT_INIT_FAILED,
      );
    }
  }

  async verifyPayment({
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }: VerifyPaymentInput) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_USER_MISSING,
      );
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PAYMENT_DETAILS_MISSING,
      );
    }

    const paymentRecord = await prisma.payment.findFirst({
      where: { orderId: razorpay_order_id },
    });

    if (!paymentRecord) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.PAYMENT_RECORD_NOT_FOUND,
      );
    }

    // 🔁 Idempotency
    if (paymentRecord.status === "SUCCESS") {
      return { alreadyProcessed: true };
    }

    // 🔐 Signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", myEnvironment.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: "FAILED",
          metadata: {
            ...(paymentRecord.metadata as object),
            failureReason: "Signature Mismatch",
          },
        },
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PAYMENT_SIGNATURE_FAILED,
      );
    }

    // ✅ Activate subscription
    const metadata = paymentRecord.metadata as any;
    const durationDays = metadata.durationDays || 30;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationDays);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: "SUCCESS",
          transactionId: razorpay_payment_id,
        },
      });

      await tx.userSubscription.create({
        data: {
          userId,
          planId: metadata.planId,
          type: metadata.planType,
          categoryId: metadata.categoryId || null,
          startDate,
          endDate,
          isActive: true,
          autoRenew: false,
        },
      });
    });

    return { success: true };
  }

  async handleWebhook({ event, payload, signature }: HandleWebhookInput) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Verify Webhook Signature
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(payload));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_WEBHOOK_SIGNATURE,
      );
    }

    const paymentEntity = payload.payment.entity;

    if (event === "payment.captured") {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const paymentRecord = await prisma.payment.findFirst({
        where: { orderId: orderId },
      });

      if (paymentRecord && paymentRecord.status !== "SUCCESS") {
        const metadata = paymentRecord.metadata as any;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (metadata.durationDays || 30));

        try {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: paymentRecord.id },
              data: { status: "SUCCESS", transactionId: paymentId },
            });

            await tx.userSubscription.create({
              data: {
                userId: paymentRecord.userId,
                planId: metadata.planId,
                type: metadata.planType,
                categoryId: metadata.categoryId || null,
                startDate: new Date(),
                endDate: endDate,
                isActive: true,
              },
            });
          });
        } catch (err) {
          logger.error("Webhook Transaction Failed", err);
          throw err;
        }
      }
    } else if (event === "payment.failed") {
      const orderId = paymentEntity.order_id;
      await prisma.payment.updateMany({
        where: { orderId: orderId },
        data: { status: "FAILED" },
      });
    }

    return { status: "ok" };
  }

  // all payments
  async getAllPayments({ startDate, endDate }: GetPaymentsInput) {
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return payments.map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      userName: payment.user.name || "Unknown User",
      phone: payment.user.phoneNumber || payment.user.email || "N/A",
      amount: Number(payment.amount),
      gateway: payment.paymentGateway,
      status: payment.status,
      transactionId: payment.transactionId || payment.orderId || "N/A",
      orderId: payment.orderId,
      date: payment.createdAt.toISOString(),
      metadata: payment.metadata,
    }));
  }

  // all payments for user
  async getPaymentHistory(userId: string) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return payments;
  }

  // one payment for user
  async getPaymentById(userId: string, paymentId: string) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId, // 🔐 important security check
      },
    });

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.PAYMENT_NOT_FOUND,
      );
    }

    return payment;
  }

  async getPaymentStats() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Total revenue
    const totalRevenueResult = await prisma.payment.aggregate({
      where: {
        status: { in: ["SUCCESS", "COMPLETED"] },
      },
      _sum: {
        amount: true,
      },
    });

    // Current month revenue
    const currentMonthResult = await prisma.payment.aggregate({
      where: {
        status: { in: ["SUCCESS", "COMPLETED"] },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Previous month revenue
    const prevMonthResult = await prisma.payment.aggregate({
      where: {
        status: { in: ["SUCCESS", "COMPLETED"] },
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Transaction counts by status
    const [successCount, failedCount, pendingCount] = await Promise.all([
      prisma.payment.count({
        where: { status: { in: ["SUCCESS", "COMPLETED"] } },
      }),
      prisma.payment.count({
        where: { status: "FAILED" },
      }),
      prisma.payment.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Calculate percentage change
    const currentRevenue = Number(currentMonthResult._sum.amount || 0);
    const prevRevenue = Number(prevMonthResult._sum.amount || 0);
    const revenueChange =
      prevRevenue > 0
        ? Number(
            (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(2),
          )
        : 0;

    // Get last 12 months revenue
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: { in: ["SUCCESS", "COMPLETED"] },
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Group by month
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthKey = date.toLocaleString("default", { month: "short" });

      const monthRevenue = monthlyPayments
        .filter((p) => {
          const pDate = new Date(p.createdAt);
          return (
            pDate.getMonth() === date.getMonth() &&
            pDate.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        month: monthKey,
        revenue: monthRevenue,
      };
    });

    return {
      totalRevenue: Number(totalRevenueResult._sum.amount || 0),
      currentMonthRevenue: currentRevenue,
      revenueChange,
      successfulTransactions: successCount,
      failedTransactions: failedCount,
      pendingTransactions: pendingCount,
      monthlyRevenue,
    };
  }

  async exportPayments({ startDate, endDate }: GetPaymentsInput) {
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate CSV
    const csvHeaders = [
      "Transaction ID",
      "Order ID",
      "User Name",
      "Phone/Email",
      "Amount (INR)",
      "Gateway",
      "Status",
      "Date",
    ].join(",");

    const csvRows = payments.map((p) =>
      [
        p.transactionId || "N/A",
        p.orderId || "N/A",
        p.user.name || "Unknown",
        p.user.phoneNumber || p.user.email || "N/A",
        Number(p.amount),
        p.paymentGateway,
        p.status,
        new Date(p.createdAt).toLocaleString("en-IN"),
      ].join(","),
    );

    const csv = [csvHeaders, ...csvRows].join("\n");

    return {
      data: csv,
      filename: `payments-${Date.now()}.csv`,
    };
  }
}

export const paymentService = new PaymentService();