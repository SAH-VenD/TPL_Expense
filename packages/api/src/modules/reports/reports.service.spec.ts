import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExpenseStatus, VoucherStatus, ApprovalAction } from '@prisma/client';
import { ReportType, ExportFormat } from './dto/export-report.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReportsService', () => {
  let service: ReportsService;

  // Mock PrismaService with simple object structure
  const mockPrismaService = {
    expense: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    vendor: {
      findMany: jest.fn(),
    },
    budget: {
      findMany: jest.fn(),
    },
    voucher: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    costCenter: {
      findMany: jest.fn(),
    },
    approvalHistory: {
      findMany: jest.fn(),
    },
  };

  // Mock data factories
  const createMockExpense = (overrides = {}) => ({
    id: 'expense-1',
    expenseNumber: 'EXP-2024-00001',
    submitterId: 'user-1',
    status: ExpenseStatus.APPROVED,
    totalAmount: new Decimal(1000),
    amount: new Decimal(900),
    taxAmount: new Decimal(100),
    taxType: 'PUNJAB_GST',
    categoryId: 'cat-1',
    projectId: 'proj-1',
    costCenterId: 'cc-1',
    vendorId: 'vendor-1',
    createdAt: new Date('2024-06-15'),
    submittedAt: new Date('2024-06-15'),
    submitter: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      departmentId: 'dept-1',
      department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
    },
    category: { id: 'cat-1', name: 'Travel', code: 'TRV' },
    project: { id: 'proj-1', name: 'Project Alpha', code: 'ALPHA', clientName: 'Client A' },
    costCenter: { id: 'cc-1', name: 'Operations', code: 'OPS' },
    vendor: { id: 'vendor-1', name: 'Vendor Corp' },
    approvalHistory: [],
    ...overrides,
  });

  const createMockBudget = (overrides = {}) => ({
    id: 'budget-1',
    name: 'Q1 Engineering Budget',
    type: 'DEPARTMENT',
    totalAmount: new Decimal(100000),
    usedAmount: new Decimal(25000),
    warningThreshold: new Decimal(80),
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    isActive: true,
    departmentId: 'dept-1',
    projectId: null,
    categoryId: null,
    department: { id: 'dept-1', name: 'Engineering' },
    project: null,
    category: null,
    ...overrides,
  });

  const createMockVoucher = (overrides = {}) => ({
    id: 'voucher-1',
    voucherNumber: 'VCH-2024-00001',
    status: VoucherStatus.DISBURSED,
    requesterId: 'user-1',
    requestedAmount: new Decimal(5000),
    disbursedAmount: new Decimal(5000),
    settlementDeadline: new Date('2024-07-15'),
    requester: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      departmentId: 'dept-1',
    },
    ...overrides,
  });

  const createMockUser = (overrides = {}) => ({
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    departmentId: 'dept-1',
    department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== getSpendByDepartment Tests ====================

  describe('getSpendByDepartment', () => {
    it('should return spend aggregated by department', async () => {
      const mockExpenses = [
        createMockExpense({ totalAmount: new Decimal(1000) }),
        createMockExpense({
          id: 'expense-2',
          totalAmount: new Decimal(2000),
          submitter: {
            ...createMockUser(),
            department: { id: 'dept-2', name: 'Sales', code: 'SLS' },
          },
        }),
        createMockExpense({ id: 'expense-3', totalAmount: new Decimal(500) }),
      ];

      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.getSpendByDepartment();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ department: 'Engineering', amount: 1500 });
      expect(result).toContainEqual({ department: 'Sales', amount: 2000 });
    });

    it('should filter by date range', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getSpendByDepartment('2024-01-01', '2024-06-30');

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should handle expenses without department', async () => {
      const expenseWithoutDept = createMockExpense({
        submitter: { ...createMockUser(), department: null },
      });
      mockPrismaService.expense.findMany.mockResolvedValue([expenseWithoutDept]);

      const result = await service.getSpendByDepartment();

      expect(result).toContainEqual({ department: 'Unknown', amount: 1000 });
    });

    it('should return empty array when no expenses exist', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.getSpendByDepartment();

      expect(result).toEqual([]);
    });
  });

  // ==================== getSpendByCategory Tests ====================

  describe('getSpendByCategory', () => {
    it('should return spend aggregated by category', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { totalAmount: new Decimal(5000) }, _count: 10 },
        { categoryId: 'cat-2', _sum: { totalAmount: new Decimal(3000) }, _count: 5 },
      ]);
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Travel', code: 'TRV' },
        { id: 'cat-2', name: 'Meals', code: 'MLS' },
      ]);

      const result = await service.getSpendByCategory();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        categoryId: 'cat-1',
        categoryName: 'Travel',
        totalAmount: 5000,
        count: 10,
        percentage: 62.5,
      });
      expect(result).toContainEqual({
        categoryId: 'cat-2',
        categoryName: 'Meals',
        totalAmount: 3000,
        count: 5,
        percentage: 37.5,
      });
    });

    it('should handle unknown categories', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'unknown-cat', _sum: { totalAmount: new Decimal(1000) }, _count: 2 },
      ]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.getSpendByCategory();

      expect(result).toContainEqual({
        categoryId: 'unknown-cat',
        categoryName: 'Unknown',
        totalAmount: 1000,
        count: 2,
        percentage: 100,
      });
    });
  });

  // ==================== getSpendByVendor Tests ====================

  describe('getSpendByVendor', () => {
    it('should return spend aggregated by vendor', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { vendorId: 'vendor-1', _sum: { totalAmount: new Decimal(8000) }, _count: 15 },
      ]);
      mockPrismaService.vendor.findMany.mockResolvedValue([
        { id: 'vendor-1', name: 'Vendor Corp' },
      ]);

      const result = await service.getSpendByVendor();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ vendor: 'Vendor Corp', amount: 8000, count: 15 });
    });

    it('should exclude expenses without vendor', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([]);
      mockPrismaService.vendor.findMany.mockResolvedValue([]);

      await service.getSpendByVendor();

      expect(mockPrismaService.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vendorId: { not: null },
          }),
        }),
      );
    });
  });

  // ==================== getBudgetVsActual Tests ====================

  describe('getBudgetVsActual', () => {
    it('should return budget vs actual comparison', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([createMockBudget()]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(25000) },
      });

      const result = await service.getBudgetVsActual();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Q1 Engineering Budget',
        budgetAmount: 100000,
        actualAmount: 25000,
        variance: 75000,
        utilizationPercentage: 25,
      });
    });

    it('should handle zero actual spend', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([createMockBudget()]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });

      const result = await service.getBudgetVsActual();

      expect(result[0].actualAmount).toBe(0);
      expect(result[0].utilizationPercentage).toBe(0);
    });

    it('should filter active budgets within date range', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([]);

      await service.getBudgetVsActual();

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          startDate: { lte: expect.any(Date) },
          endDate: { gte: expect.any(Date) },
        },
        include: expect.any(Object),
      });
    });
  });

  // ==================== getOutstandingAdvances Tests ====================

  describe('getOutstandingAdvances', () => {
    it('should return disbursed vouchers', async () => {
      const mockVouchers = [createMockVoucher()];
      mockPrismaService.voucher.findMany.mockResolvedValue(mockVouchers);

      const result = await service.getOutstandingAdvances();

      expect(result).toEqual(mockVouchers);
      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith({
        where: { status: VoucherStatus.DISBURSED },
        include: expect.any(Object),
        orderBy: { settlementDeadline: 'asc' },
      });
    });
  });

  // ==================== getTaxSummary Tests ====================

  describe('getTaxSummary', () => {
    it('should return tax summary for current year by default', async () => {
      const mockExpenses = [
        createMockExpense({
          taxType: 'PUNJAB_GST',
          amount: new Decimal(900),
          taxAmount: new Decimal(100),
          totalAmount: new Decimal(1000),
        }),
        createMockExpense({
          id: 'exp-2',
          taxType: 'FEDERAL_GST',
          amount: new Decimal(800),
          taxAmount: new Decimal(50),
          totalAmount: new Decimal(850),
        }),
      ];
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.getTaxSummary();

      expect(result.year).toBe(new Date().getFullYear());
      expect(result.totalExpenses).toBe(1850);
      expect(result.totalTax).toBe(150);
      expect(result.breakdown).toHaveProperty('PUNJAB_GST');
      expect(result.breakdown).toHaveProperty('FEDERAL_GST');
    });

    it('should filter by specified year', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getTaxSummary(2023);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(2023, 0, 1),
              lte: new Date(2023, 11, 31),
            },
          }),
        }),
      );
    });
  });

  // ==================== getSpendByEmployee Tests ====================

  describe('getSpendByEmployee', () => {
    it('should return spend aggregated by employee', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { submitterId: 'user-1', _sum: { totalAmount: new Decimal(5000) }, _count: 10 },
        { submitterId: 'user-2', _sum: { totalAmount: new Decimal(3000) }, _count: 5 },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        createMockUser({ id: 'user-1' }),
        createMockUser({
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        }),
      ]);

      const result = await service.getSpendByEmployee({});

      expect(result.items).toHaveLength(2);
      expect(result.grandTotal).toBe(8000);
      expect(result.totalExpenses).toBe(15);
      expect(result.items[0].totalAmount).toBeGreaterThanOrEqual(result.items[1].totalAmount);
    });

    it('should filter by department', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getSpendByEmployee({ departmentId: 'dept-1' });

      expect(mockPrismaService.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submitter: { departmentId: 'dept-1' },
          }),
        }),
      );
    });

    it('should calculate average amount correctly', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { submitterId: 'user-1', _sum: { totalAmount: new Decimal(1000) }, _count: 4 },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([createMockUser()]);

      const result = await service.getSpendByEmployee({});

      expect(result.items[0].averageAmount).toBe(250);
    });
  });

  // ==================== getSpendByProject Tests ====================

  describe('getSpendByProject', () => {
    it('should return spend aggregated by project', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { projectId: 'proj-1', _sum: { totalAmount: new Decimal(10000) }, _count: 20 },
      ]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(2000) },
        _count: 5,
      });
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Project Alpha', code: 'ALPHA', clientName: 'Client A' },
      ]);
      mockPrismaService.budget.findMany.mockResolvedValue([
        { ...createMockBudget(), projectId: 'proj-1', totalAmount: new Decimal(50000) },
      ]);

      const result = await service.getSpendByProject({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectName).toBe('Project Alpha');
      expect(result.items[0].budgetUtilization).toBe(20);
      expect(result.grandTotal).toBe(12000);
      expect(result.unallocatedAmount).toBe(2000);
    });

    it('should handle projects without budget', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { projectId: 'proj-1', _sum: { totalAmount: new Decimal(5000) }, _count: 10 },
      ]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _count: 0,
      });
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Project Beta', code: 'BETA', clientName: null },
      ]);
      mockPrismaService.budget.findMany.mockResolvedValue([]);

      const result = await service.getSpendByProject({});

      expect(result.items[0].budgetAllocated).toBeUndefined();
      expect(result.items[0].budgetUtilization).toBeUndefined();
    });
  });

  // ==================== getSpendByCostCenter Tests ====================

  describe('getSpendByCostCenter', () => {
    it('should return spend aggregated by cost center', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { costCenterId: 'cc-1', _sum: { totalAmount: new Decimal(15000) }, _count: 30 },
      ]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(1000) },
        _count: 2,
      });
      mockPrismaService.costCenter.findMany.mockResolvedValue([
        { id: 'cc-1', name: 'Operations', code: 'OPS', department: { name: 'Engineering' } },
      ]);
      mockPrismaService.budget.findMany.mockResolvedValue([]);

      const result = await service.getSpendByCostCenter({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].costCenterName).toBe('Operations');
      expect(result.items[0].department).toBe('Engineering');
      expect(result.grandTotal).toBe(16000);
    });
  });

  // ==================== getMonthlyTrend Tests ====================

  describe('getMonthlyTrend', () => {
    it('should return monthly trend for specified year', async () => {
      const mockExpenses = [
        createMockExpense({ createdAt: new Date('2024-01-15'), totalAmount: new Decimal(1000) }),
        createMockExpense({ createdAt: new Date('2024-01-20'), totalAmount: new Decimal(500) }),
        createMockExpense({ createdAt: new Date('2024-02-10'), totalAmount: new Decimal(2000) }),
      ];
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getMonthlyTrend({ year: 2024 });

      expect(result.year).toBe(2024);
      expect(result.months).toHaveLength(12);
      expect(result.months[0].monthName).toBe('January');
      expect(result.months[0].totalAmount).toBe(1500);
      expect(result.months[0].expenseCount).toBe(2);
      expect(result.months[1].totalAmount).toBe(2000);
      expect(result.ytdTotal).toBe(3500);
    });

    it('should calculate month-over-month change percentage', async () => {
      const mockExpenses = [
        createMockExpense({ createdAt: new Date('2024-01-15'), totalAmount: new Decimal(1000) }),
        createMockExpense({ createdAt: new Date('2024-02-15'), totalAmount: new Decimal(1500) }),
      ];
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrismaService.expense.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getMonthlyTrend({ year: 2024 });

      expect(result.months[1].changePercentage).toBe(50); // 50% increase
    });

    it('should include year-over-year comparison', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        createMockExpense({ createdAt: new Date('2024-06-15'), totalAmount: new Decimal(10000) }),
      ]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(8000) },
      });

      const result = await service.getMonthlyTrend({ year: 2024 });

      expect(result.previousYearTotal).toBe(8000);
      expect(result.yoyChangePercentage).toBe(25); // 25% increase
    });

    it('should default to current year', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getMonthlyTrend({});

      expect(result.year).toBe(new Date().getFullYear());
    });
  });

  // ==================== getApprovalTurnaround Tests ====================

  describe('getApprovalTurnaround', () => {
    it('should calculate approval turnaround statistics', async () => {
      const baseDate = new Date('2024-06-01');
      const approvalDate = new Date('2024-06-03'); // 2 days later

      mockPrismaService.expense.findMany.mockResolvedValue([
        createMockExpense({
          submittedAt: baseDate,
          approvalHistory: [{ createdAt: approvalDate, action: ApprovalAction.APPROVED }],
        }),
      ]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      const result = await service.getApprovalTurnaround({});

      expect(result.overall.totalApprovals).toBe(1);
      expect(result.overall.avgDays).toBeCloseTo(2, 1);
      expect(result.overall.minDays).toBeCloseTo(2, 1);
      expect(result.overall.maxDays).toBeCloseTo(2, 1);
    });

    it('should group by department when requested', async () => {
      const baseDate = new Date('2024-06-01');
      mockPrismaService.expense.findMany.mockResolvedValue([
        createMockExpense({
          submittedAt: baseDate,
          approvalHistory: [{ createdAt: new Date('2024-06-02'), action: ApprovalAction.APPROVED }],
        }),
        createMockExpense({
          id: 'exp-2',
          submittedAt: baseDate,
          submitter: {
            ...createMockUser(),
            departmentId: 'dept-2',
            department: { id: 'dept-2', name: 'Sales', code: 'SLS' },
          },
          approvalHistory: [{ createdAt: new Date('2024-06-04'), action: ApprovalAction.APPROVED }],
        }),
      ]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      const result = await service.getApprovalTurnaround({ byDepartment: true });

      expect(result.byDepartment).toHaveLength(2);
      expect(result.byDepartment?.some((d) => d.departmentName === 'Engineering')).toBe(true);
      expect(result.byDepartment?.some((d) => d.departmentName === 'Sales')).toBe(true);
    });

    it('should return pending count', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(5);

      const result = await service.getApprovalTurnaround({});

      expect(result.pendingCount).toBe(5);
    });

    it('should handle expenses without approval history', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        createMockExpense({ approvalHistory: [] }),
      ]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      const result = await service.getApprovalTurnaround({});

      expect(result.overall.totalApprovals).toBe(0);
    });
  });

  // ==================== getReimbursementStatus Tests ====================

  describe('getReimbursementStatus', () => {
    it('should return reimbursement status breakdown', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { status: ExpenseStatus.APPROVED, _count: 10, _sum: { totalAmount: new Decimal(50000) } },
        { status: ExpenseStatus.PAID, _count: 20, _sum: { totalAmount: new Decimal(100000) } },
        { status: ExpenseStatus.DRAFT, _count: 5, _sum: { totalAmount: new Decimal(10000) } },
      ]);

      const result = await service.getReimbursementStatus({});

      expect(result.breakdown).toHaveLength(3);
      expect(result.pendingReimbursement.count).toBe(10);
      expect(result.pendingReimbursement.amount).toBe(50000);
      expect(result.reimbursed.count).toBe(20);
      expect(result.reimbursed.amount).toBe(100000);
      expect(result.totals.totalCount).toBe(35);
      expect(result.totals.totalAmount).toBe(160000);
    });

    it('should calculate percentages correctly', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { status: ExpenseStatus.APPROVED, _count: 25, _sum: { totalAmount: new Decimal(25000) } },
        { status: ExpenseStatus.PAID, _count: 75, _sum: { totalAmount: new Decimal(75000) } },
      ]);

      const result = await service.getReimbursementStatus({});

      const approvedItem = result.breakdown.find((b) => b.status === ExpenseStatus.APPROVED);
      const paidItem = result.breakdown.find((b) => b.status === ExpenseStatus.PAID);

      expect(approvedItem?.percentageOfCount).toBe(25);
      expect(paidItem?.percentageOfCount).toBe(75);
      expect(approvedItem?.percentageOfAmount).toBe(25);
      expect(paidItem?.percentageOfAmount).toBe(75);
    });
  });

  // ==================== getDashboardSummary Tests ====================

  describe('getDashboardSummary', () => {
    beforeEach(() => {
      // Setup common mocks for dashboard
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(100000) },
      });
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.voucher.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { disbursedAmount: null },
      });
      mockPrismaService.budget.findMany.mockResolvedValue([]);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);
    });

    it('should return dashboard summary with all metrics', async () => {
      const result = await service.getDashboardSummary({});

      expect(result.period).toBeDefined();
      expect(result.expenses).toBeDefined();
      expect(result.approvals).toBeDefined();
      expect(result.vouchers).toBeDefined();
      expect(result.budgetUtilization).toBeDefined();
    });

    it('should calculate expense metrics with trend', async () => {
      // Current period
      mockPrismaService.expense.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(100000) } }) // total
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(80000) } }) // approved
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(15000) } }) // pending
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(5000) } }) // rejected
        // Previous period
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(90000) } })
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(70000) } })
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(15000) } })
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(5000) } });

      const result = await service.getDashboardSummary({});

      expect(result.expenses.total.value).toBe(100000);
      expect(result.expenses.total.previousValue).toBe(90000);
      expect(result.expenses.total.trend).toBe('up');
    });

    it('should calculate pending approval metrics', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      mockPrismaService.expense.findMany.mockResolvedValueOnce([
        { createdAt: threeDaysAgo },
        { createdAt: fiveDaysAgo },
      ]);

      const result = await service.getDashboardSummary({});

      expect(result.approvals.pendingCount).toBe(2);
      expect(result.approvals.oldestPendingDays).toBeGreaterThanOrEqual(4);
      expect(result.approvals.avgPendingDays).toBeGreaterThanOrEqual(3);
    });

    it('should calculate voucher metrics', async () => {
      mockPrismaService.voucher.aggregate
        .mockResolvedValueOnce({ _count: 5, _sum: { disbursedAmount: new Decimal(25000) } }) // outstanding
        .mockResolvedValueOnce({ _count: 2, _sum: { disbursedAmount: new Decimal(10000) } }); // overdue

      const result = await service.getDashboardSummary({});

      expect(result.vouchers.outstandingCount).toBe(5);
      expect(result.vouchers.outstandingAmount).toBe(25000);
      expect(result.vouchers.overdueCount).toBe(2);
      expect(result.vouchers.overdueAmount).toBe(10000);
    });

    it('should calculate budget utilization', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([
        {
          ...createMockBudget(),
          totalAmount: new Decimal(100000),
          usedAmount: new Decimal(85000),
          warningThreshold: new Decimal(80),
        },
        {
          ...createMockBudget(),
          id: 'budget-2',
          totalAmount: new Decimal(50000),
          usedAmount: new Decimal(55000),
          warningThreshold: new Decimal(80),
        },
      ]);

      const result = await service.getDashboardSummary({});

      expect(result.budgetUtilization.totalAllocated).toBe(150000);
      expect(result.budgetUtilization.totalSpent).toBe(140000);
      expect(result.budgetUtilization.budgetsAtWarning).toBe(1); // 85% utilization
      expect(result.budgetUtilization.budgetsExceeded).toBe(1); // 110% utilization
    });

    it('should return top categories', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { totalAmount: new Decimal(30000) } },
        { categoryId: 'cat-2', _sum: { totalAmount: new Decimal(20000) } },
      ]);
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Travel' },
        { id: 'cat-2', name: 'Meals' },
      ]);

      const result = await service.getDashboardSummary({});

      expect(result.topCategories).toHaveLength(2);
      expect(result.topCategories?.[0].name).toBe('Travel');
      expect(result.topCategories?.[0].percentage).toBe(60);
    });

    it('should filter by department when specified', async () => {
      await service.getDashboardSummary({ departmentId: 'dept-1' });

      expect(mockPrismaService.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submitter: { departmentId: 'dept-1' },
          }),
        }),
      );
      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-1',
          }),
        }),
      );
    });
  });

  // ==================== exportReport Tests ====================

  describe('exportReport', () => {
    beforeEach(() => {
      // Setup mocks for various report types
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _count: 0,
      });
      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockPrismaService.vendor.findMany.mockResolvedValue([]);
      mockPrismaService.budget.findMany.mockResolvedValue([]);
      mockPrismaService.voucher.findMany.mockResolvedValue([]);
      mockPrismaService.voucher.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { disbursedAmount: null },
      });
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.costCenter.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(0);
    });

    it('should export spend-by-department as XLSX', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([createMockExpense()]);

      const result = await service.exportReport({
        reportType: ReportType.SPEND_BY_DEPARTMENT,
        format: ExportFormat.XLSX,
      });

      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.filename).toContain('spend-by-department');
      expect(result.filename).toContain('.xlsx');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should export spend-by-category as CSV', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { totalAmount: new Decimal(1000) }, _count: 5 },
      ]);
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Travel' }]);

      const result = await service.exportReport({
        reportType: ReportType.SPEND_BY_CATEGORY,
        format: ExportFormat.CSV,
      });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toContain('.csv');
      expect(result.buffer.toString()).toContain('category');
      expect(result.buffer.toString()).toContain('Travel');
    });

    it('should export monthly-trend with year parameter', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.exportReport({
        reportType: ReportType.MONTHLY_TREND,
        format: ExportFormat.CSV,
        year: 2023,
      });

      expect(result.buffer.toString()).toContain('month');
      expect(result.buffer.toString()).toContain('January');
    });

    it('should export approval-turnaround with department breakdown', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      const result = await service.exportReport({
        reportType: ReportType.APPROVAL_TURNAROUND,
        format: ExportFormat.CSV,
        byDepartment: true,
      });

      expect(result.filename).toContain('approval-turnaround');
    });

    it('should return PDF placeholder', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.exportReport({
        reportType: ReportType.SPEND_BY_DEPARTMENT,
        format: ExportFormat.PDF,
      });

      expect(result.contentType).toBe('application/pdf');
      expect(result.buffer.toString()).toContain('PDF generation not implemented');
    });

    it('should handle empty data for CSV export', async () => {
      const result = await service.exportReport({
        reportType: ReportType.SPEND_BY_VENDOR,
        format: ExportFormat.CSV,
      });

      expect(result.buffer.toString()).toBe('');
    });

    it('should export all new report types', async () => {
      const newReportTypes = [
        ReportType.SPEND_BY_EMPLOYEE,
        ReportType.SPEND_BY_PROJECT,
        ReportType.SPEND_BY_COST_CENTER,
        ReportType.REIMBURSEMENT_STATUS,
        ReportType.DASHBOARD_SUMMARY,
      ];

      for (const reportType of newReportTypes) {
        const result = await service.exportReport({
          reportType,
          format: ExportFormat.CSV,
        });

        expect(result.filename).toContain(reportType);
      }
    });
  });

  // ==================== Helper Method Tests ====================

  describe('helper methods', () => {
    describe('calculateTurnaroundStats', () => {
      it('should calculate statistics correctly for multiple values', async () => {
        // We test this indirectly through getApprovalTurnaround
        const baseDate = new Date('2024-06-01');
        mockPrismaService.expense.findMany.mockResolvedValue([
          createMockExpense({
            submittedAt: baseDate,
            approvalHistory: [
              { createdAt: new Date('2024-06-02'), action: ApprovalAction.APPROVED },
            ],
          }),
          createMockExpense({
            id: 'exp-2',
            submittedAt: baseDate,
            approvalHistory: [
              { createdAt: new Date('2024-06-05'), action: ApprovalAction.APPROVED },
            ],
          }),
          createMockExpense({
            id: 'exp-3',
            submittedAt: baseDate,
            approvalHistory: [
              { createdAt: new Date('2024-06-03'), action: ApprovalAction.APPROVED },
            ],
          }),
        ]);
        mockPrismaService.expense.count.mockResolvedValue(0);

        const result = await service.getApprovalTurnaround({});

        expect(result.overall.totalApprovals).toBe(3);
        // Values should be 1, 2, 4 days
        expect(result.overall.minDays).toBeCloseTo(1, 0);
        expect(result.overall.maxDays).toBeCloseTo(4, 0);
        expect(result.overall.medianDays).toBeCloseTo(2, 0); // Middle value
      });

      it('should handle empty array', async () => {
        mockPrismaService.expense.findMany.mockResolvedValue([]);
        mockPrismaService.expense.count.mockResolvedValue(0);

        const result = await service.getApprovalTurnaround({});

        expect(result.overall).toEqual({
          avgDays: 0,
          minDays: 0,
          maxDays: 0,
          medianDays: 0,
          totalApprovals: 0,
        });
      });
    });

    describe('createMetric', () => {
      it('should calculate trend correctly through dashboard summary', async () => {
        // Setup mocks for significant increase
        mockPrismaService.expense.aggregate
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(100) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(80) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(10) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(10) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(50) } }) // Previous total (50% less)
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(40) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(5) } })
          .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(5) } });

        mockPrismaService.expense.findMany.mockResolvedValue([]);
        mockPrismaService.voucher.aggregate.mockResolvedValue({
          _count: 0,
          _sum: { disbursedAmount: null },
        });
        mockPrismaService.budget.findMany.mockResolvedValue([]);
        mockPrismaService.expense.groupBy.mockResolvedValue([]);
        mockPrismaService.category.findMany.mockResolvedValue([]);

        const result = await service.getDashboardSummary({});

        expect(result.expenses.total.trend).toBe('up');
        expect(result.expenses.total.changePercentage).toBe(100); // 100% increase
      });
    });
  });

  // ==================== Date Filter Tests ====================

  describe('date filtering', () => {
    it('should apply start date only', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getSpendByDepartment('2024-01-01');

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date('2024-01-01') },
          }),
        }),
      );
    });

    it('should apply end date only', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getSpendByDepartment(undefined, '2024-12-31');

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: new Date('2024-12-31') },
          }),
        }),
      );
    });

    it('should apply both dates', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getSpendByDepartment('2024-01-01', '2024-12-31');

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });

    it('should not apply date filter when no dates provided', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getSpendByDepartment();

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            createdAt: expect.anything(),
          }),
        }),
      );
    });
  });
});
