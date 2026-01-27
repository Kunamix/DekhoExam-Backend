import { prisma } from "@/configs";
import { ApiError } from "@/utils";

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
  displayOrder?: number;
  createdById: string;
}

interface UpdateCategoryInput {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
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
    displayOrder = 0,
    createdById,
  }: CreateCategoryInput) {
    if (!createdById) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!name) {
      throw new ApiError(400, "Category name is required");
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category with this name already exists");
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        imageUrl,
        displayOrder,
        createdById,
      },
    });

    return category;
  }

  async update({
    id,
    name,
    description,
    imageUrl,
    displayOrder,
    isActive,
  }: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    // Prevent duplicate names
    if (name && name !== category.name) {
      const existingCategory = await prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory) {
        throw new ApiError(409, "Category with this name already exists");
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl,
        displayOrder,
        isActive,
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
    if(!categoryId){
      throw new ApiError(401,"Please provide categoryId")
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
      throw new ApiError(404, "Category not found");
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
      throw new ApiError(404, "Category not found");
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
      throw new ApiError(400, "Subjects array is required");
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
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
      include: {
        _count: {
          select: {
            tests: true,
            categorySubjects: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    if (category._count.tests > 0 || category._count.categorySubjects > 0) {
      throw new ApiError(
        400,
        "Cannot delete category with associated tests or subjects",
      );
    }

    await prisma.category.delete({
      where: { id },
    });
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
      throw new ApiError(404, "One or more categories not found");
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
