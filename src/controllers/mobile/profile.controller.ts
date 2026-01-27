import { userService } from "@/services/user.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

// PATCH /user/profile
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { name, email } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const updatedUser = await userService.updateProfile({
      userId,
      name,
      email,
    });

    return res.status(200).json(
      new ApiResponse(200, updatedUser, "Profile updated successfully")
    );
  }
);

// PATCH /user/password
export const updatePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    await userService.updatePassword({
      userId,
      currentPassword,
      newPassword,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Password updated successfully. Please login again."
      )
    );
  }
);
