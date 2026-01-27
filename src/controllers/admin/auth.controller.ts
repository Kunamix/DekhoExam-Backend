import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { myEnvironment } from "@/configs";
import { adminAuthService } from "@/services/admin-auth.service";

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      throw new ApiError(400, "Please provide all fields");
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
        sameSite:
          myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: myEnvironment.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite:
          myEnvironment.NODE_ENV === "production" ? "none" : "lax",
      });

      return res.status(200).json(
        new ApiResponse(
          200,
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
          "Login Successful",
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
      sameSite:
        myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        otpData,
        "OTP sent successfully",
      ),
    );
  },
);

export const verifyOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const { otpCode } = req.body;

    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.cookies?.otpVerifyToken;

    if (!token) {
      throw new ApiError(401, "OTP verification token missing");
    }

    const { admin, accessToken, refreshToken } =
      await adminAuthService.verifyOTP({
        otpCode,
        token,
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
      sameSite:
        myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite:
        myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: admin.id,
            name: admin.name,
            phoneNumber: admin.phoneNumber,
            role: admin.role,
          },
          accessToken,
          refreshToken,
        },
        "Login successful",
      ),
    );
  },
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, "Refresh token required");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await adminAuthService.refreshToken({ refreshToken });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 3 * 24 * 60 * 60 * 1000,
      sameSite:
        myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: myEnvironment.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite:
        myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "Token refreshed successfully",
      ),
    );
  },
);

export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    await adminAuthService.logout({ userId });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/", // VERY IMPORTANT
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/", // VERY IMPORTANT
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Logout successful"));
  },
);

export const getMe = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, "Your session is expired");
    }

    const admin = await adminAuthService.getMe({ userId });

    return res.status(200).json(
      new ApiResponse(
        200,
        admin,
        "User info fetched successfully",
      ),
    );
  },
);