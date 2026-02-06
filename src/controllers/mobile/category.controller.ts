import { Request, Response } from "express";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { categoryService } from "@/services/category.service";

export const getAllCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = "1", limit = "10", isActive, search } = req.query;

    const result = await categoryService.getAllCategories({
      page: Number(page),
      limit: Number(limit),
      isActive: isActive as string | undefined,
      search: search as string | undefined,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.CATEGORIES_FETCHED,
        ),
      );
  },
);

export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          category,
          SUCCESS_MESSAGES.CATEGORY_FETCHED,
        ),
      );
  },
);

export const checkCategoryAccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const result = await categoryService.checkCategoryAccess(
      userId,
      id.toString(),
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          result.isUnlocked ? "Unlocked" : "Locked",
        ),
      );
  },
);
