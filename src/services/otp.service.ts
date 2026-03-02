import axios from "axios";
import { myEnvironment, prisma } from "@/configs";
import { APP_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";

const SMS_BASE_URL = "http://msg.sysgraininfotech.com/vb/apikey.php";

export class OTPService {
  /**
   * Generate a random 4-digit OTP code
   */
  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Send OTP SMS to the given phone number, store in DB, return the OTP record id
   */
  async sendOTP(phoneNumber: string): Promise<{ otpId: string }> {
    // Clean phone number — strip +91 or any non-digit chars
    const cleanNumber = phoneNumber.replace(/^\+91/, "").replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      );
    }

    // 1. Invalidate old OTPs for this number
    await prisma.oTP.deleteMany({
      where: { phoneNumber },
    });

    // 2. Generate 4-digit code
    const code = this.generateCode();

    // 3. Build the SMS message (must match approved DLT template exactly)
    const message = `Dear User, your Code for Dekho Exam is ${code}. This code is valid for ${APP_CONSTANTS.OTP_EXPIRY_MINUTES} minutes. Please do not share it with anyone. - Dekho Exam`;

    // 4. Send SMS via Sysgrain Infotech API
    try {
      const { data } = await axios.get(SMS_BASE_URL, {
        params: {
          apikey: myEnvironment.SMS_API_KEY,
          senderid: myEnvironment.SMS_SENDER_ID,
          templateid: myEnvironment.SMS_TEMPLATE_ID,
          number: cleanNumber,
          message,
        },
      });

      // API returns { status: "Success", code: "011", ... } on success
      if (data?.status !== "Success") {
        console.error("SMS API error:", data);
        throw new Error(data?.description || "SMS delivery failed");
      }
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      console.error("SMS send error:", error?.message);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to send OTP. Please try again later.",
      );
    }

    // 5. Store OTP in database
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + APP_CONSTANTS.OTP_EXPIRY_MINUTES,
    );

    const otpRecord = await prisma.oTP.create({
      data: {
        phoneNumber,
        code,
        purpose: "login",
        expiresAt,
        isVerified: false,
        attempts: 0,
      },
    });

    return { otpId: otpRecord.id };
  }

  /**
   * Verify a 4-digit OTP code for a phone number
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<void> {
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phoneNumber,
        isVerified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_REQUEST_OR_OTP,
      );
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTP.delete({ where: { id: otpRecord.id } });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.OTP_EXPIRED);
    }

    // Max 3 wrong attempts
    if (otpRecord.attempts >= 3) {
      await prisma.oTP.delete({ where: { id: otpRecord.id } });
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS,
      );
    }

    // Wrong code — increment attempts
    if (otpRecord.code !== code) {
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.INVALID_OTP);
    }

    // Correct — delete the OTP record (one-time use)
    await prisma.oTP.delete({ where: { id: otpRecord.id } });
  }
}

export const otpService = new OTPService();
