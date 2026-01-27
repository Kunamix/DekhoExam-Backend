import { prisma } from "@/configs";
import { Prisma } from "@/generated/prisma/client";
import { SubscriptionType } from "@/generated/prisma/enums";
import { ApiError } from "@/utils";

interface GetAllTestsInput {
  page?: number;
  limit?: number;
  isActive?: boolean;
  isPaid?: boolean;
  search?: string;
  categoryId?: string;
  subjectId?: string;
}

interface CreateTestInput {
  userId: string;
  categoryId: string;
  subjectId?: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  positiveMarks?: number;
  negativeMarks?: number;
  isPaid?: boolean;
  testNumber: number;
}

interface UpdateTestInput {
  id: string;
  name?: string;
  description?: string;
  totalQuestions?: number;
  durationMinutes?: number;
  positiveMarks?: number;
  negativeMarks?: number;
  isPaid?: boolean;
  testNumber?: number;
  isActive?: boolean;
}

export class TestService {
  async createTest({
    userId,
    categoryId,
    subjectId,
    name,
    description,
    durationMinutes = 60,
    positiveMarks = 1,
    negativeMarks = 0.2,
    isPaid = true,
    testNumber,
  }: CreateTestInput) {
    if (!categoryId || !name || !testNumber) {
      throw new ApiError(
        400,
        "Category ID, test name, and test number are required",
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    const existingTest = await prisma.test.findFirst({
      where: {
        categoryId,
        testNumber,
      },
    });

    if (existingTest) {
      throw new ApiError(
        409,
        "Test with this number already exists in this category",
      );
    }

    // 🔹 Load blueprint (category → subjects → topics)
    const blueprint = await prisma.categorySubject.findMany({
      where: { categoryId },
      include: {
        subject: {
          include: {
            topics: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (blueprint.length === 0) {
      throw new ApiError(400, "No subjects configured for this category");
    }

    // 🔹 Collect already-used question IDs
    const existingTests = await prisma.test.findMany({
      where: {
        categoryId,
        preSelectedQuestionIds: { not: Prisma.DbNull },
      },
      select: { preSelectedQuestionIds: true },
    });

    const usedQuestionIds = new Set<string>();
    existingTests.forEach((test) => {
      const ids = (test.preSelectedQuestionIds as string[]) || [];
      ids.forEach((id) => usedQuestionIds.add(id));
    });

    const selectedQuestionIds: string[] = [];
    const insufficientSubjects: string[] = [];

    // 🔹 Allocate questions per subject
    for (const item of blueprint) {
      const topicIds = item.subject.topics.map((t) => t.id);
      const required = item.questionsPerTest;

      const allQuestions = await prisma.question.findMany({
        where: {
          topicId: { in: topicIds },
          isActive: true,
        },
        select: { id: true },
      });

      const unusedQuestions = allQuestions.filter(
        (q) => !usedQuestionIds.has(q.id),
      );

      if (unusedQuestions.length < required) {
        insufficientSubjects.push(
          `${item.subject.name}: Need ${required}, but only ${unusedQuestions.length} unused questions available`,
        );
        continue;
      }

      const shuffled = unusedQuestions.sort(() => 0.5 - Math.random());

      const picked = shuffled.slice(0, required);
      selectedQuestionIds.push(...picked.map((q) => q.id));
    }

    if (insufficientSubjects.length > 0) {
      throw new ApiError(
        400,
        `Insufficient unused questions:\n${insufficientSubjects.join(
          "\n",
        )}\n\nPlease upload more questions before creating this test`,
      );
    }

    // 🔹 Final shuffle
    const finalQuestionIds = selectedQuestionIds.sort(
      () => 0.5 - Math.random(),
    );

    const test = await prisma.test.create({
      data: {
        categoryId,
        subjectId,
        name,
        description,
        totalQuestions: finalQuestionIds.length,
        durationMinutes,
        positiveMarks,
        negativeMarks,
        isPaid,
        testNumber,
        preSelectedQuestionIds: finalQuestionIds,
        createdById: userId,
      },
    });

    return {
      test,
      questionsAssigned: finalQuestionIds.length,
    };
  }

  async update({
    id,
    name,
    description,
    totalQuestions,
    durationMinutes,
    positiveMarks,
    negativeMarks,
    isPaid,
    testNumber,
    isActive,
  }: UpdateTestInput) {
    const test = await prisma.test.findUnique({
      where: { id },
    });

    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    // Check duplicate test number
    if (testNumber !== undefined && testNumber !== test.testNumber) {
      const existing = await prisma.test.findFirst({
        where: {
          categoryId: test.categoryId,
          testNumber,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ApiError(
          409,
          "Test with this number already exists in this category",
        );
      }
    }

    return prisma.test.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(totalQuestions !== undefined && {
          totalQuestions,
        }),
        ...(durationMinutes !== undefined && {
          durationMinutes,
        }),
        ...(positiveMarks !== undefined && {
          positiveMarks,
        }),
        ...(negativeMarks !== undefined && {
          negativeMarks,
        }),
        ...(isPaid !== undefined && { isPaid }),
        ...(testNumber !== undefined && { testNumber }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }
  async clone(id: string, testNumber: number, userId: string) {
    if (!testNumber) {
      throw new ApiError(400, "Test number is required for cloning");
    }

    const original = await prisma.test.findUnique({
      where: { id },
    });

    if (!original) {
      throw new ApiError(404, "Test not found");
    }

    const duplicate = await prisma.test.findFirst({
      where: {
        categoryId: original.categoryId,
        testNumber,
      },
    });

    if (duplicate) {
      throw new ApiError(
        409,
        "Test with this number already exists in this category",
      );
    }

    return prisma.test.create({
      data: {
        categoryId: original.categoryId,
        subjectId: original.subjectId,
        name: `${original.name} (Copy)`,
        description: original.description,
        totalQuestions: original.totalQuestions,
        durationMinutes: original.durationMinutes,
        positiveMarks: original.positiveMarks,
        negativeMarks: original.negativeMarks,
        isPaid: original.isPaid,
        testNumber,
        createdById: userId,
      },
    });
  }

  async delete(id: string) {
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        _count: {
          select: { testAttempts: true },
        },
      },
    });

    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    // Soft delete
    if (test._count.testAttempts > 0) {
      await prisma.test.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        deleted: false,
        deactivated: true,
      };
    }

    // Hard delete
    await prisma.test.delete({ where: { id } });

    return {
      deleted: true,
      deactivated: false,
    };
  }
  async toggleStatus(id: string) {
    const test = await prisma.test.findUnique({
      where: { id },
    });

    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    return prisma.test.update({
      where: { id },
      data: { isActive: !test.isActive },
    });
  }

  async getStats(testId?: string) {
    const where: any = {};

    if (testId) {
      where.testId = testId;
    }

    const [
      totalAttempts,
      submittedAttempts,
      avgMarks,
      avgPercentage,
      statusBreakdownRaw,
    ] = await Promise.all([
      prisma.testAttempt.count({ where }),

      prisma.testAttempt.count({
        where: { ...where, status: "SUBMITTED" },
      }),

      prisma.testAttempt.aggregate({
        where: { ...where, status: "SUBMITTED" },
        _avg: { totalMarks: true },
      }),

      prisma.testAttempt.aggregate({
        where: { ...where, status: "SUBMITTED" },
        _avg: { percentage: true },
      }),

      prisma.testAttempt.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
    ]);

    const statusBreakdown = statusBreakdownRaw.reduce(
      (acc: Record<string, number>, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      },
      {},
    );

    return {
      totalAttempts,
      submittedAttempts,
      inProgressAttempts: totalAttempts - submittedAttempts,
      averageScore: avgMarks._avg.totalMarks || 0,
      averagePercentage: avgPercentage._avg.percentage || 0,
      statusBreakdown,
    };
  }

  async getAllTests({
    page = 1,
    limit = 10,
    isActive,
    isPaid,
    search,
    categoryId,
    subjectId,
  }: GetAllTestsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (typeof isPaid === "boolean") {
      where.isPaid = isPaid;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ testNumber: "asc" }, { createdAt: "desc" }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              testAttempts: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.test.count({ where }),
    ]);

    return {
      tests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTestsByCategory(categoryId: string, userId: string) {
    if (!categoryId) {
      throw new ApiError(400, "Category ID is required");
    }

    const tests = await prisma.test.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        testAttempts: {
          where: { userId },
          select: {
            id: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1, // only latest attempt
        },
      },
    });

    // 🎯 Format response for frontend
    return tests.map((test) => {
      const lastAttempt = test.testAttempts[0];

      let attemptStatus = "NOT_STARTED";
      if (lastAttempt) {
        attemptStatus = lastAttempt.status;
      }

      return {
        id: test.id,
        name: test.name,
        description: test.description,
        totalQuestions: test.totalQuestions,
        durationMinutes: test.durationMinutes,
        isPaid: test.isPaid,
        attemptStatus,
        lastAttemptId: lastAttempt?.id ?? null,
      };
    });
  }

  async getPopularTests(limit = 5) {
    const tests = await prisma.test.findMany({
      where: { isActive: true },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        totalQuestions: true,
        durationMinutes: true,
        isPaid: true,
        category: {
          select: { name: true },
        },
      },
    });

    return tests;
  }

  async getTestById(testId: string) {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            categorySubjects: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        testAttempts: {
          select: {
            id: true,
            userId: true,
            attemptNumber: true,
            status: true,
            totalMarks: true,
            percentage: true,
            submittedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            testAttempts: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    return test;
  }

  async getTestInstructions(testId: string) {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        totalQuestions: true,
        positiveMarks: true,
        negativeMarks: true,
        isPaid: true,
      },
    });

    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    return test;
  }

  async startTest(userId: string, testId: string) {
    if (!userId || !testId) {
      throw new ApiError(400, "User ID and Test ID are required");
    }

    const [test, user] = await Promise.all([
      prisma.test.findUnique({ where: { id: testId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!test) throw new ApiError(404, "Test not found");
    if (!user) throw new ApiError(404, "User not found");

    let consumeFreeAttempt = false;

    // 🔐 Access control for paid tests
    if (test.isPaid) {
      const FREE_LIMIT = 2;

      if (user.freeTestsUsed < FREE_LIMIT) {
        consumeFreeAttempt = true;
      } else {
        const activeSubscription = await prisma.userSubscription.findFirst({
          where: {
            userId,
            isActive: true,
            endDate: { gt: new Date() },
            OR: [
              { type: SubscriptionType.ALL_CATEGORIES },
              {
                type: SubscriptionType.CATEGORY_SPECIFIC,
                categoryId: test.categoryId,
              },
            ],
          },
        });

        if (!activeSubscription) {
          throw new ApiError(
            403,
            "You have used your free attempts. Please purchase a subscription.",
          );
        }
      }
    }

    // 🧠 Question selection
    let selectedQuestions: any[] = [];

    // CASE 1️⃣ Pre-selected questions
    if (
      test.preSelectedQuestionIds &&
      Array.isArray(test.preSelectedQuestionIds)
    ) {
      const questionIds = test.preSelectedQuestionIds as string[];

      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          questionText: true,
          option1: true,
          option2: true,
          option3: true,
          option4: true,
          questionImageUrl: true,
        },
      });

      selectedQuestions = questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter(Boolean);
    }

    // CASE 2️⃣ Subject-specific test
    else if (test.subjectId) {
      const topics = await prisma.topic.findMany({
        where: { subjectId: test.subjectId, isActive: true },
        select: { id: true },
      });

      const topicIds = topics.map((t) => t.id);

      const allQuestionIds = await prisma.question.findMany({
        where: { topicId: { in: topicIds }, isActive: true },
        select: { id: true },
      });

      const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
      const selectedIds = shuffled
        .slice(0, test.totalQuestions)
        .map((q) => q.id);

      selectedQuestions = await prisma.question.findMany({
        where: { id: { in: selectedIds } },
        select: {
          id: true,
          questionText: true,
          option1: true,
          option2: true,
          option3: true,
          option4: true,
          questionImageUrl: true,
        },
      });
    }

    // CASE 3️⃣ Full mock (category blueprint)
    else {
      const blueprint = await prisma.categorySubject.findMany({
        where: { categoryId: test.categoryId },
        include: {
          subject: {
            include: { topics: { select: { id: true } } },
          },
        },
      });

      for (const item of blueprint) {
        const topicIds = item.subject.topics.map((t) => t.id);

        const allQuestionIds = await prisma.question.findMany({
          where: { topicId: { in: topicIds }, isActive: true },
          select: { id: true },
        });

        const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
        const selectedIds = shuffled
          .slice(0, item.questionsPerTest)
          .map((q) => q.id);

        const questions = await prisma.question.findMany({
          where: { id: { in: selectedIds } },
          select: {
            id: true,
            questionText: true,
            option1: true,
            option2: true,
            option3: true,
            option4: true,
            questionImageUrl: true,
          },
        });

        selectedQuestions.push(...questions);
      }
    }

    // 🔒 Transaction: attempt + free usage
    const attempt = await prisma.$transaction(async (tx) => {
      const attempt = await tx.testAttempt.create({
        data: {
          userId,
          testId,
          attemptNumber: 1,
          totalQuestions: selectedQuestions.length,
          questionIds: selectedQuestions.map((q) => q.id),
          questionSetSeed: Date.now().toString(),
          status: "IN_PROGRESS",
        },
      });

      if (consumeFreeAttempt) {
        await tx.user.update({
          where: { id: userId },
          data: { freeTestsUsed: { increment: 1 } },
        });
      }

      return attempt;
    });

    return {
      attemptId: attempt.id,
      duration: test.durationMinutes,
      questions: selectedQuestions,
      isFreeAttempt: consumeFreeAttempt,
    };
  }
}

export const testService = new TestService();
