import { myEnvironment, prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";
import { authHelper } from "@/utils/auth-helper.util";
import { otpService } from "./otp.service";

interface VerifyOtpInput {
  otpCode: string;
  token: string;
  deviceId: string;
  userAgent: string;
  ipAddress?: string;
}

export class AuthService {
  async login(phoneNumber: string) {
    if (!phoneNumber) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PHONE_NUMBER_REQUIRED,
      );
    }

    // Send real OTP via SMS API
    const { otpId } = await otpService.sendOTP(phoneNumber);

    // Create verification token (links the OTP record to this request)
    const verificationToken = authHelper.signToken(
      {
        phoneNumber,
        otpId,
      },
      myEnvironment.OTP_VERIFY_SECRET as string,
      {
        expiresIn: "5m",
      },
    );

    return {
      phoneNumber,
      verificationToken,
    };
  }

  async verifyOTP({
    otpCode,
    token,
    deviceId,
    userAgent,
    ipAddress,
  }: VerifyOtpInput) {
    if (!token) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.OTP_TOKEN_MISSING,
      );
    }

    let decoded: any;
    try {
      decoded = authHelper.verifyToken(
        token,
        myEnvironment.OTP_VERIFY_SECRET as string,
      );
    } catch {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.OTP_REQUEST_NEW,
      );
    }

    const { phoneNumber } = decoded;

    // Verify the OTP code via otpService (handles expiry, attempts, cleanup)
    await otpService.verifyOTP(phoneNumber, otpCode);

    const deviceType = /mobile/i.test(userAgent) ? "MOBILE" : "WEB";

    const { user, accessToken, refreshToken } = await prisma.$transaction(
      async (tx) => {
        let user = await tx.user.findUnique({
          where: { phoneNumber },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              phoneNumber,
              isPhoneVerified: true,
              role: "STUDENT",
              isActive: true,
            },
          });
        } else {
          if (!user.isActive) {
            throw new ApiError(
              HTTP_STATUS.FORBIDDEN,
              ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
            );
          }

          user = await tx.user.update({
            where: { id: user.id },
            data: {
              isPhoneVerified: true,
              lastLoginAt: new Date(),
            },
          });
        }

        const accessToken = authHelper.signToken(
          { id: user.id },
          myEnvironment.ACCESS_SECRET as string,
          { expiresIn: "3d" },
        );

        const refreshToken = authHelper.signToken(
          { id: user.id },
          myEnvironment.REFRESH_SECRET as string,
          { expiresIn: "7d" },
        );

        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

        await tx.session.create({
          data: {
            userId: user.id,
            token: accessToken,
            refreshToken,
            deviceId,
            deviceName: userAgent,
            deviceType,
            expiresAt: refreshTokenExpiry,
            ipAddress,
            userAgent,
            isActive: true,
          },
        });

        return { user, accessToken, refreshToken };
      },
    );

    return { user, accessToken, refreshToken };
  }

  async logout(userId?: string, refreshToken?: string) {
    if (!userId || !refreshToken) {
      // Nothing to invalidate, but logout should still succeed
      return;
    }

    await prisma.session.updateMany({
      where: {
        userId,
        refreshToken,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  async getMe(userId: string) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        freeTestsUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }
}

export const authService = new AuthService();