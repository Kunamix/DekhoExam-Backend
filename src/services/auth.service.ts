import { myEnvironment, prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";
import { authHelper } from "@/utils/auth-helper.util";

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

    // 1. Clear old OTPs
    await prisma.oTP.deleteMany({
      where: { phoneNumber },
    });

    // 2. Generate OTP + expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const otp = "123456"; // TODO: replace with real generator

    // 3. Save OTP
    const otpRecord = await prisma.oTP.create({
      data: {
        code: otp,
        phoneNumber,
        expiresAt,
      },
    });

    // 4. Create verification token
    const verificationToken = authHelper.signToken(
      {
        phoneNumber,
        otpId: otpRecord.id,
      },
      myEnvironment.OTP_VERIFY_SECRET as string,
      {
        expiresIn: "5m",
      },
    );

    return {
      phoneNumber,
      verificationToken,
      expiresAt,
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

    const { otpId, phoneNumber } = decoded;

    const otpRecord = await prisma.oTP.findUnique({
      where: { id: otpId },
    });

    if (!otpRecord) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_REQUEST_OR_OTP,
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTP.delete({ where: { id: otpId } });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.OTP_EXPIRED);
    }

    if (otpRecord.attempts >= 3) {
      await prisma.oTP.delete({ where: { id: otpId } });
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS,
      );
    }

    if (otpRecord.code !== otpCode) {
      await prisma.oTP.update({
        where: { id: otpId },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.INVALID_OTP);
    }

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

        await tx.oTP.delete({ where: { id: otpId } });

        return { user, accessToken, refreshToken };
      },
    );

    await prisma.oTP.deleteMany({
      where: { phoneNumber },
    });

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
