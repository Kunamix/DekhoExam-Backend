import { userService } from "@/services/user.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const result = await userService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
      role: role as string | undefined,
      isActive:
        isActive !== undefined
          ? isActive === "true"
          : undefined,
      search: search as string | undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Users fetched successfully",
      ),
    );
  },
);

export const getUserById = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.getById(req.params.id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User fetched successfully"));
  },
);

export const toggleUserBan = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const user = await userService.toggleBan(
      req.params.id.toString(),
      adminId,
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        user,
        `User ${user.isActive ? "unbanned" : "banned"} successfully`,
      ),
    );
  },
);

export const deleteUser = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    await userService.deleteUser(req.params.id.toString(), adminId);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User deleted successfully"));
  },
);

export const resetUserFreeTests = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const user = await userService.resetFreeTests(
      req.params.id.toString(),
      adminId,
    );

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Free tests reset successfully"));
  },
);

export const invalidateUserSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const count = await userService.invalidateSessions(
      req.params.id.toString(),
      adminId,
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        { sessionsInvalidated: count },
        "User sessions invalidated successfully",
      ),
    );
  },
);

export const getUserStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await userService.getStats();

    return res
      .status(200)
      .json(
        new ApiResponse(200, stats, "User statistics fetched successfully"),
      );
  },
);

export const searchUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const { query, limit = 10 } = req.query;

    const users = await userService.search(
      query as string,
      Number(limit),
    );

    return res
      .status(200)
      .json(new ApiResponse(200, users, "Users search completed"));
  },
);

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