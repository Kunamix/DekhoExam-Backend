import { prisma, myEnvironment } from "@/configs";

import { ApiError } from "@/utils";
import { authHelper } from "@/utils/auth-helper.util";

interface AdminPasswordLoginInput {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AdminOtpLoginInput {
  phoneNumber: string;
}

interface AdminVerifyOtpInput {
  otpCode: string;
  token: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AdminRefreshTokenInput {
  refreshToken: string;
}

interface AdminLogoutInput {
  userId: string;
}

interface GetAdminProfileInput {
  userId: string;
}

export class AdminAuthService {
  async loginWithPassword({
    email,
    password,
    deviceId = "web-admin",
    deviceName = "Admin Panel",
    deviceType = "WEB",
    ipAddress,
    userAgent = "",
  }: AdminPasswordLoginInput) {
    const admin = await prisma.user.findUnique({
      where: { email },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(401, "Invalid credentials");
    }

    if (!admin.password) {
      throw new ApiError(401, "Please use OTP login");
    }

    const isPasswordValid = await authHelper.verifyHash(
      password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    await prisma.session.deleteMany({
      where: { userId: admin.id },
    });

    const accessToken = authHelper.signToken(
      { id: admin.id },
      myEnvironment.ACCESS_SECRET as string,
      { expiresIn: "3d" },
    );

    const refreshToken = authHelper.signToken(
      { id: admin.id },
      myEnvironment.REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: admin.id,
        deviceId,
        deviceName,
        deviceType,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await prisma.user.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      admin,
      accessToken,
      refreshToken,
    };
  }

  async loginWithOTP({ phoneNumber }: AdminOtpLoginInput) {
    const admin = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(401, "Invalid phone number");
    }

    const otpCode = "123456"; // TODO: real generator
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await prisma.oTP.deleteMany({
      where: { phoneNumber },
    });

    const otpRecord = await prisma.oTP.create({
      data: {
        phoneNumber,
        code: otpCode,
        purpose: "admin-login",
        expiresAt,
      },
    });

    const token = authHelper.signToken(
      {
        id: admin.id,
        otpId: otpRecord.id,
        phoneNumber,
      },
      myEnvironment.OTP_VERIFY_SECRET as string,
      { expiresIn: "5m" },
    );

    return {
      otpId: otpRecord.id,
      expiresAt,
      phoneNumber,
      token,
    };
  }

  async verifyOTP({
    otpCode,
    token,
    deviceId = "web-admin",
    deviceName = "Admin Panel",
    deviceType = "WEB",
    ipAddress,
    userAgent = "",
  }: AdminVerifyOtpInput) {
    let decoded: any;

    try {
      decoded = authHelper.verifyToken(
        token,
        myEnvironment.OTP_VERIFY_SECRET as string,
      );
    } catch {
      throw new ApiError(401, "OTP session expired");
    }

    const otpRecord = await prisma.oTP.findUnique({
      where: { id: decoded.otpId },
    });

    if (
      !otpRecord ||
      otpRecord.phoneNumber?.toString() !==
        decoded.phoneNumber.toString()
    ) {
      throw new ApiError(401, "Invalid OTP");
    }

    if (otpRecord.isVerified) {
      throw new ApiError(401, "OTP already used");
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new ApiError(401, "OTP expired");
    }

    if (otpRecord.attempts >= 3) {
      throw new ApiError(429, "Too many attempts");
    }

    if (otpRecord.code !== otpCode) {
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      throw new ApiError(401, "Invalid OTP");
    }

    const admin = await prisma.user.findUnique({
      where: { phoneNumber: decoded.phoneNumber },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(401, "Invalid credentials");
    }

    // 🔥 transactional safety
    const { accessToken, refreshToken } = await prisma.$transaction(
      async (tx) => {
        await tx.session.deleteMany({
          where: { userId: admin.id },
        });

        await tx.oTP.delete({
          where: { id: otpRecord.id },
        });

        const accessToken = authHelper.signToken(
          { id: admin.id },
          myEnvironment.ACCESS_SECRET as string,
          { expiresIn: "3d" },
        );

        const refreshToken = authHelper.signToken(
          { id: admin.id },
          myEnvironment.REFRESH_SECRET as string,
          { expiresIn: "7d" },
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await tx.session.create({
          data: {
            userId: admin.id,
            deviceId,
            deviceName,
            deviceType,
            token: accessToken,
            refreshToken,
            expiresAt,
            ipAddress,
            userAgent,
          },
        });

        await tx.user.update({
          where: { id: admin.id },
          data: {
            lastLoginAt: new Date(),
            isPhoneVerified: true,
          },
        });

        return { accessToken, refreshToken };
      },
    );

    return {
      admin,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken({ refreshToken }: AdminRefreshTokenInput) {
    let decoded: any;

    try {
      decoded = authHelper.verifyToken(
        refreshToken,
        myEnvironment.REFRESH_SECRET as string,
      );
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        userId: decoded.id,
        isActive: true,
      },
    });

    if (!session) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      throw new ApiError(401, "Session expired");
    }

    const newAccessToken = authHelper.signToken(
      { id: decoded.id },
      myEnvironment.ACCESS_SECRET as string,
      { expiresIn: "3d" },
    );

    const newRefreshToken = authHelper.signToken(
      { id: decoded.id },
      myEnvironment.REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        lastActivity: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout({ userId }: AdminLogoutInput) {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    await prisma.session.deleteMany({
      where: { userId },
    });
  }


  async getMe({ userId }: GetAdminProfileInput) {
    if (!userId) {
      throw new ApiError(401, "Your session is expired");
    }

    const admin = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(401, "Unauthorized request");
    }

    return admin;
  }
}

export const adminAuthService = new AdminAuthService();
