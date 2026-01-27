import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { categoryService } from "@/services/category.service";

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { name, description, imageUrl, displayOrder } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const category = await categoryService.create({
      name,
      description,
      imageUrl,
      displayOrder,
      createdById: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, category, "Category created successfully"));
  },
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, imageUrl, displayOrder, isActive } = req.body;

    const updatedCategory = await categoryService.update({
      id: id.toString(),
      name,
      description,
      imageUrl,
      displayOrder,
      isActive,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedCategory, "Category updated successfully"),
      );
  },
);

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
      .status(200)
      .json(new ApiResponse(200, result, "Categories fetched successfully"));
  },
);

export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, category, "Category fetched successfully"));
  },
);

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await categoryService.toggleCategoryStatus(id.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          category,
          `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
        ),
      );
  },
);

export const assignSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { subjects } = req.body;

    if (!categoryId) {
      throw new ApiError(400, "Category ID is required");
    }

    const result = await categoryService.assignSubjects({
      categoryId:categoryId.toString(),
      subjects,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Subjects assigned to category successfully",
      ),
    );
  },
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    await categoryService.delete({ id:id.toString() });

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Category deleted successfully"),
      );
  },
);

export const reorderCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      throw new ApiError(400, "Categories array is required");
    }

    const result = await categoryService.reorderCategories(categories);

    return res
      .status(200)
      .json(
        new ApiResponse(200, result, "Categories reordered successfully")
      );
  }
);