import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: any) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${type} for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async findAll(userId: string, unreadOnly?: boolean) {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { readAt: null }),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch notifications for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          userId,
          readAt: null,
        },
      });

      return { count };
    } catch (error) {
      this.logger.error(
        `Failed to get unread count for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async markAsRead(id: string, userId: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: {
          id,
          userId,
        },
        data: {
          readAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark notification ${id} as read for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Notification helper methods
  async notifyExpenseSubmitted(expense: any) {
    const manager = await this.prisma.user.findFirst({
      where: { id: expense.submitter.managerId },
    });

    if (manager) {
      await this.create(
        manager.id,
        NotificationType.EXPENSE_SUBMITTED,
        'New Expense Submitted',
        `${expense.submitter.firstName} ${expense.submitter.lastName} submitted expense ${expense.expenseNumber}`,
        { expenseId: expense.id },
      );
    }
  }

  async notifyExpenseApproved(expense: any) {
    await this.create(
      expense.submitterId,
      NotificationType.EXPENSE_APPROVED,
      'Expense Approved',
      `Your expense ${expense.expenseNumber} has been approved`,
      { expenseId: expense.id },
    );
  }

  async notifyExpenseRejected(expense: any, reason: string) {
    await this.create(
      expense.submitterId,
      NotificationType.EXPENSE_REJECTED,
      'Expense Rejected',
      `Your expense ${expense.expenseNumber} has been rejected: ${reason}`,
      { expenseId: expense.id },
    );
  }
}
