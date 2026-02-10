import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { RoleType, ExpenseStatus, VoucherStatus, UserStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    approvalTier: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    systemSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    expense: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    voucher: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
  });

  // ==================== GET APPROVAL TIERS ====================

  describe('getApprovalTiers', () => {
    it('should return only active approval tiers', async () => {
      const tiers = [
        { id: 'tier-1', name: 'Manager', tierOrder: 1, isActive: true },
        { id: 'tier-2', name: 'Director', tierOrder: 2, isActive: true },
      ];
      mockPrismaService.approvalTier.findMany.mockResolvedValue(tiers);

      const result = await service.getApprovalTiers();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.approvalTier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { tierOrder: 'asc' },
      });
    });

    it('should order tiers by tierOrder ascending', async () => {
      mockPrismaService.approvalTier.findMany.mockResolvedValue([]);

      await service.getApprovalTiers();

      expect(mockPrismaService.approvalTier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { tierOrder: 'asc' },
        }),
      );
    });

    it('should return empty array when no tiers exist', async () => {
      mockPrismaService.approvalTier.findMany.mockResolvedValue([]);

      const result = await service.getApprovalTiers();

      expect(result).toEqual([]);
    });
  });

  // ==================== CREATE APPROVAL TIER ====================

  describe('createApprovalTier', () => {
    const createTierDto = {
      name: 'Manager Approval',
      tierOrder: 1,
      minAmount: 0,
      maxAmount: 25000,
      approverRole: RoleType.APPROVER,
    };

    it('should create an approval tier with all fields', async () => {
      const createdTier = { id: 'new-tier-id', ...createTierDto, isActive: true };
      mockPrismaService.approvalTier.create.mockResolvedValue(createdTier);

      const result = await service.createApprovalTier(createTierDto);

      expect(result).toEqual(createdTier);
      expect(mockPrismaService.approvalTier.create).toHaveBeenCalledWith({
        data: createTierDto,
      });
    });

    it('should pass all DTO fields to create', async () => {
      const createdTier = { id: 'tier-id', ...createTierDto };
      mockPrismaService.approvalTier.create.mockResolvedValue(createdTier);

      const result = await service.createApprovalTier(createTierDto);

      expect(result.id).toBe('tier-id');
      expect(result.approverRole).toBe(createTierDto.approverRole);
    });

    it('should create a tier for FINANCE role', async () => {
      const financeDto = { ...createTierDto, approverRole: RoleType.FINANCE, tierOrder: 2 };
      const createdTier = { id: 'tier-id', ...financeDto };
      mockPrismaService.approvalTier.create.mockResolvedValue(createdTier);

      const result = await service.createApprovalTier(financeDto);

      expect(result.approverRole).toBe(RoleType.FINANCE);
    });

    it('should create a tier for CEO role', async () => {
      const ceoDto = {
        ...createTierDto,
        approverRole: RoleType.CEO,
        tierOrder: 3,
        minAmount: 50000,
        maxAmount: 999999,
      };
      const createdTier = { id: 'tier-id', ...ceoDto };
      mockPrismaService.approvalTier.create.mockResolvedValue(createdTier);

      const result = await service.createApprovalTier(ceoDto);

      expect(result.approverRole).toBe(RoleType.CEO);
      expect(result.minAmount).toBe(50000);
    });
  });

  // ==================== UPDATE APPROVAL TIER ====================

  describe('updateApprovalTier', () => {
    const updateDto = {
      name: 'Updated Manager Approval',
      tierOrder: 1,
      minAmount: 0,
      maxAmount: 50000,
      approverRole: RoleType.APPROVER,
    };

    it('should update an existing approval tier', async () => {
      mockPrismaService.approvalTier.findUnique.mockResolvedValue({
        id: 'tier-id',
        name: 'Manager Approval',
      });
      mockPrismaService.approvalTier.update.mockResolvedValue({
        id: 'tier-id',
        ...updateDto,
      });

      const result = await service.updateApprovalTier('tier-id', updateDto);

      expect(result.name).toBe('Updated Manager Approval');
      expect(mockPrismaService.approvalTier.update).toHaveBeenCalledWith({
        where: { id: 'tier-id' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException for non-existent tier', async () => {
      mockPrismaService.approvalTier.findUnique.mockResolvedValue(null);

      await expect(service.updateApprovalTier('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateApprovalTier('non-existent', updateDto)).rejects.toThrow(
        'Approval tier with ID non-existent not found',
      );
    });

    it('should update maxAmount', async () => {
      mockPrismaService.approvalTier.findUnique.mockResolvedValue({ id: 'tier-id' });
      const updatedDto = { ...updateDto, maxAmount: 100000 };
      mockPrismaService.approvalTier.update.mockResolvedValue({ id: 'tier-id', ...updatedDto });

      const result = await service.updateApprovalTier('tier-id', updatedDto);

      expect(result.maxAmount).toBe(100000);
    });
  });

  // ==================== GET SETTINGS ====================

  describe('getSettings', () => {
    it('should return DEFAULT_SETTINGS when no settings in database', async () => {
      mockPrismaService.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.getSettings();

      expect(result).toEqual(
        expect.objectContaining({
          sessionTimeoutMinutes: 5,
          maxLoginAttempts: 5,
          lockoutDurationMinutes: 15,
          passwordMinLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecialChar: true,
          expenseSubmissionDeadlineDays: 10,
          preApprovalExpiryDays: 30,
          voucherSettlementDeadlineDays: 30,
          budgetWarningThreshold: 80,
          allowedEmailDomains: ['tekcellent.com'],
        }),
      );
    });

    it('should merge database settings with defaults', async () => {
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'sessionTimeoutMinutes', value: 10 },
        { key: 'maxLoginAttempts', value: 3 },
      ]);

      const result = await service.getSettings();

      expect(result.sessionTimeoutMinutes).toBe(10);
      expect(result.maxLoginAttempts).toBe(3);
      // Other defaults should remain
      expect(result.passwordMinLength).toBe(8);
      expect(result.requireUppercase).toBe(true);
    });

    it('should override defaults with database values', async () => {
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'budgetWarningThreshold', value: 90 },
      ]);

      const result = await service.getSettings();

      expect(result.budgetWarningThreshold).toBe(90);
    });

    it('should handle custom keys not in defaults', async () => {
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'customSetting', value: 'custom-value' },
      ]);

      const result = await service.getSettings();

      expect(result.customSetting).toBe('custom-value');
      // Defaults still present
      expect(result.sessionTimeoutMinutes).toBe(5);
    });
  });

  // ==================== UPDATE SETTINGS ====================

  describe('updateSettings', () => {
    it('should upsert each setting key-value pair', async () => {
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'sessionTimeoutMinutes', value: 10 },
        { key: 'maxLoginAttempts', value: 3 },
      ]);

      await service.updateSettings({
        sessionTimeoutMinutes: 10,
        maxLoginAttempts: 3,
      });

      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'sessionTimeoutMinutes' },
        create: { key: 'sessionTimeoutMinutes', value: 10, category: 'system' },
        update: { value: 10 },
      });
      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'maxLoginAttempts' },
        create: { key: 'maxLoginAttempts', value: 3, category: 'system' },
        update: { value: 3 },
      });
    });

    it('should skip undefined values', async () => {
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});
      mockPrismaService.systemSetting.findMany.mockResolvedValue([]);

      await service.updateSettings({
        sessionTimeoutMinutes: 10,
        maxLoginAttempts: undefined,
      });

      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'sessionTimeoutMinutes' },
        }),
      );
    });

    it('should return merged settings after update', async () => {
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'sessionTimeoutMinutes', value: 10 },
      ]);

      const result = await service.updateSettings({ sessionTimeoutMinutes: 10 });

      expect(result.sessionTimeoutMinutes).toBe(10);
      // Other defaults should be present
      expect(result.passwordMinLength).toBe(8);
    });

    it('should handle empty dto', async () => {
      mockPrismaService.systemSetting.findMany.mockResolvedValue([]);

      const result = await service.updateSettings({});

      expect(mockPrismaService.systemSetting.upsert).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle boolean settings', async () => {
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'requireUppercase', value: false },
      ]);

      await service.updateSettings({ requireUppercase: false });

      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'requireUppercase' },
        create: { key: 'requireUppercase', value: false, category: 'system' },
        update: { value: false },
      });
    });

    it('should handle array settings', async () => {
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});
      mockPrismaService.systemSetting.findMany.mockResolvedValue([
        { key: 'allowedEmailDomains', value: ['tekcellent.com', 'vendor.com'] },
      ]);

      await service.updateSettings({
        allowedEmailDomains: ['tekcellent.com', 'vendor.com'],
      });

      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'allowedEmailDomains' },
          create: expect.objectContaining({
            value: ['tekcellent.com', 'vendor.com'],
          }),
        }),
      );
    });
  });

  // ==================== GET DASHBOARD STATS ====================

  describe('getDashboardStats', () => {
    beforeEach(() => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.expense.count.mockResolvedValue(0);
      mockPrismaService.voucher.count.mockResolvedValue(0);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });
    });

    it('should return aggregated dashboard statistics', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(85); // activeUsers
      mockPrismaService.expense.count
        .mockResolvedValueOnce(50)  // pendingApprovals (SUBMITTED)
        .mockResolvedValueOnce(500) // totalExpenses
        .mockResolvedValueOnce(50)  // pendingExpenses
        .mockResolvedValueOnce(300); // approvedExpenses
      mockPrismaService.voucher.count
        .mockResolvedValueOnce(10) // activeVouchers
        .mockResolvedValueOnce(3); // overdueVouchers
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(1500000) },
      });

      const result = await service.getDashboardStats();

      expect(result.users).toEqual({ total: 100, active: 85 });
      expect(result.expenses).toEqual({
        total: 500,
        pending: 50,
        approved: 300,
        totalAmount: 1500000,
      });
      expect(result.vouchers).toEqual({ active: 10, overdue: 3 });
      expect(result.pendingApprovals).toBe(50);
    });

    it('should handle empty data gracefully', async () => {
      const result = await service.getDashboardStats();

      expect(result.users).toEqual({ total: 0, active: 0 });
      expect(result.expenses).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        totalAmount: 0,
      });
      expect(result.vouchers).toEqual({ active: 0, overdue: 0 });
      expect(result.pendingApprovals).toBe(0);
    });

    it('should handle null totalAmount in aggregate', async () => {
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });

      const result = await service.getDashboardStats();

      expect(result.expenses.totalAmount).toBe(0);
    });

    it('should query active users with ACTIVE status', async () => {
      await service.getDashboardStats();

      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { status: UserStatus.ACTIVE },
      });
    });

    it('should query pending expenses with SUBMITTED status', async () => {
      await service.getDashboardStats();

      expect(mockPrismaService.expense.count).toHaveBeenCalledWith({
        where: { status: ExpenseStatus.SUBMITTED },
      });
    });

    it('should query active vouchers with APPROVED or DISBURSED status', async () => {
      await service.getDashboardStats();

      expect(mockPrismaService.voucher.count).toHaveBeenCalledWith({
        where: {
          status: { in: [VoucherStatus.APPROVED, VoucherStatus.DISBURSED] },
        },
      });
    });

    it('should query overdue vouchers by settlement deadline', async () => {
      await service.getDashboardStats();

      expect(mockPrismaService.voucher.count).toHaveBeenCalledWith({
        where: {
          status: VoucherStatus.DISBURSED,
          settlementDeadline: { lt: expect.any(Date) },
        },
      });
    });

    it('should query total approved expense amount', async () => {
      await service.getDashboardStats();

      expect(mockPrismaService.expense.aggregate).toHaveBeenCalledWith({
        where: { status: ExpenseStatus.APPROVED },
        _sum: { totalAmount: true },
      });
    });
  });

  // ==================== GENERATE TEST DATA ====================

  describe('generateTestData', () => {
    it('should return not implemented message', async () => {
      const result = await service.generateTestData();

      expect(result.message).toContain('not implemented');
    });
  });
});
