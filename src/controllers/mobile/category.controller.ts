import { Request, Response } from "express";
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

    return res.status(200).json(
      new ApiResponse(200, result, "Categories fetched successfully")
    );
  }
);

export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const category = await categoryService.getCategoryById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, category, "Category fetched successfully"));
  }
);

export const checkCategoryAccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result = await categoryService.checkCategoryAccess(
      userId,
      id.toString()
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          result.isUnlocked ? "Unlocked" : "Locked"
        )
      );
  }
);