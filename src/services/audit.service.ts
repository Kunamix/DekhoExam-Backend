import { prisma } from "@/configs";
import { ApiError } from "@/utils";

interface GetAllAuditLogsInput {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface ExportAuditLogsInput {
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  format?: string;
}

export class AuditLogService {
  async getAllAuditLogs({
    page = 1,
    limit = 10,
    action,
    entity,
    userId,
    startDate,
    endDate,
    search,
  }: GetAllAuditLogsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (userId) {
      where.userId = userId;
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

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditLogById(id: string) {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          },
        },
      },
    });

    if (!auditLog) {
      throw new ApiError(404, "Audit log not found");
    }

    return auditLog;
  }

  async exportAuditLogs({
    action,
    entity,
    userId,
    startDate,
    endDate,
    format = "csv",
  }: ExportAuditLogsInput) {
    const where: any = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            name:true
          },
        },
      },
    });

    if (format === "csv") {
      const headers = [
        "ID",
        "Action",
        "Entity",
        "Entity ID",
        "User Email",
        "IP Address",
        "User Agent",
        "Created At",
        "Details",
      ];

      const rows = auditLogs.map((log) => [
        log.id,
        log.action,
        log.entity || "",
        log.entityId || "",
        log.user?.email || "",
        log.ipAddress || "",
        log.userAgent || "",
        log.createdAt.toISOString(),
        JSON.stringify(log.details || {}),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return {
        data: csvContent,
        format: "csv",
      };
    }

    return {
      data: JSON.stringify(auditLogs, null, 2),
      format: "json",
    };
  }
}

export const auditLogService = new AuditLogService();