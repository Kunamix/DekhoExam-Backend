import { myEnvironment } from "@/configs";
import { authService } from "@/services";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  const data = await authService.login(phoneNumber);

  res.cookie("verificationToken", data.verificationToken, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 5 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(200, data, "OTP sent successfully")
  );
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { otpCode } = req.body;

  if (!otpCode) {
    throw new ApiError(400, "OTP code is required");
  }

  const token =
    req.headers.authorization?.split(" ")[1] ||
    req.cookies?.verificationToken;

  const deviceId =
    req.headers["x-device-id"]?.toString() ??
    req.cookies?.deviceId ??
    "unknown-device";

  const userAgent = req.headers["user-agent"] ?? "unknown";

  const { user, accessToken, refreshToken } =
    await authService.verifyOTP({
      otpCode,
      token,
      deviceId,
      userAgent,
      ipAddress: req.ip,
    });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: myEnvironment.NODE_ENV === "production",
    sameSite: myEnvironment.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user, accessToken, refreshToken },
      "User verified and logged in successfully"
    )
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  await authService.logout(userId, refreshToken);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await authService.getMe(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// export const updateProfile = asyncHandler(
//   async (req: Request, res: Response) => {
//     const userId = (req as any).user?.userId;
//     const { name, email } = req.body;

//     if (!userId) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     // 1. Validation: Ensure at least one field is provided
//     if (!name && !email) {
//       throw new ApiError(400, "Please provide a name or email to update");
//     }

//     // 2. Prepare the data object dynamically
//     const dataToUpdate: any = {};

//     // Handle Name Update
//     if (name) {
//       dataToUpdate.name = name;
//     }

//     // Handle Email Update
//     if (email) {
//       // A. Check if email is valid format (Basic Regex)
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(email)) {
//         throw new ApiError(400, "Invalid email format");
//       }

//       // B. Check if email is already taken by ANOTHER user
//       const existingUser = await prisma.user.findUnique({
//         where: { email },
//       });

//       if (existingUser && existingUser.id !== userId) {
//         throw new ApiError(
//           409,
//           "Email is already associated with another account",
//         );
//       }

//       dataToUpdate.email = email;
//       // Important: If email changes, it is no longer verified
//       dataToUpdate.isEmailVerified = false;
//     }

//     // 3. Update User in Database
//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: dataToUpdate,
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         phoneNumber: true,
//         role: true,
//         isEmailVerified: true,
//         updatedAt: true,
//       },
//     });

//     return res
//       .status(200)
//       .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
//   },
// );

// export const updatePassword = asyncHandler(
//   async (req: Request, res: Response) => {
//     const userId = (req as any).user?.userId;
//     const { currentPassword, newPassword } = req.body;

//     if (!userId) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     if (!newPassword) {
//       throw new ApiError(400, "New password is required");
//     }

//     // 1️⃣ Get user with password
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         password: true,
//       },
//     });

//     if (!user) {
//       throw new ApiError(404, "User not found");
//     }

//     // 2️⃣ If password EXISTS → verify current password
//     if (user.password) {
//       if (!currentPassword) {
//         throw new ApiError(400, "Current password is required");
//       }

//       const isMatch = await authHelper.verifyHash(
//         currentPassword,
//         user.password,
//       );

//       if (!isMatch) {
//         throw new ApiError(401, "Current password is incorrect");
//       }
//     }

//     // 3️⃣ Hash new password
//     const hashedPassword = await authHelper.signHash(newPassword);

//     // 4️⃣ Update password
//     await prisma.user.update({
//       where: { id: userId },
//       data: {
//         password: hashedPassword,
//       },
//     });

//     // 5️⃣ OPTIONAL BUT RECOMMENDED: logout all sessions
//     await prisma.session.deleteMany({
//       where: { userId },
//     });

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           null,
//           "Password updated successfully. Please login again.",
//         ),
//       );
//   },
// );
