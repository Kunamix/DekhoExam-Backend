import { prisma } from "@/configs";

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

export class UserService {
  async updateProfile({ userId, name, email }: UpdateProfileInput) {
    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!name && !email) {
      throw new ApiError(400, "Please provide a name or email to update");
    }

    const dataToUpdate: any = {};

    if (name) {
      dataToUpdate.name = name;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ApiError(
          409,
          "Email is already associated with another account",
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
      throw new ApiError(401, "Unauthorized request");
    }

    if (!newPassword) {
      throw new ApiError(400, "New password is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.password) {
      if (!currentPassword) {
        throw new ApiError(400, "Current password is required");
      }

      const isMatch = await authHelper.verifyHash(
        currentPassword,
        user.password,
      );

      if (!isMatch) {
        throw new ApiError(401, "Current password is incorrect");
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
      throw new ApiError(404, "User not found");
    }

    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  async toggleBan(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "ADMIN") {
      throw new ApiError(
        403,
        "Cannot ban admin users",
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
        action: updated.isActive
          ? "USER_UNBANNED"
          : "USER_BANNED",
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

    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "ADMIN") {
      throw new ApiError(
        403,
        "Cannot delete admin users",
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

    if (!user) throw new ApiError(404, "User not found");

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
            gte: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ),
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
        400,
        "Search query must be at least 2 characters",
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
}

export const userService = new UserService();
