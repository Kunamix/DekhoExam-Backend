import { prisma } from "@/configs";
import { format, startOfMonth, subDays } from "date-fns";

export class DashboardService {
  async getStats() {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);

    // 1️⃣ Parallel queries
    const [
      totalUsers,
      totalUsersLastMonth,
      totalCategories,
      totalQuestions,
      activeSubscriptions,
      totalRevenue,
      totalRevenueLastMonth,
    ] = await Promise.all([
      // Users
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({
        where: {
          role: "STUDENT",
          createdAt: { lt: thisMonthStart },
        },
      }),

      // Content
      prisma.category.count({ where: { isActive: true } }),
      prisma.question.count({ where: { isActive: true } }),

      // Subscriptions
      prisma.userSubscription.count({
        where: { isActive: true, endDate: { gt: today } },
      }),

      // Revenue (total)
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),

      // Revenue (before this month)
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          createdAt: { lt: thisMonthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    // 2️⃣ Growth calculations
    const currentRevenue = Number(totalRevenue._sum.amount || 0);
    const previousRevenue = Number(totalRevenueLastMonth._sum.amount || 0);

    const revenueGrowth =
      previousRevenue === 0
        ? 100
        : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    const userGrowth =
      totalUsersLastMonth === 0
        ? 100
        : ((totalUsers - totalUsersLastMonth) / totalUsersLastMonth) * 100;

    return {
      totalUsers,
      userGrowth: Number(userGrowth.toFixed(1)),
      totalCategories,
      totalQuestions,
      activeSubscriptions,
      totalRevenue: currentRevenue,
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
    };
  }

  async getCharts() {
    const today = new Date();

    const fifteenDaysAgo = subDays(today, 15);

    const usersLast15Days = await prisma.user.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: fifteenDaysAgo } },
      _count: { id: true },
    });

    const userRegistrationData = usersLast15Days.map((item) => ({
      date: format(item.createdAt, "yyyy-MM-dd"),
      users: item._count.id,
    }));

    // ================= 2️⃣ Subscription Distribution =================
    const subDistributionRaw = await prisma.userSubscription.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { id: true },
    });

    const subscriptionDistribution = subDistributionRaw.map((item, index) => ({
      name:
        item.type === "CATEGORY_SPECIFIC"
          ? "Category-Specific"
          : "All Categories",
      value: item._count.id,
      fill: index === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
    }));

    // ================= 3️⃣ Test Attempts by Category =================
    const categories = await prisma.category.findMany({
      include: {
        tests: {
          include: {
            _count: {
              select: { testAttempts: true },
            },
          },
        },
      },
    });

    const testAttemptsByCategory = categories
      .map((cat) => ({
        category: cat.name,
        attempts: cat.tests.reduce(
          (acc, test) => acc + test._count.testAttempts,
          0,
        ),
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 8);

    // ================= 4️⃣ Monthly Revenue (Last 12 Months) =================
    const monthlyRevenue = await prisma.$queryRaw<
      { month: string; revenue: number }[]
    >`
      SELECT 
        TO_CHAR("createdAt", 'Mon') AS month,
        SUM(amount)::float AS revenue
      FROM "Payment"
      WHERE status = 'SUCCESS'
        AND "createdAt" > NOW() - INTERVAL '1 year'
      GROUP BY TO_CHAR("createdAt", 'Mon'), EXTRACT(MONTH FROM "createdAt")
      ORDER BY EXTRACT(MONTH FROM "createdAt")
    `;

    return {
      userRegistrationData,
      subscriptionDistribution,
      testAttemptsByCategory,
      monthlyRevenue,
    };
  }

  async getAnalytics() {
    const today = new Date();
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    // ================= 1️⃣ Test Attempts by Category =================
    const categoryAttempts = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        name: true,
        tests: {
          select: {
            _count: {
              select: { testAttempts: true },
            },
          },
        },
      },
    });

    const testAttemptsByCategory = categoryAttempts
      .map((cat) => ({
        category: cat.name,
        attempts: cat.tests.reduce(
          (sum, test) => sum + test._count.testAttempts,
          0,
        ),
      }))
      .sort((a, b) => b.attempts - a.attempts);

    // ================= 2️⃣ Daily Registrations (Last 7 Days) =================
    const dailyRegistrations = await prisma.$queryRaw<
      Array<{ date: string; users: number }>
    >`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as users
      FROM "User"
      WHERE "createdAt" >= ${last7Days}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // ================= 3️⃣ Question Difficulty Distribution =================
    const difficultyStats = await prisma.question.groupBy({
      by: ["difficultyLevel"],
      where: { isActive: true },
      _count: { id: true },
    });

    const difficultyDistribution = difficultyStats.map((stat) => ({
      name: stat.difficultyLevel,
      value: stat._count.id,
    }));

    // ================= 4️⃣ Test Performance Stats =================
    const testStats = await prisma.testAttempt.aggregate({
      where: {
        status: "SUBMITTED",
        createdAt: { gte: last30Days },
      },
      _avg: { percentage: true },
      _count: { id: true },
    });

    // ================= 5️⃣ Top Performing Users =================
    const topPerformers = await prisma.$queryRaw<
      Array<{
        userId: string;
        name: string;
        email: string;
        avgScore: number;
        testsAttempted: number;
      }>
    >`
      SELECT 
        u.id as "userId",
        u.name,
        u.email,
        AVG(ta.percentage)::numeric(5,2) as "avgScore",
        COUNT(ta.id)::int as "testsAttempted"
      FROM "User" u
      INNER JOIN "TestAttempt" ta ON ta."userId" = u.id
      WHERE ta.status = 'SUBMITTED'
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(ta.id) >= 3
      ORDER BY "avgScore" DESC
      LIMIT 10
    `;

    // ================= 6️⃣ Subscription Conversion Funnel =================
    const [totalUsers, usersWithAttempts, activeSubscribers] =
      await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.user.count({
          where: {
            role: "STUDENT",
            testAttempts: { some: {} },
          },
        }),
        prisma.userSubscription.count({
          where: { isActive: true, endDate: { gt: today } },
        }),
      ]);

    const conversionFunnel = [
      { name: "Total Users", value: totalUsers },
      { name: "Test Takers", value: usersWithAttempts },
      { name: "Active Subscribers", value: activeSubscribers },
    ];

    // ================= 7️⃣ Most Popular Category =================
    const mostPopular = testAttemptsByCategory[0] || {
      category: "N/A",
      attempts: 0,
    };

    return {
      testAttemptsByCategory,
      dailyRegistrations,
      difficultyDistribution,
      averageTestScore: Number(testStats._avg.percentage || 0).toFixed(1),
      totalTestAttempts: testStats._count.id,
      topPerformers,
      conversionFunnel,
      mostPopularCategory: mostPopular.category,
      mostPopularAttempts: mostPopular.attempts,
    };
  }

  async getRecentUsers(limit = 8) {
    const recentUsers = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        phoneNumber: true,
        createdAt: true,
        isActive: true,
      },
    });

    return recentUsers.map((u) => ({
      name: u.name || "Unknown",
      phone: u.phoneNumber,
      registeredOn: u.createdAt,
      status: u.isActive ? "Active" : "Inactive",
    }));
  }

  async getRecentPayments(limit: number = 10) {
    const payments = await prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            avatar: true,
          },
        },
      },
    });

    return payments;
  }

  async getRecentTests(limit: number = 10) {
    const tests = await prisma.testAttempt.findMany({
      take: limit,
      orderBy: { startedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            avatar: true,
          },
        },
        test: {
          select: {
            id: true,
            name: true,
            testNumber: true,
            totalQuestions: true,
            durationMinutes: true,
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
          },
        },
      },
    });

    return tests;
  }
}

export const dashboardService = new DashboardService();
