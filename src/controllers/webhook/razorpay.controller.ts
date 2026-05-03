import { myEnvironment, prisma } from "@/configs";
import { HTTP_STATUS } from "@/constants";
import { SubscriptionType } from "@/generated/prisma/enums";
import crypto from "crypto";
import { Request, Response } from "express";

interface PaymentMetadata {
  durationDays?: number;
  planId: string;
  planType: SubscriptionType;
  categoryId?: string;
}

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const secret = myEnvironment.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return res.status(HTTP_STATUS.OK).json({ status: "ok" }); // ack anyway, misconfiguration is our problem
    }

    // req.body is a Buffer from express.raw() — use directly, NOT JSON.stringify
    const rawBody = req.body as Buffer;
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(rawBody);
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      console.error("Invalid Webhook Signature");
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ status: "invalid_signature" });
    }

    // Parse after signature verification
    const parsedBody = JSON.parse(rawBody.toString("utf8"));
    const event: string = parsedBody.event;
    const payload = parsedBody.payload?.payment?.entity;

    if (!payload) {
      console.error("Missing payload in webhook event", event);
      return res.status(HTTP_STATUS.OK).json({ status: "ok" });
    }

    if (event === "payment.captured") {
      const orderId: string = payload.order_id;
      const paymentId: string = payload.id;

      const paymentRecord = await prisma.payment.findFirst({
        where: { orderId },
      });

      if (paymentRecord && paymentRecord.status !== "SUCCESS") {
        const metadata = paymentRecord.metadata as PaymentMetadata | null;

        if (!metadata) {
          console.error("Missing metadata for payment", paymentRecord.id);
          return res.status(HTTP_STATUS.OK).json({ status: "ok" });
        }

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (metadata.durationDays ?? 30));

        try {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: paymentRecord.id },
              data: { status: "SUCCESS", transactionId: paymentId },
            });
            const existingSub = await tx.userSubscription.findFirst({
              where: {
                userId: paymentRecord.userId,
                planId: metadata.planId,
                isActive: true,
                endDate: { gt: new Date() },
              },
            });

            if (!existingSub) {
              await tx.userSubscription.create({
                data: {
                  userId: paymentRecord.userId,
                  planId: metadata.planId,
                  type: metadata.planType as SubscriptionType,
                  categoryId: metadata.categoryId ?? null,
                  startDate: new Date(),
                  endDate,
                  isActive: true,
                },
              });
            }
          });
        } catch (err) {
          console.error("Webhook DB transaction failed", err);
          // Don't rethrow — return 200 so Razorpay doesn't retry
        }
      }
    } else if (event === "payment.failed") {
      const orderId: string = payload.order_id;
      await prisma.payment.updateMany({
        where: { orderId },
        data: { status: "FAILED" },
      });
    }

    return res.status(HTTP_STATUS.OK).json({ status: "ok" });
  } catch (err) {
    console.error("Webhook handler crashed", err);
    // Always ack — internal errors are our problem, not Razorpay's
    return res.status(HTTP_STATUS.OK).json({ status: "ok" });
  }
};
