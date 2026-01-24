import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });
  }

  async findAll(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });

    return { count };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
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
