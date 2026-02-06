import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";
import {
  uploadImageFromPath,
  extractPublicIdFromUrl,
  deleteImage,
  deleteLocalFile,
} from "@/configs/cloudinary.config";

interface GetAllCategoriesInput {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
}

interface CreateCategoryInput {
  name: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string; // Local file path from multer
  displayOrder?: number;
  createdById: string;
}

interface UpdateCategoryInput {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string; // Local file path from multer
  displayOrder?: number;
  isActive?: boolean;
  removeImage?: boolean;
}

interface AssignSubjectsInput {
  categoryId: string;
  subjects: {
    subjectId: string;
    questionsPerTest: number;
    displayOrder?: number;
  }[];
}

interface DeleteCategoryInput {
  id: string;
}

export class CategoryService {
  async create({
    name,
    description,
    imageUrl,
    imagePath,
    displayOrder = 0,
    createdById,
  }: CreateCategoryInput) {
    if (!createdById) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!name?.trim()) {
      // Delete local file if validation fails
      if (imagePath) {
        deleteLocalFile(imagePath);
      }
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_NAME_REQUIRED,
      );
    }

    // Check for duplicate category name
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      // Delete local file if upload failed due to duplicate
      if (imagePath) {
        deleteLocalFile(imagePath);
      }
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS,
      );
    }

    let cloudinaryImageUrl = imageUrl;

    // Upload image to Cloudinary if imagePath is provided
    if (imagePath) {
      try {
        const uploadResult = await uploadImageFromPath(imagePath, "categories");
        cloudinaryImageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error("Failed to upload image to Cloudinary:", error);
        // Local file is already deleted by uploadImageFromPath
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.IMAGE_UPLOAD_FAILED,
        );
      }
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        imageUrl: cloudinaryImageUrl,
        displayOrder: displayOrder || 0,
        createdById,
      },
      include: {
        categorySubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    return category;
  }

  async update({
    id,
    name,
    description,
    imageUrl,
    imagePath,
    displayOrder,
    isActive,
    removeImage = false,
  }: UpdateCategoryInput) {
    // Fetch existing category
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      // Delete local file if category not found
      if (imagePath) {
        deleteLocalFile(imagePath);
      }
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    // Prevent duplicate names (only if name is being changed)
    if (name && name.trim() !== category.name) {
      const existingCategory = await prisma.category.findUnique({
        where: { name: name.trim() },
      });

      if (existingCategory) {
        // Delete local file if duplicate found
        if (imagePath) {
          deleteLocalFile(imagePath);
        }
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.CATEGORY_ALREADY_EXISTS,
        );
      }
    }

    let finalImageUrl = category.imageUrl; // Keep existing image by default
    let oldImagePublicId: string | null = null;

    // SCENARIO 1: User wants to explicitly remove the image
    if (removeImage === true) {
      if (category.imageUrl) {
        oldImagePublicId = extractPublicIdFromUrl(category.imageUrl);
        if (oldImagePublicId) {
          try {
            await deleteImage(oldImagePublicId);
          } catch (deleteError) {
            console.warn(
              "Failed to delete old image from Cloudinary:",
              deleteError,
            );
            // Continue even if deletion fails
          }
        }
      }
      finalImageUrl = null; // Remove image URL
    }
    // SCENARIO 2: User is uploading a new image
    else if (imagePath) {
      // Extract public_id from old image URL for deletion
      if (category.imageUrl) {
        oldImagePublicId = extractPublicIdFromUrl(category.imageUrl);
      }

      try {
        // Upload new image to Cloudinary
        const uploadResult = await uploadImageFromPath(imagePath, "categories");
        finalImageUrl = uploadResult.secure_url;

        // Delete old image from Cloudinary if exists
        if (oldImagePublicId) {
          try {
            await deleteImage(oldImagePublicId);
          } catch (deleteError) {
            console.warn(
              "Failed to delete old image from Cloudinary:",
              deleteError,
            );
            // Continue even if old image deletion fails
          }
        }
      } catch (error) {
        console.error("Failed to upload image to Cloudinary:", error);
        // Local file is already deleted by uploadImageFromPath
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.IMAGE_UPLOAD_FAILED,
        );
      }
    }
    // SCENARIO 3: User is providing a new imageUrl directly (not a file upload)
    else if (imageUrl && imageUrl !== category.imageUrl) {
      // Delete old image if exists
      if (category.imageUrl) {
        oldImagePublicId = extractPublicIdFromUrl(category.imageUrl);
        if (oldImagePublicId) {
          try {
            await deleteImage(oldImagePublicId);
          } catch (deleteError) {
            console.warn(
              "Failed to delete old image from Cloudinary:",
              deleteError,
            );
          }
        }
      }
      finalImageUrl = imageUrl;
    }
    // SCENARIO 4: No image changes - keep existing image (already set as default)

    // Prepare update data - only include fields that are provided
    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Always update imageUrl (could be new, removed, or same)
    updateData.imageUrl = finalImageUrl;

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        categorySubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  async getAllCategories({
    page = 1,
    limit = 10,
    isActive,
    search,
  }: GetAllCategoriesInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: {
          categorySubjects: {
            include: {
              subject: true,
            },
          },
          _count: {
            select: {
              tests: true,
              subscriptionPlans: true,
            },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryById(categoryId: string) {
    if (!categoryId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_ID_REQUIRED,
      );
    }
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        categorySubjects: {
          include: {
            subject: {
              include: {
                topics: {
                  where: { isActive: true },
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
        tests: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            testNumber: true,
            isPaid: true,
          },
          orderBy: { testNumber: "asc" },
        },
        subscriptionPlans: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    return category;
  }

  async checkCategoryAccess(userId: string, categoryId: string) {
    const activeSub = await prisma.userSubscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: { gt: new Date() },
        OR: [{ categoryId }, { type: "ALL_CATEGORIES" }],
      },
    });

    if (activeSub) {
      return {
        isUnlocked: true,
      };
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        categoryId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        durationDays: true,
      },
    });

    return {
      isUnlocked: false,
      purchaseOption: plan,
    };
  }

  async toggleCategoryStatus(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isActive: true },
    });

    if (!category) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: !category.isActive },
      include: {
        categorySubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            tests: true,
            subscriptionPlans: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  async assignSubjects({ categoryId, subjects }: AssignSubjectsInput) {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.SUBJECTS_ARRAY_REQUIRED,
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    // Transaction = safe replace
    const result = await prisma.$transaction(async (tx) => {
      // Remove old mappings
      await tx.categorySubject.deleteMany({
        where: { categoryId },
      });

      // Insert new mappings
      const created = await tx.categorySubject.createMany({
        data: subjects.map((subject) => ({
          categoryId,
          subjectId: subject.subjectId,
          questionsPerTest: subject.questionsPerTest,
          displayOrder: subject.displayOrder ?? 0,
        })),
      });

      return created;
    });

    return result;
  }

  async delete({ id }: DeleteCategoryInput) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    // Delete image from Cloudinary if exists
    if (category.imageUrl) {
      const publicId = extractPublicIdFromUrl(category.imageUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.warn(
            "Failed to delete image from Cloudinary during category deletion:",
            deleteError,
          );
          // Continue with category deletion even if image deletion fails
        }
      }
    }

    // Delete category (cascade will handle related records)
    await prisma.category.delete({
      where: { id },
    });

    return { message: "Category deleted successfully" };
  }

  async reorderCategories(
    categories: Array<{ id: string; displayOrder: number }>,
  ) {
    // Validate all category IDs exist
    const categoryIds = categories.map((cat) => cat.id);
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    if (existingCategories.length !== categoryIds.length) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORIES_NOT_FOUND,
      );
    }

    // Update display orders in a transaction
    const updatePromises = categories.map((cat) =>
      prisma.category.update({
        where: { id: cat.id },
        data: { displayOrder: cat.displayOrder },
      }),
    );

    await prisma.$transaction(updatePromises);

    // Return updated categories
    const updatedCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      orderBy: { displayOrder: "asc" },
      include: {
        categorySubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            tests: true,
            subscriptionPlans: true,
          },
        },
      },
    });

    return updatedCategories;
  }
}

export const categoryService = new CategoryService();
