import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification with all fields', async () => {
      const expectedNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.EXPENSE_SUBMITTED,
        title: 'New Expense',
        message: 'An expense was submitted',
        data: { expenseId: 'exp-1' },
      };
      mockPrismaService.notification.create.mockResolvedValue(expectedNotification);

      const result = await service.create(
        'user-1',
        NotificationType.EXPENSE_SUBMITTED,
        'New Expense',
        'An expense was submitted',
        { expenseId: 'exp-1' },
      );

      expect(result).toEqual(expectedNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.EXPENSE_SUBMITTED,
          title: 'New Expense',
          message: 'An expense was submitted',
          data: { expenseId: 'exp-1' },
        },
      });
    });

    it('should create a notification without optional data', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.create(
        'user-1',
        NotificationType.EXPENSE_APPROVED,
        'Approved',
        'Your expense was approved',
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.EXPENSE_APPROVED,
          title: 'Approved',
          message: 'Your expense was approved',
          data: undefined,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return notifications for a user ordered by most recent', async () => {
      const notifications = [
        { id: 'n-1', userId: 'user-1', readAt: null },
        { id: 'n-2', userId: 'user-1', readAt: new Date() },
      ];
      mockPrismaService.notification.findMany.mockResolvedValue(notifications);

      const result = await service.findAll('user-1');

      expect(result).toEqual(notifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter to unread only when unreadOnly is true', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAll('user-1', true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          readAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should not add readAt filter when unreadOnly is false', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAll('user-1', false);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          readAt: null,
        },
      });
    });

    it('should return zero when no unread notifications exist', async () => {
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read with ownership check', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-1', 'user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'user-1',
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });

    it('should not update notifications belonging to other users', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead('notif-1', 'wrong-user');

      expect(result).toEqual({ count: 0 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: 'wrong-user',
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 3 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });

    it('should return zero count when no unread notifications exist', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('notifyExpenseSubmitted', () => {
    it('should create notification for the manager when manager exists', async () => {
      const manager = { id: 'manager-1', firstName: 'John', lastName: 'Manager' };
      const expense = {
        id: 'exp-1',
        expenseNumber: 'EXP-2026-001',
        submitter: {
          firstName: 'Jane',
          lastName: 'Employee',
          managerId: 'manager-1',
        },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(manager);
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.notifyExpenseSubmitted(expense);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'manager-1' },
      });
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'manager-1',
          type: NotificationType.EXPENSE_SUBMITTED,
          title: 'New Expense Submitted',
          message: 'Jane Employee submitted expense EXP-2026-001',
          data: { expenseId: 'exp-1' },
        },
      });
    });

    it('should not create notification when manager does not exist', async () => {
      const expense = {
        id: 'exp-1',
        expenseNumber: 'EXP-2026-001',
        submitter: {
          firstName: 'Jane',
          lastName: 'Employee',
          managerId: null,
        },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.notifyExpenseSubmitted(expense);

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyExpenseApproved', () => {
    it('should create approval notification for the submitter', async () => {
      const expense = {
        id: 'exp-1',
        expenseNumber: 'EXP-2026-002',
        submitterId: 'submitter-1',
      };
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.notifyExpenseApproved(expense);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'submitter-1',
          type: NotificationType.EXPENSE_APPROVED,
          title: 'Expense Approved',
          message: 'Your expense EXP-2026-002 has been approved',
          data: { expenseId: 'exp-1' },
        },
      });
    });
  });

  describe('notifyExpenseRejected', () => {
    it('should create rejection notification with reason for the submitter', async () => {
      const expense = {
        id: 'exp-1',
        expenseNumber: 'EXP-2026-003',
        submitterId: 'submitter-1',
      };
      const reason = 'Missing receipts';
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.notifyExpenseRejected(expense, reason);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'submitter-1',
          type: NotificationType.EXPENSE_REJECTED,
          title: 'Expense Rejected',
          message: 'Your expense EXP-2026-003 has been rejected: Missing receipts',
          data: { expenseId: 'exp-1' },
        },
      });
    });
  });
});
