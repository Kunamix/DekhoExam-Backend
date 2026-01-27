import { myEnvironment, prisma } from "@/configs";

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
      throw new ApiError(400, "Please provide phone number");
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
      throw new ApiError(401, "Verification token is missing");
    }

    let decoded: any;
    try {
      decoded = authHelper.verifyToken(
        token,
        myEnvironment.OTP_VERIFY_SECRET as string,
      );
    } catch {
      throw new ApiError(401, "Session expired. Please request a new OTP");
    }

    const { otpId, phoneNumber } = decoded;

    const otpRecord = await prisma.oTP.findUnique({
      where: { id: otpId },
    });

    if (!otpRecord) {
      throw new ApiError(400, "Invalid request or OTP expired");
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTP.delete({ where: { id: otpId } });
      throw new ApiError(400, "OTP has expired");
    }

    if (otpRecord.attempts >= 3) {
      await prisma.oTP.delete({ where: { id: otpId } });
      throw new ApiError(
        429,
        "Too many failed attempts. Please request a new OTP",
      );
    }

    if (otpRecord.code !== otpCode) {
      await prisma.oTP.update({
        where: { id: otpId },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(400, "Invalid OTP code");
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
              403,
              "Your account has been deactivated. Contact Admin",
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
      throw new ApiError(401, "Unauthorized request");
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
      throw new ApiError(404, "User not found");
    }

    return user;
  }
}

export const authService = new AuthService();
