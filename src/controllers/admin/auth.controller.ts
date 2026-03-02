import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { myEnvironment } from "@/configs";
import { adminAuthService } from "@/services/admin-auth.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.PROVIDE_ALL_FIELDS,
    );
  }

  // ================= PASSWORD LOGIN =================
  if (email && password) {
    const { admin, accessToken, refreshToken } =
      await adminAuthService.loginWithPassword({
        email,
        password,
        deviceId: req.body.deviceId,
        deviceName: req.body.deviceName,
        deviceType: req.body.deviceType,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 3 * 24 * 60 * 60 * 1000,
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
          accessToken,
          refreshToken,
        },
        SUCCESS_MESSAGES.LOGIN_SUCCESS,
      ),
    );
  }

  // ================= OTP LOGIN =================
  const otpData = await adminAuthService.loginWithOTP({
    phoneNumber,
  });

  res.cookie("otpVerifyToken", otpData.token, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    maxAge: 5 * 60 * 1000,
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, otpData, SUCCESS_MESSAGES.OTP_SENT));
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { otpCode } = req.body;

  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies?.otpVerifyToken;

  if (!token) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.OTP_TOKEN_MISSING,
    );
  }

  const { admin, accessToken, refreshToken } = await adminAuthService.verifyOTP(
    {
      otpCode,
      token,
      deviceId: req.body.deviceId,
      deviceName: req.body.deviceName,
      deviceType: req.body.deviceType,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    },
  );

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    maxAge: 3 * 24 * 60 * 60 * 1000,
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        user: {
          id: admin.id,
          name: admin.name,
          phoneNumber: admin.phoneNumber,
          role: admin.role,
          email: admin.email,
        },
        accessToken,
        refreshToken,
      },
      SUCCESS_MESSAGES.LOGIN_SUCCESS,
    ),
  );
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
      );
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await adminAuthService.refreshToken({ refreshToken });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 3 * 24 * 60 * 60 * 1000,
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        SUCCESS_MESSAGES.TOKEN_REFRESHED,
      ),
    );
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  await adminAuthService.logout({ userId });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/", // VERY IMPORTANT
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/", // VERY IMPORTANT
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, SUCCESS_MESSAGES.LOGOUT_SUCCESS));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.SESSION_EXPIRED,
    );
  }

  const admin = await adminAuthService.getMe({ userId });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        admin,
        SUCCESS_MESSAGES.USER_INFO_FETCHED,
      ),
    );
});
