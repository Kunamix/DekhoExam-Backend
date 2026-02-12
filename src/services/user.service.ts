import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { TestStatus } from "@/generated/prisma/enums";
import { ApiError } from "@/utils";
import { authHelper } from "@/utils/auth-helper.util";

interface UpdateProfileInput {
  userId: string;
  name?: string;
  email?: string;
}

interface UpdatePasswordInput {
  userId: string;
  currentPassword?: string;
  newPassword: string;
}

interface GetAllUsersAdvancedInput {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface GetTestRankingsParams {
  testId: string;
  userId?: string;
  page: number;
  limit: number;
}

interface RankingData {
  userRank: {
    rank: number | null;
    totalMarks: number | null;
    percentage: number | null;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    userName: string;
  } | null;
  topRankers: Array<{
    rank: number;
    userId: string;
    userName: string;
    avatar: string | null;
    totalMarks: number;
    percentage: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    submittedAt: Date;
  }>;
  totalParticipants: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface GetGlobalRankingsParams {
  userId?: string;
  page: number;
  limit: number;
  categoryId?: string;
  subjectId?: string;
  period?: string;
}

interface GlobalRankingData {
  userRank: {
    rank: number | null;
    totalTests: number;
    averageScore: number;
    totalMarks: number;
    bestScore: number;
    userName: string;
    avatar: string | null;
  } | null;
  topRankers: Array<{
    rank: number;
    userId: string;
    userName: string;
    avatar: string | null;
    totalTests: number;
    averageScore: number;
    totalMarks: number;
    bestScore: number;
    lastTestDate: Date | null;
  }>;
  stats: {
    totalStudents: number;
    totalTestsCompleted: number;
    averageGlobalScore: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class UserService {
  async updateProfile({ userId, name, email }: UpdateProfileInput) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    if (!name && !email) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PROVIDE_NAME_OR_EMAIL,
      );
    }

    const dataToUpdate: any = {};

    if (name) {
      dataToUpdate.name = name;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.INVALID_EMAIL_FORMAT,
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
        );
      }

      dataToUpdate.email = email;
      dataToUpdate.isEmailVerified = false;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        isEmailVerified: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updatePassword({
    userId,
    currentPassword,
    newPassword,
  }: UpdatePasswordInput) {
    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    if (!newPassword) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.NEW_PASSWORD_REQUIRED,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.password) {
      if (!currentPassword) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.CURRENT_PASSWORD_REQUIRED,
        );
      }

      const isMatch = await authHelper.verifyHash(
        currentPassword,
        user.password,
      );

