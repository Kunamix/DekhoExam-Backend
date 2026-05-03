import { prisma } from "@/configs";
import { ApiError } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

interface GetAllReportsInput {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface UpdateReportStatusInput {
  status: string;
}

export class ReportService {
  async getAllReports({
    page = 1,
    limit = 10,
    status,
    type,
    search,
    startDate,
    endDate,
  }: GetAllReportsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReportStats() {
    const [total, byStatus, byType, recentCount] = await Promise.all([
      prisma.report.count(),
      prisma.report.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.report.groupBy({
        by: ["type"],
        _count: true,
      }),
      prisma.report.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const statusStats = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as any);

    const typeStats = byType.reduce((acc, curr) => {
      acc[curr.type] = curr._count;
      return acc;
    }, {} as any);

    return {
      total,
      byStatus: statusStats,
      byType: typeStats,
      lastSevenDays: recentCount,
      pending: statusStats["PENDING"] || 0,
      resolved: statusStats["RESOLVED"] || 0,
      dismissed: statusStats["DISMISSED"] || 0,
    };
  }

  async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!report) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.REPORT_NOT_FOUND,
      );
    }

    // If entityId exists, fetch additional context based on type
    let entityDetails = null;
    if (report.entityId) {
      if (report.type === "QUESTION") {
        entityDetails = await prisma.question.findUnique({
          where: { id: report.entityId },
          select: {
            id: true,
            questionText: true,
            topic: {
              select: {
                id: true,
                name: true,
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
      } else if (report.type === "TEST") {
        entityDetails = await prisma.test.findUnique({
          where: { id: report.entityId },
          select: {
            id: true,
            name: true,
            testNumber: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }
    }

    return {
      ...report,
      entityDetails,
    };
  }

  async updateReportStatus(id: string, { status }: UpdateReportStatusInput) {
    const validStatuses = ["PENDING", "RESOLVED", "DISMISSED"];

    if (!validStatuses.includes(status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_REPORT_STATUS,
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.REPORT_NOT_FOUND,
      );
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return updatedReport;
  }

  async deleteReport(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.REPORT_NOT_FOUND,
      );
    }

    await prisma.report.delete({
      where: { id },
    });

    return { message: "Report deleted successfully" };
  }
}

export const reportService = new ReportService();