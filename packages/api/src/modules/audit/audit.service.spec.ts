import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditLogData } from './audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLog = {
    id: 'log-id',
    userId: 'user-1',
    action: 'LOGIN',
    entityType: 'User',
    entityId: 'user-1',
    oldValue: null,
    newValue: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  // ==================== LOG ====================

  describe('log', () => {
    it('should create an audit entry with all fields', async () => {
      const auditData: AuditLogData = {
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Expense',
        entityId: 'expense-1',
        oldValue: { status: 'DRAFT' },
        newValue: { status: 'SUBMITTED' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-id',
        ...auditData,
      });

      const result = await service.log(auditData);

      expect(result).toBeDefined();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Expense',
          entityId: 'expense-1',
          oldValue: { status: 'DRAFT' },
          newValue: { status: 'SUBMITTED' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should create an audit entry with only required fields', async () => {
      const auditData: AuditLogData = {
        action: 'SYSTEM_EVENT',
        entityType: 'System',
      };
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-id',
        ...auditData,
      });

      await service.log(auditData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SYSTEM_EVENT',
          entityType: 'System',
          userId: undefined,
          entityId: undefined,
          oldValue: undefined,
          newValue: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });

    it('should return the created audit log entry', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.log({
        action: 'LOGIN',
        entityType: 'User',
        userId: 'user-1',
      });

      expect(result.id).toBe('log-id');
      expect(result.action).toBe('LOGIN');
    });
  });

  // ==================== GET LOGS ====================

  describe('getLogs', () => {
    beforeEach(() => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);
    });

    it('should return paginated audit logs with meta', async () => {
      const result = await service.getLogs({});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual(
        expect.objectContaining({
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        }),
      );
    });

    it('should use default page=1 and limit=50', async () => {
      await service.getLogs({});

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should apply custom pagination', async () => {
      await service.getLogs({ page: 3, limit: 25 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        }),
      );
    });

    it('should filter by userId', async () => {
      await service.getLogs({ userId: 'user-1' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should filter by action', async () => {
      await service.getLogs({ action: 'LOGIN' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'LOGIN',
          }),
        }),
      );
    });

    it('should filter by entityType', async () => {
      await service.getLogs({ entityType: 'Expense' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'Expense',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      await service.getLogs({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should filter by startDate only', async () => {
      await service.getLogs({ startDate: '2026-01-01' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
            },
          }),
        }),
      );
    });

    it('should filter by endDate only', async () => {
      await service.getLogs({ endDate: '2026-12-31' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      await service.getLogs({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Expense',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            action: 'CREATE',
            entityType: 'Expense',
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-06-30'),
            },
          },
        }),
      );
    });

    it('should not apply date filter when neither startDate nor endDate provided', async () => {
      await service.getLogs({ userId: 'user-1' });

      const callArgs = mockPrismaService.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.where.createdAt).toBeUndefined();
    });

    it('should include user select fields', async () => {
      await service.getLogs({});

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      await service.getLogs({});

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(120);

      const result = await service.getLogs({ limit: 50 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return empty data when no logs exist', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const result = await service.getLogs({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ==================== EXPORT LOGS ====================

  describe('exportLogs', () => {
    it('should return logs within date range', async () => {
      const logs = [mockAuditLog, { ...mockAuditLog, id: 'log-2' }];
      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.exportLogs('2026-01-01', '2026-12-31');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no logs in range', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.exportLogs('2020-01-01', '2020-12-31');

      expect(result).toEqual([]);
    });

    it('should include user information in exported logs', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.exportLogs('2026-01-01', '2026-12-31');

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
      );
    });
  });

  // ==================== HELPER METHODS ====================

  describe('logLogin', () => {
    it('should delegate to log() with LOGIN action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logLogin('user-1', '192.168.1.1', 'Mozilla/5.0');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'LOGIN',
          entityType: 'User',
          entityId: 'user-1',
          oldValue: undefined,
          newValue: undefined,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should handle optional ipAddress and userAgent', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logLogin('user-1');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'LOGIN',
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });
  });

  describe('logLogout', () => {
    it('should delegate to log() with LOGOUT action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logLogout('user-1');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'LOGOUT',
          entityType: 'User',
          entityId: 'user-1',
          oldValue: undefined,
          newValue: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });

  describe('logExpenseCreated', () => {
    it('should delegate to log() with CREATE action and expense data', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);
      const expenseData = { amount: 5000, description: 'Test expense' };

      await service.logExpenseCreated('user-1', 'expense-1', expenseData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Expense',
          entityId: 'expense-1',
          oldValue: undefined,
          newValue: expenseData,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });

  describe('logExpenseApproved', () => {
    it('should delegate to log() with APPROVE action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logExpenseApproved('approver-1', 'expense-1');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'approver-1',
          action: 'APPROVE',
          entityType: 'Expense',
          entityId: 'expense-1',
          oldValue: undefined,
          newValue: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });

  describe('logExpenseRejected', () => {
    it('should delegate to log() with REJECT action and reason', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logExpenseRejected('approver-1', 'expense-1', 'Duplicate receipt');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'approver-1',
          action: 'REJECT',
          entityType: 'Expense',
          entityId: 'expense-1',
          oldValue: undefined,
          newValue: { reason: 'Duplicate receipt' },
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });
});
