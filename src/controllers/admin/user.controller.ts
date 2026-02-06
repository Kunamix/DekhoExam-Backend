import { userService } from "@/services/user.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
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
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    search: search as string | undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as "asc" | "desc",
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, result, SUCCESS_MESSAGES.USERS_FETCHED),
    );
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.params.id.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, user, SUCCESS_MESSAGES.USER_FETCHED));
});

export const toggleUserBan = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const user = await userService.toggleBan(req.params.id.toString(), adminId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          user,
          `User ${user.isActive ? "unbanned" : "banned"} successfully`,
        ),
      );
  },
);

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;

  await userService.deleteUser(req.params.id.toString(), adminId);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, SUCCESS_MESSAGES.USER_DELETED));
});

export const resetUserFreeTests = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const user = await userService.resetFreeTests(
      req.params.id.toString(),
      adminId,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          user,
          SUCCESS_MESSAGES.FREE_TESTS_RESET,
        ),
      );
  },
);

export const invalidateUserSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    const count = await userService.invalidateSessions(
      req.params.id.toString(),
      adminId,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { sessionsInvalidated: count },
          SUCCESS_MESSAGES.SESSIONS_INVALIDATED,
        ),
      );
  },
);

export const getUserStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await userService.getStats();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.USER_STATS_FETCHED,
        ),
      );
  },
);

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { query, limit = 10 } = req.query;

  const users = await userService.search(query as string, Number(limit));

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, users, SUCCESS_MESSAGES.SEARCH_COMPLETED),
    );
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { name, email } = req.body;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const updatedUser = await userService.updateProfile({
      userId,
      name,
      email,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedUser,
          SUCCESS_MESSAGES.PROFILE_UPDATED,
        ),
      );
  },
);
