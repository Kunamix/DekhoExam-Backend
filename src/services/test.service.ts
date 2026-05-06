import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
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
  /**
   * Get recently used question IDs for a category (within last 10 days)
   */
  private async getUsedQuestionIds(categoryId: string): Promise<Set<string>> {
    const usedQuestions = await prisma.questionUsage.findMany({
      where: {
        categoryId,
        // ✅ No time filter — all previously used questions
      },
      select: {
        questionId: true,
      },
    });

    return new Set(usedQuestions.map((usage) => usage.questionId));
  }

  /**
   * Record question usage for tracking
   */
  private async recordQuestionUsage(
    questionIds: string[],
    categoryId: string,
    testId: string,
  ): Promise<void> {
    const usageRecords = questionIds.map((questionId) => ({
      questionId,
      categoryId,
      testId,
      usedAt: new Date(),
    }));

    await prisma.questionUsage.createMany({
      data: usageRecords,
    });
  }

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
    // 🔹 Validate required fields
    if (!categoryId || !name || !testNumber) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TEST_FIELDS_REQUIRED,
      );
    }

    // 🔹 Check category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      );
    }

    // 🔹 Check duplicate test number
    const existingTest = await prisma.test.findFirst({
      where: {
        categoryId,
        testNumber,
      },
    });

    if (existingTest) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.TEST_NUMBER_EXISTS,
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
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.NO_SUBJECTS_CONFIGURED,
      );
    }

    // 🔹 Get all previously used question IDs for this category
    const usedQuestionIds = await this.getUsedQuestionIds(categoryId);

    const selectedQuestionIds: string[] = [];

    // 🔹 Allocate questions per subject
    for (const item of blueprint) {
      const topicIds = item.subject.topics.map((t) => t.id);
      const required = item.questionsPerTest;

      // Fetch all active questions for this subject
      const allQuestions = await prisma.question.findMany({
        where: {
          topicId: { in: topicIds },
          isActive: true,
        },
        select: { id: true },
      });

      // ❌ Real error — not enough total questions even with reuse
      if (allQuestions.length < required) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `${item.subject.name}: Only ${allQuestions.length} questions exist but ${required} are required. Please upload more questions.`,
        );
      }

      // ✅ Split into fresh and used pools
      const freshQuestions = allQuestions.filter(
        (q) => !usedQuestionIds.has(q.id),
      );
      const usedQuestions = allQuestions.filter((q) =>
        usedQuestionIds.has(q.id),
      );

      // 🔀 Shuffle both pools independently
      const shuffledFresh = freshQuestions.sort(() => 0.5 - Math.random());
      const shuffledUsed = usedQuestions.sort(() => 0.5 - Math.random());

      // ✅ Pick fresh first, fill gap with used if needed
      const picked = [
        ...shuffledFresh.slice(0, required),
        ...shuffledUsed.slice(0, required - shuffledFresh.length),
      ].slice(0, required);

      selectedQuestionIds.push(...picked.map((q) => q.id));
    }

    // 🔀 Final shuffle — mix all subjects together
    const finalQuestionIds = selectedQuestionIds.sort(
      () => 0.5 - Math.random(),
    );

    // 🔹 Create test and record question usage in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const test = await tx.test.create({
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

      // 📝 Record question usage for future reference
      const usageRecords = finalQuestionIds.map((questionId) => ({
        questionId,
        categoryId,
        testId: test.id,
        usedAt: new Date(),
      }));

      await tx.questionUsage.createMany({
        data: usageRecords,
      });

      return test;
    });

    return {
      test: result,
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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
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
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.TEST_NUMBER_EXISTS,
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
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TEST_NUMBER_REQUIRED,
      );
    }

    const original = await prisma.test.findUnique({
      where: { id },
    });

    if (!original) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
    }

    const duplicate = await prisma.test.findFirst({
      where: {
        categoryId: original.categoryId,
        testNumber,
      },
    });

    if (duplicate) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.TEST_NUMBER_EXISTS,
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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Delete all answers inside all attempts of this test
      await tx.testAttemptAnswer.deleteMany({
        where: {
          attempt: {
            testId: id,
          },
        },
      });

      // 2️⃣ Delete all test attempts
      await tx.testAttempt.deleteMany({
        where: { testId: id },
      });

      // 3️⃣ Delete question usage records for this test
      await tx.questionUsage.deleteMany({
        where: { testId: id },
      });

      // 4️⃣ Finally delete the test itself
      await tx.test.delete({
        where: { id },
      });
    });

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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
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
        { name: { contains: search } },
        {
          description: {
            contains: search,
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
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CATEGORY_ID_REQUIRED,
      );
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
        category: true,
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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
    }

    return test;
  }

  async startTest(userId: string, testId: string) {
    if (!userId || !testId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.USER_TEST_ID_REQUIRED,
      );
    }

    // 1️⃣ Fetch test & user
    const [test, user] = await Promise.all([
      prisma.test.findUnique({ where: { id: testId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!test)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
    if (!user)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);

    // 2️⃣ Block multiple active attempts (VERY IMPORTANT)
    const activeAttempt = await prisma.testAttempt.findFirst({
      where: {
        userId,
        testId,
        status: "IN_PROGRESS",
      },
    });

    if (activeAttempt) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.ACTIVE_ATTEMPT_EXISTS,
      );
    }

    // 3️⃣ Determine next attempt number
    const lastAttempt = await prisma.testAttempt.findFirst({
      where: { userId, testId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });

    const nextAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

    // 4️⃣ Access control (SUBSCRIPTION > FREE)
    let consumeFreeAttempt = false;

    if (test.isPaid) {
      const FREE_LIMIT = 2;

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
        if (user.freeTestsUsed < FREE_LIMIT) {
          consumeFreeAttempt = true;
        } else {
          throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            ERROR_MESSAGES.NO_FREE_TESTS,
          );
        }
      }
    }

    // 5️⃣ Question selection
    let selectedQuestions: any[] = [];

    // CASE 1️⃣ Pre-selected questions
    if (
      test.preSelectedQuestionIds &&
      Array.isArray(test.preSelectedQuestionIds)
    ) {
      const questionIds = test.preSelectedQuestionIds as string[];

      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds }, isActive: true },
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

      if (questions.length !== questionIds.length) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.PRESELECTED_QUESTIONS_MISSING,
        );
      }

      selectedQuestions = questionIds.map(
        (id) => questions.find((q) => q.id === id)!,
      );
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

      if (allQuestionIds.length < test.totalQuestions) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.NOT_ENOUGH_QUESTIONS,
        );
      }

      const selectedIds = allQuestionIds
        .sort(() => Math.random() - 0.5)
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

        if (allQuestionIds.length < item.questionsPerTest) {
          throw new ApiError(
            500,
            `Not enough questions for subject ${item.subject.id}`,
          );
        }

        const selectedIds = allQuestionIds
          .sort(() => Math.random() - 0.5)
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

    // 6️⃣ Transaction: create attempt + consume free test
    const attempt = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.testAttempt.create({
        data: {
          userId,
          testId,
          attemptNumber: nextAttemptNumber,
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

      return createdAttempt;
    });

    // 7️⃣ Response
    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      duration: test.durationMinutes,
      questions: selectedQuestions,
      isFreeAttempt: consumeFreeAttempt,
    };
  }

  /**
   * Utility method to get question availability stats for a category
   */
  async getQuestionAvailabilityStats(categoryId: string) {
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

    const recentlyUsedIds = await this.getUsedQuestionIds(categoryId);

    const stats = await Promise.all(
      blueprint.map(async (item) => {
        const topicIds = item.subject.topics.map((t) => t.id);

        const totalQuestions = await prisma.question.count({
          where: {
            topicId: { in: topicIds },
            isActive: true,
          },
        });

        const allQuestions = await prisma.question.findMany({
          where: {
            topicId: { in: topicIds },
            isActive: true,
          },
          select: { id: true },
        });

        const availableQuestions = allQuestions.filter(
          (q) => !recentlyUsedIds.has(q.id),
        ).length;

        return {
          subjectId: item.subject.id,
          subjectName: item.subject.name,
          required: item.questionsPerTest,
          total: totalQuestions,
          available: availableQuestions,
          recentlyUsed: totalQuestions - availableQuestions,
          canCreateTest: availableQuestions >= item.questionsPerTest,
        };
      }),
    );

    return {
      categoryId,
      subjects: stats,
      canCreateTest: stats.every((s) => s.canCreateTest),
    };
  }
}

export const testService = new TestService();
