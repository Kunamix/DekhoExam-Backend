import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { userService } from "@/services/user.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

// PATCH /user/profile
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

// PATCH /user/password
export const updatePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    await userService.updatePassword({
      userId,
      currentPassword,
      newPassword,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          null,
          SUCCESS_MESSAGES.PASSWORD_UPDATED,
        ),
      );
  },
);

export const getTestRankings = asyncHandler(
  async (req: Request, res: Response) => {
    const { testId } = req.params;
    const userId = req.user?.id;
    const { page = 1, limit = 50 } = req.query;

    if (!testId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    }

    const rankings = await userService.getTestRankings({
      testId:testId.toString(),
      userId,
      page: Number(page),
      limit: Number(limit),
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          rankings,
          SUCCESS_MESSAGES.DATA_FETCHED,
        ),
      );
  },
);

export const getGlobalRankings = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
      page = 1, 
      limit = 50, 
      categoryId, 
      subjectId,
      period = 'all_time' // all_time, monthly, weekly
    } = req.query;

    const rankings = await userService.getGlobalRankings({
      userId,
      page: Number(page),
      limit: Number(limit),
      categoryId: categoryId as string | undefined,
      subjectId: subjectId as string | undefined,
      period: period as string,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          rankings,
          SUCCESS_MESSAGES.DATA_FETCHED,
        ),
      );
  },
);