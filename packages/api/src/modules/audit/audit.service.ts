import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValue: data.oldValue,
          newValue: data.newValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${data.action} ${data.entityType}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async getLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = Number(filters.page) || 1;
      const limit = Number(filters.limit) || 50;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.action) {
        where.action = filters.action;
      }

      if (filters.entityType) {
        where.entityType = filters.entityType;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        meta: {
          pagination: {
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(
        'Failed to fetch audit logs',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async exportLogs(startDate: string, endDate: string) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to export audit logs for range ${startDate} - ${endDate}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Common audit actions
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      userId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  async logLogout(userId: string) {
    return this.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
    });
  }

  async logExpenseCreated(userId: string, expenseId: string, data: object) {
    return this.log({
      userId,
      action: 'CREATE',
      entityType: 'Expense',
      entityId: expenseId,
      newValue: data,
    });
  }

  async logExpenseApproved(userId: string, expenseId: string) {
    return this.log({
      userId,
      action: 'APPROVE',
      entityType: 'Expense',
      entityId: expenseId,
    });
  }

  async logExpenseRejected(userId: string, expenseId: string, reason: string) {
    return this.log({
      userId,
      action: 'REJECT',
      entityType: 'Expense',
      entityId: expenseId,
      newValue: { reason },
    });
  }
}