      if (!isMatch) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
        );
      }
    }

    const hashedPassword = await authHelper.signHash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 🔐 Security: logout all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  async getAllUsers({
    page = 1,
    limit = 10,
    role,
    isActive,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  }: GetAllUsersAdvancedInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        {
          phoneNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          freeTestsUsed: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              testAttempts: true,
              subscriptions: true,
              payments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
        testAttempts: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testNumber: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        sessions: {
          where: { isActive: true },
        },
        _count: {
          select: {
            testAttempts: true,
            subscriptions: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  async toggleBan(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    if (user.role === "ADMIN") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.CANNOT_BAN_ADMIN,
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: updated.isActive ? "USER_UNBANNED" : "USER_BANNED",
        entity: "USER",
        entityId: id,
      },
    });

    if (!updated.isActive) {
      await prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    return updated;
  }

  async deleteUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    if (user.role === "ADMIN") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.CANNOT_DELETE_ADMIN,
      );
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "USER_DELETED",
        entity: "USER",
        entityId: id,
      },
    });

    await prisma.user.delete({ where: { id } });
  }

  async resetFreeTests(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);

    const updated = await prisma.user.update({
      where: { id },
      data: { freeTestsUsed: 0 },
      select: {
        id: true,
        name: true,
        freeTestsUsed: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "FREE_TESTS_RESET",
        entity: "USER",
        entityId: id,
      },
    });

    return updated;
  }

  async invalidateSessions(id: string, adminId: string) {
    const deleted = await prisma.session.deleteMany({
      where: { userId: id },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "SESSIONS_INVALIDATED",
        entity: "USER",
        entityId: id,
        details: { count: deleted.count },
      },
    });

    return deleted.count;
  }

  async getStats() {
    const [
      total,
      active,
      banned,
      students,
      admins,
      emailVerified,
      phoneVerified,
      recent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({
        where: { isEmailVerified: true },
      }),
      prisma.user.count({
        where: { isPhoneVerified: true },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      active,
      banned,
      byRole: { students, admins },
      verification: { emailVerified, phoneVerified },
      recentRegistrations: recent,
    };
  }

  // ================= SEARCH =================
  async search(query: string, limit = 10) {
    if (!query || query.length < 2) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.SEARCH_QUERY_TOO_SHORT,
      );
    }

    return prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            phoneNumber: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
      },
    });
  }

  async getTestRankings({
    testId,
    userId,
    page,
    limit,
  }: GetTestRankingsParams):Promise<RankingData> {
    // Verify test exists
    const test = await prisma.test.findUnique({
      where: { id: testId, isActive: true },
    });

    if (!test) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TEST_NOT_FOUND);
    }

    // Get total participants count
    const totalParticipants = await prisma.testAttempt.count({
      where: {
        testId,
        status: TestStatus.SUBMITTED,
      },
    });

    // Calculate offset
    const skip = (page - 1) * limit;

    // Get rankings with user details
    const rankings = await prisma.testAttempt.findMany({
      where: {
        testId,
        status: TestStatus.SUBMITTED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { totalMarks: "desc" },
        { submittedAt: "asc" }, // Earlier submission breaks tie
      ],
      skip,
      take: limit,
    });

    // Get user's rank if userId is provided
    let userRank = null;
    if (userId) {
      const userAttempt = await prisma.testAttempt.findFirst({
        where: {
          testId,
          userId,
          status: TestStatus.SUBMITTED,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ totalMarks: "desc" }, { submittedAt: "asc" }],
      });

      if (userAttempt) {
        // Calculate user's rank
        const betterAttempts = await prisma.testAttempt.count({
          where: {
            testId,
            status: TestStatus.SUBMITTED,
            OR: [
              { totalMarks: { gt: userAttempt.totalMarks || 0 } },
              {
                totalMarks: userAttempt.totalMarks,
                submittedAt: { lt: userAttempt.submittedAt || new Date() },
              },
            ],
          },
        });

        userRank = {
          rank: betterAttempts + 1,
          totalMarks: userAttempt.totalMarks?.toNumber() || null,
          percentage: userAttempt.percentage?.toNumber() || null,
          attemptedCount: userAttempt.attemptedCount,
          correctCount: userAttempt.correctCount,
          incorrectCount: userAttempt.incorrectCount,
          userName: userAttempt.user.name || "Anonymous",
        };
      }
    }

    // Format top rankers
    const topRankers = rankings.map((attempt, index) => ({
      rank: skip + index + 1,
      userId: attempt.userId,
      userName: attempt.user.name || "Anonymous",
      avatar: attempt.user.avatar,
      totalMarks: attempt.totalMarks?.toNumber() || 0,
      percentage: attempt.percentage?.toNumber() || 0,
      attemptedCount: attempt.attemptedCount,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      submittedAt: attempt.submittedAt || attempt.createdAt,
    }));

    // Calculate pagination
    const totalPages = Math.ceil(totalParticipants / limit);

    return {
      userRank,
      topRankers,
      totalParticipants,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: totalParticipants,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getGlobalRankings({
    userId,
    page,
    limit,
    categoryId,
    subjectId,
    period = "all_time",
  }: GetGlobalRankingsParams): Promise<GlobalRankingData> {
    // Build date filter based on period
    let dateFilter = {};
    const now = new Date();

    if (period === "weekly") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { submittedAt: { gte: weekAgo } };
    } else if (period === "monthly") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { submittedAt: { gte: monthAgo } };
    }

    // Build base where clause
    const whereClause: any = {
      status: TestStatus.SUBMITTED,
      ...dateFilter,
    };

    // Add category/subject filter if provided
    if (categoryId || subjectId) {
      whereClause.test = {};
      if (categoryId) {
        whereClause.test.categoryId = categoryId;
      }
      if (subjectId) {
        whereClause.test.subjectId = subjectId;
      }
    }

    // Get aggregated student performance data
    const studentPerformance = await prisma.testAttempt.groupBy({
      by: ["userId"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        totalMarks: true,
      },
      _max: {
        totalMarks: true,
        submittedAt: true,
      },
      _avg: {
        totalMarks: true,
      },
    });

    // Calculate total students
    const totalStudents = studentPerformance.length;

    // Sort by average score (descending), then by total tests (descending)
    const sortedPerformance = studentPerformance
      .map((perf) => ({
        userId: perf.userId,
        totalTests: perf._count.id,
        totalMarks: perf._sum.totalMarks?.toNumber() || 0,
        averageScore: perf._avg.totalMarks?.toNumber() || 0,
        bestScore: perf._max.totalMarks?.toNumber() || 0,
        lastTestDate: perf._max.submittedAt,
      }))
      .sort((a, b) => {
        // Primary: Average score
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        // Secondary: Total tests (more tests = higher rank)
        if (b.totalTests !== a.totalTests) {
          return b.totalTests - a.totalTests;
        }
        // Tertiary: Best score
        return b.bestScore - a.bestScore;
      });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const paginatedPerformance = sortedPerformance.slice(skip, skip + limit);

    // Get user details for paginated results
    const userIds = paginatedPerformance.map((p) => p.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    // Create user map for quick lookup
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format top rankers
    const topRankers = paginatedPerformance.map((perf, index) => {
      const user = userMap.get(perf.userId);
      return {
        rank: skip + index + 1,
        userId: perf.userId,
        userName: user?.name || "Anonymous",
        avatar: user?.avatar || null,
        totalTests: perf.totalTests,
        averageScore: Math.round(perf.averageScore * 100) / 100,
        totalMarks: Math.round(perf.totalMarks * 100) / 100,
        bestScore: Math.round(perf.bestScore * 100) / 100,
        lastTestDate: perf.lastTestDate,
      };
    });

    // Get user's rank if userId is provided
    let userRank = null;
    if (userId) {
      const userIndex = sortedPerformance.findIndex((p) => p.userId === userId);
      if (userIndex !== -1) {
        const userPerf = sortedPerformance[userIndex];
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatar: true },
        });

        userRank = {
          rank: userIndex + 1,
          totalTests: userPerf.totalTests,
          averageScore: Math.round(userPerf.averageScore * 100) / 100,
          totalMarks: Math.round(userPerf.totalMarks * 100) / 100,
          bestScore: Math.round(userPerf.bestScore * 100) / 100,
          userName: user?.name || "Anonymous",
          avatar: user?.avatar || null,
        };
      }
    }

    // Calculate global stats
    const totalTestsCompleted = await prisma.testAttempt.count({
      where: whereClause,
    });

    const avgScoreResult = await prisma.testAttempt.aggregate({
      where: whereClause,
      _avg: {
        totalMarks: true,
      },
    });

    const stats = {
      totalStudents,
      totalTestsCompleted,
      averageGlobalScore:
        Math.round((avgScoreResult._avg.totalMarks?.toNumber() || 0) * 100) /
        100,
    };

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalStudents / limit);

    return {
      userRank,
      topRankers,
      stats,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: totalStudents,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

export const userService = new UserService();
