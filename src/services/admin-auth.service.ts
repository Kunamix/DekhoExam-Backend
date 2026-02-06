import { prisma, myEnvironment } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
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
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    if (!admin.password) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.PLEASE_USE_OTP_LOGIN,
      );
    }

    const isPasswordValid = await authHelper.verifyHash(
      password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
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
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      );
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
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.OTP_SESSION_EXPIRED,
      );
    }

    const otpRecord = await prisma.oTP.findUnique({
      where: { id: decoded.otpId },
    });

    if (
      !otpRecord ||
      otpRecord.phoneNumber?.toString() !== decoded.phoneNumber.toString()
    ) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_OTP);
    }

    if (otpRecord.isVerified) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.OTP_ALREADY_USED,
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.OTP_EXPIRED);
    }

    if (otpRecord.attempts >= 3) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS,
      );
    }

    if (otpRecord.code !== otpCode) {
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_OTP);
    }

    const admin = await prisma.user.findUnique({
      where: { phoneNumber: decoded.phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        // password excluded!
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        freeTestsUsed: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
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
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
      );
    }

    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        userId: decoded.id,
        isActive: true,
      },
    });

    if (!session) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
      );
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.SESSION_EXPIRED,
      );
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
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  async getMe({ userId }: GetAdminProfileInput) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.TOKEN_EXPIRED,
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        // password excluded!
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        freeTestsUsed: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    return admin;
  }
}

export const adminAuthService = new AdminAuthService();
