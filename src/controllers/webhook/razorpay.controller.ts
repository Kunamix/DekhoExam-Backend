import { myEnvironment, prisma } from "@/configs";
import { HTTP_STATUS } from "@/constants";
import crypto from "crypto";
import { Request, Response } from "express";

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const secret = myEnvironment.RAZORPAY_WEBHOOK_SECRET;

  // 1. Verify Webhook Signature
  const shasum = crypto.createHmac("sha256", secret!);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    console.error("Invalid Webhook Signature");
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ status: "invalid_signature" });
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;

  if (event === "payment.captured") {
    const orderId = payload.order_id;
    const paymentId = payload.id;

    // 2. Check if we already handled this in verifyPayment
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
        console.error("Webhook Transaction Failed", err);
      }
    }
  } else if (event === "payment.failed") {
    const orderId = payload.order_id;
    await prisma.payment.updateMany({
      where: { orderId: orderId },
      data: { status: "FAILED" },
    });
  }

  return res.status(HTTP_STATUS.OK).json({ status: "ok" });
};
