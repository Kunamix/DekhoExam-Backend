import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { categoryService } from "@/services/category.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { name, description, displayOrder } = req.body;
    const file = (req as any).file;

    if (!userId) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    const category = await categoryService.create({
      name,
      description,
      imagePath: file?.path, // Pass file path if image was uploaded
      displayOrder:displayOrder ? parseInt(displayOrder) : 0,
      createdById: userId,
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          category,
          SUCCESS_MESSAGES.CATEGORY_CREATED,
        ),
      );
  },
);


export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, displayOrder, isActive, removeImage } = req.body;
    const file = (req as any).file;

    // Parse boolean and number fields from FormData
    const parsedIsActive = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const parsedRemoveImage = removeImage === 'true' ? true : removeImage === 'false' ? false : false;
    const parsedDisplayOrder = displayOrder ? parseInt(displayOrder) : undefined;

    const updatedCategory = await categoryService.update({
      id: id.toString(),
      name,
      description,
      imagePath: file?.path, // Pass file path if new image was uploaded
      displayOrder: parsedDisplayOrder,
      isActive: parsedIsActive,
      removeImage: parsedRemoveImage, // Handle explicit image removal
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedCategory,
          SUCCESS_MESSAGES.CATEGORY_UPDATED,
        ),
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

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await categoryService.toggleCategoryStatus(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
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
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_ID_REQUIRED,
      );
    }

    const result = await categoryService.assignSubjects({
      categoryId: categoryId.toString(),
      subjects,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.SUBJECTS_ASSIGNED,
        ),
      );
  },
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await categoryService.delete({ id: id.toString() });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.CATEGORY_DELETED,
        ),
      );
  },
);

export const reorderCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORIES_ARRAY_REQUIRED,
      );
    }

    const result = await categoryService.reorderCategories(categories);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.CATEGORIES_REORDERED,
        ),
      );
  },
);
