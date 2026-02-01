import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  BudgetType,
  BudgetPeriod,
  BudgetEnforcement,
  ExpenseStatus,
  Currency,
  Budget,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { EnforcementAction, BudgetStatus } from './dto/budget-responses.dto';

describe('BudgetsService', () => {
  let service: BudgetsService;

  const mockPrismaService = {
    budget: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    costCenter: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  const mockBudget: Budget = {
    id: 'budget-id',
    name: 'Engineering Q1 2024',
    type: BudgetType.DEPARTMENT,
    period: BudgetPeriod.QUARTERLY,
    totalAmount: new Decimal(500000),
    usedAmount: new Decimal(0),
    warningThreshold: new Decimal(80),
    enforcement: BudgetEnforcement.SOFT_WARNING,
    startDate: yearStart,
    endDate: yearEnd,
    currency: Currency.PKR,
    departmentId: 'dept-id',
    projectId: null,
    costCenterId: null,
    categoryId: null,
    employeeId: null,
    ownerId: 'owner-id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBudgetHardBlock: Budget = {
    ...mockBudget,
    id: 'budget-hard-block',
    name: 'Strict Budget',
    enforcement: BudgetEnforcement.HARD_BLOCK,
  };

  const mockBudgetEscalate: Budget = {
    ...mockBudget,
    id: 'budget-escalate',
    name: 'Escalate Budget',
    enforcement: BudgetEnforcement.AUTO_ESCALATE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default transaction behavior
    mockPrismaService.$transaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      const results = [];
      for (const operation of callback as Promise<unknown>[]) {
        results.push(await operation);
      }
      return results;
    });
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    const createDto = {
      name: 'Engineering Q1 2024',
      type: BudgetType.DEPARTMENT,
      period: BudgetPeriod.QUARTERLY,
      totalAmount: 500000,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      departmentId: 'dept-id',
    };

    it('should create a budget successfully', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-id' });
      mockPrismaService.budget.create.mockResolvedValue({
        ...mockBudget,
        department: { id: 'dept-id', name: 'Engineering' },
      });

      const result = await service.create(createDto, 'user-id');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockBudget.name);
      expect(mockPrismaService.budget.create).toHaveBeenCalled();
    });

    it('should reject budget with end date before start date', async () => {
      const invalidDto = {
        ...createDto,
        startDate: '2024-03-31',
        endDate: '2024-01-01',
      };

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should reject budget with non-existent department', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, 'user-id')).rejects.toThrow('Department');
    });

    it('should reject budget with non-existent project', async () => {
      const projectDto = {
        ...createDto,
        type: BudgetType.PROJECT,
        projectId: 'non-existent-project',
        departmentId: undefined,
      };
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.create(projectDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(projectDto, 'user-id')).rejects.toThrow('Project');
    });

    it('should reject budget with non-existent cost center', async () => {
      const ccDto = {
        ...createDto,
        type: BudgetType.COST_CENTER,
        costCenterId: 'non-existent-cc',
        departmentId: undefined,
      };
      mockPrismaService.costCenter.findUnique.mockResolvedValue(null);

      await expect(service.create(ccDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(ccDto, 'user-id')).rejects.toThrow('Cost Center');
    });

    it('should reject budget with non-existent category', async () => {
      const catDto = {
        ...createDto,
        type: BudgetType.CATEGORY,
        categoryId: 'non-existent-cat',
        departmentId: undefined,
      };
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(catDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(catDto, 'user-id')).rejects.toThrow('Category');
    });

    it('should reject budget with non-existent employee', async () => {
      const empDto = {
        ...createDto,
        type: BudgetType.EMPLOYEE,
        employeeId: 'non-existent-emp',
        departmentId: undefined,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(empDto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.create(empDto, 'user-id')).rejects.toThrow('Employee');
    });

    it('should set default warning threshold to 80 if not provided', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-id' });
      mockPrismaService.budget.create.mockResolvedValue({
        ...mockBudget,
        warningThreshold: new Decimal(80),
      });

      await service.create(createDto, 'user-id');

      expect(mockPrismaService.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            warningThreshold: 80,
          }),
        }),
      );
    });

    it('should set default enforcement to SOFT_WARNING if not provided', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-id' });
      mockPrismaService.budget.create.mockResolvedValue({
        ...mockBudget,
        enforcement: BudgetEnforcement.SOFT_WARNING,
      });

      await service.create(createDto, 'user-id');

      expect(mockPrismaService.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enforcement: BudgetEnforcement.SOFT_WARNING,
          }),
        }),
      );
    });
  });

  // ==================== FIND ALL TESTS ====================

  describe('findAll', () => {
    it('should return all active budgets by default', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should filter by type when provided', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);

      await service.findAll(BudgetType.DEPARTMENT);

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            type: BudgetType.DEPARTMENT,
          },
        }),
      );
    });

    it('should return all budgets including inactive when activeOnly is false', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([
        mockBudget,
        { ...mockBudget, id: 'inactive-budget', isActive: false },
      ]);

      const result = await service.findAll(undefined, false);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ==================== FIND ONE TESTS ====================

  describe('findOne', () => {
    it('should return budget by ID', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);

      const result = await service.findOne('budget-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('budget-id');
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    const updateDto = {
      name: 'Updated Budget Name',
      totalAmount: 600000,
    };

    it('should update budget successfully', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.budget.update.mockResolvedValue({
        ...mockBudget,
        name: updateDto.name,
        totalAmount: new Decimal(updateDto.totalAmount),
      });

      const result = await service.update('budget-id', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(mockPrismaService.budget.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update dates when provided', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.budget.update.mockResolvedValue(mockBudget);

      await service.update('budget-id', {
        startDate: '2024-04-01',
        endDate: '2024-06-30',
      });

      expect(mockPrismaService.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ==================== REMOVE (SOFT DELETE) TESTS ====================

  describe('remove', () => {
    it('should soft delete budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.budget.update.mockResolvedValue({
        ...mockBudget,
        isActive: false,
      });

      const result = await service.remove('budget-id');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== GET UTILIZATION TESTS ====================

  describe('getUtilization', () => {
    it('should calculate utilization correctly with committed and spent', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.SUBMITTED, amountInPKR: new Decimal(50000) },
        { id: 'exp-2', status: ExpenseStatus.PENDING_APPROVAL, amountInPKR: new Decimal(30000) },
        { id: 'exp-3', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(100000) },
        { id: 'exp-4', status: ExpenseStatus.PAID, amountInPKR: new Decimal(50000) },
      ]);

      const result = await service.getUtilization('budget-id');

      expect(result.budgetId).toBe('budget-id');
      expect(result.allocated).toBe(500000);
      expect(result.committed).toBe(80000); // 50000 + 30000
      expect(result.spent).toBe(150000); // 100000 + 50000
      expect(result.available).toBe(270000); // 500000 - 80000 - 150000
      expect(result.utilizationPercentage).toBe(46); // (80000 + 150000) / 500000 * 100
      expect(result.expenseCount).toBe(4);
      expect(result.pendingCount).toBe(2);
    });

    it('should return 0 utilization for budget with no expenses', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.getUtilization('budget-id');

      expect(result.utilizationPercentage).toBe(0);
      expect(result.committed).toBe(0);
      expect(result.spent).toBe(0);
      expect(result.available).toBe(500000);
      expect(result.isOverBudget).toBe(false);
    });

    it('should mark budget as over budget when exceeded', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(600000) },
      ]);

      const result = await service.getUtilization('budget-id');

      expect(result.isOverBudget).toBe(true);
      expect(result.available).toBeLessThan(0);
    });

    it('should mark budget at warning threshold', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(400000) },
      ]);

      const result = await service.getUtilization('budget-id');

      expect(result.isAtWarningThreshold).toBe(true); // 80% threshold reached
      expect(result.utilizationPercentage).toBe(80);
    });

    it('should exclude DRAFT and REJECTED expenses from calculation', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(100000) },
        // DRAFT and REJECTED are filtered out in the query, not returned
      ]);

      const result = await service.getUtilization('budget-id');

      expect(result.spent).toBe(100000);
      expect(result.expenseCount).toBe(1);
    });
  });

  // ==================== CHECK BUDGET FOR EXPENSE TESTS ====================

  describe('checkBudgetForExpense', () => {
    it('should return canProceed=true when expense fits budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.checkBudgetForExpense('budget-id', 50000);

      expect(result.canProceed).toBe(true);
      expect(result.wouldExceed).toBe(false);
      expect(result.enforcementAction).toBe(EnforcementAction.NONE);
    });

    it('should return HARD_BLOCK when expense exceeds budget with HARD_BLOCK enforcement', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudgetHardBlock);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(450000) },
      ]);

      const result = await service.checkBudgetForExpense('budget-hard-block', 100000);

      expect(result.canProceed).toBe(false);
      expect(result.wouldExceed).toBe(true);
      expect(result.enforcementAction).toBe(EnforcementAction.HARD_BLOCK);
      expect(result.message).toContain('Cannot submit');
    });

    it('should return SOFT_WARNING when expense exceeds budget with SOFT_WARNING enforcement', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(450000) },
      ]);

      const result = await service.checkBudgetForExpense('budget-id', 100000);

      expect(result.canProceed).toBe(true);
      expect(result.wouldExceed).toBe(true);
      expect(result.enforcementAction).toBe(EnforcementAction.SOFT_WARNING);
      expect(result.message).toContain('Warning');
    });

    it('should return ESCALATE when expense exceeds budget with AUTO_ESCALATE enforcement', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudgetEscalate);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(450000) },
      ]);

      const result = await service.checkBudgetForExpense('budget-escalate', 100000);

      expect(result.canProceed).toBe(true);
      expect(result.wouldExceed).toBe(true);
      expect(result.enforcementAction).toBe(EnforcementAction.ESCALATE);
      expect(result.message).toContain('additional approval');
    });

    it('should return warning message when expense triggers warning threshold', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(350000) },
      ]);

      const result = await service.checkBudgetForExpense('budget-id', 50000);

      expect(result.wouldTriggerWarning).toBe(true);
      expect(result.message).toContain('80%');
    });

    it('should calculate projected utilization correctly', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(200000) },
      ]);

      const result = await service.checkBudgetForExpense('budget-id', 100000);

      expect(result.currentUtilization).toBe(40); // 200000/500000
      expect(result.projectedUtilization).toBe(60); // 300000/500000
      expect(result.availableBefore).toBe(300000);
      expect(result.availableAfter).toBe(200000);
    });
  });

  // ==================== CHECK EXPENSE AGAINST BUDGETS TESTS ====================

  describe('checkExpenseAgainstBudgets', () => {
    it('should return allowed=true when no applicable budgets', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(null);

      const result = await service.checkExpenseAgainstBudgets({
        amount: 50000,
        departmentId: 'dept-id',
      });

      expect(result.allowed).toBe(true);
      expect(result.budgetResults).toHaveLength(0);
      expect(result.message).toContain('No applicable budgets');
    });

    it('should check against department budget', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.checkExpenseAgainstBudgets({
        amount: 50000,
        departmentId: 'dept-id',
      });

      expect(result.allowed).toBe(true);
      expect(result.budgetResults).toHaveLength(1);
    });

    it('should block expense when any budget has HARD_BLOCK enforcement', async () => {
      mockPrismaService.budget.findFirst.mockImplementation(async (args) => {
        if (args?.where?.type === BudgetType.DEPARTMENT) {
          return mockBudgetHardBlock;
        }
        return null;
      });
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudgetHardBlock);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(480000) },
      ]);

      const result = await service.checkExpenseAgainstBudgets({
        amount: 50000,
        departmentId: 'dept-id',
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('blocked');
    });

    it('should require escalation when budget has AUTO_ESCALATE enforcement', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudgetEscalate);
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudgetEscalate);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(480000) },
      ]);

      const result = await service.checkExpenseAgainstBudgets({
        amount: 50000,
        departmentId: 'dept-id',
      });

      expect(result.requiresEscalation).toBe(true);
      expect(result.message).toContain('escalation');
    });

    it('should set hasWarnings when any budget triggers warning', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(350000) },
      ]);

      const result = await service.checkExpenseAgainstBudgets({
        amount: 50000,
        departmentId: 'dept-id',
      });

      expect(result.hasWarnings).toBe(true);
    });
  });

  // ==================== FIND APPLICABLE BUDGETS TESTS ====================

  describe('findApplicableBudgets', () => {
    it('should find budget by explicit budgetId', async () => {
      mockPrismaService.budget.findFirst.mockImplementation(async (args) => {
        if (args?.where?.id === 'budget-id') {
          return mockBudget;
        }
        return null;
      });

      const result = await service.findApplicableBudgets({
        budgetId: 'budget-id',
        expenseDate: new Date(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('budget-id');
    });

    it('should find department budget', async () => {
      mockPrismaService.budget.findFirst.mockImplementation(async (args) => {
        if (args?.where?.type === BudgetType.DEPARTMENT) {
          return mockBudget;
        }
        return null;
      });

      const result = await service.findApplicableBudgets({
        departmentId: 'dept-id',
        expenseDate: new Date(),
      });

      expect(result).toHaveLength(1);
    });

    it('should find multiple applicable budgets', async () => {
      const deptBudget = { ...mockBudget, id: 'dept-budget' };
      const projectBudget = {
        ...mockBudget,
        id: 'project-budget',
        type: BudgetType.PROJECT,
        projectId: 'project-id',
      };

      mockPrismaService.budget.findFirst.mockImplementation(async (args) => {
        if (args?.where?.type === BudgetType.DEPARTMENT) {
          return deptBudget;
        }
        if (args?.where?.type === BudgetType.PROJECT) {
          return projectBudget;
        }
        return null;
      });

      const result = await service.findApplicableBudgets({
        departmentId: 'dept-id',
        projectId: 'project-id',
        expenseDate: new Date(),
      });

      expect(result).toHaveLength(2);
    });

    it('should not duplicate budgets', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(mockBudget);

      const result = await service.findApplicableBudgets({
        budgetId: 'budget-id',
        departmentId: 'dept-id',
        expenseDate: new Date(),
      });

      // Should only have one budget even though budgetId and departmentId point to same budget
      expect(result).toHaveLength(1);
    });
  });

  // ==================== BUDGET PERIOD CALCULATIONS TESTS ====================

  describe('getBudgetPeriodDates', () => {
    it('should calculate annual period dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.ANNUAL, 2024);

      expect(result.startDate.getFullYear()).toBe(2024);
      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.startDate.getDate()).toBe(1);
      expect(result.endDate.getFullYear()).toBe(2024);
      expect(result.endDate.getMonth()).toBe(11); // December
      expect(result.endDate.getDate()).toBe(31);
    });

    it('should calculate Q1 dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 1);

      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.endDate.getMonth()).toBe(2); // March
    });

    it('should calculate Q2 dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 2);

      expect(result.startDate.getMonth()).toBe(3); // April
      expect(result.endDate.getMonth()).toBe(5); // June
    });

    it('should calculate Q3 dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 3);

      expect(result.startDate.getMonth()).toBe(6); // July
      expect(result.endDate.getMonth()).toBe(8); // September
    });

    it('should calculate Q4 dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 4);

      expect(result.startDate.getMonth()).toBe(9); // October
      expect(result.endDate.getMonth()).toBe(11); // December
    });

    it('should calculate monthly period dates', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.MONTHLY, 2024, undefined, 6);

      expect(result.startDate.getMonth()).toBe(5); // June (0-indexed)
      expect(result.startDate.getDate()).toBe(1);
      expect(result.endDate.getMonth()).toBe(5);
      expect(result.endDate.getDate()).toBe(30); // June has 30 days
    });

    it('should throw error for quarterly without quarter', () => {
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid quarter', () => {
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 5)).toThrow(
        BadRequestException,
      );
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.QUARTERLY, 2024, 0)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for monthly without month', () => {
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.MONTHLY, 2024)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid month', () => {
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.MONTHLY, 2024, undefined, 13)).toThrow(
        BadRequestException,
      );
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.MONTHLY, 2024, undefined, 0)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for project-based period', () => {
      expect(() => service.getBudgetPeriodDates(BudgetPeriod.PROJECT_BASED, 2024)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCurrentPeriod', () => {
    it('should return current year for annual period', () => {
      const result = service.getCurrentPeriod(BudgetPeriod.ANNUAL);

      expect(result.year).toBe(new Date().getFullYear());
      expect(result.quarter).toBeUndefined();
      expect(result.month).toBeUndefined();
    });

    it('should return current year and quarter for quarterly period', () => {
      const result = service.getCurrentPeriod(BudgetPeriod.QUARTERLY);
      const expectedQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

      expect(result.year).toBe(new Date().getFullYear());
      expect(result.quarter).toBe(expectedQuarter);
    });

    it('should return current year and month for monthly period', () => {
      const result = service.getCurrentPeriod(BudgetPeriod.MONTHLY);

      expect(result.year).toBe(new Date().getFullYear());
      expect(result.month).toBe(new Date().getMonth() + 1);
    });
  });

  // ==================== BUDGET TRANSFER TESTS ====================

  describe('transferBudget', () => {
    const transferDto = {
      fromBudgetId: 'budget-from',
      toBudgetId: 'budget-to',
      amount: 50000,
      reason: 'Reallocation for Q2 priorities',
    };

    const fromBudget = { ...mockBudget, id: 'budget-from', name: 'From Budget' };
    const toBudget = {
      ...mockBudget,
      id: 'budget-to',
      name: 'To Budget',
      totalAmount: new Decimal(300000),
    };

    it('should transfer budget successfully', async () => {
      mockPrismaService.budget.findUnique
        .mockResolvedValueOnce(fromBudget)
        .mockResolvedValueOnce(toBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]); // No expenses

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          budget: {
            update: jest
              .fn()
              .mockResolvedValueOnce({
                ...fromBudget,
                totalAmount: new Decimal(450000),
              })
              .mockResolvedValueOnce({
                ...toBudget,
                totalAmount: new Decimal(350000),
              }),
          },
          auditLog: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.transferBudget(transferDto, 'user-id');

      expect(result.success).toBe(true);
      expect(result.fromBudgetNewBalance).toBe(450000);
      expect(result.toBudgetNewBalance).toBe(350000);
    });

    it('should reject transfer with insufficient available budget', async () => {
      mockPrismaService.budget.findUnique
        .mockResolvedValueOnce(fromBudget)
        .mockResolvedValueOnce(toBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(480000) },
      ]);

      await expect(service.transferBudget(transferDto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transferBudget(transferDto, 'user-id')).rejects.toThrow(
        'Insufficient available budget',
      );
    });

    it('should reject transfer between budgets with different currencies', async () => {
      const usdBudget = { ...toBudget, currency: Currency.USD };
      mockPrismaService.budget.findUnique
        .mockResolvedValueOnce(fromBudget)
        .mockResolvedValueOnce(usdBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await expect(service.transferBudget(transferDto, 'user-id')).rejects.toThrow(
        'different currencies',
      );
    });

    it('should reject transfer from inactive budget', async () => {
      const inactiveFromBudget = { ...fromBudget, isActive: false };
      mockPrismaService.budget.findUnique
        .mockResolvedValueOnce(inactiveFromBudget)
        .mockResolvedValueOnce(toBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await expect(service.transferBudget(transferDto, 'user-id')).rejects.toThrow(
        'Both budgets must be active',
      );
    });

    it('should reject transfer to inactive budget', async () => {
      const inactiveToBudget = { ...toBudget, isActive: false };
      mockPrismaService.budget.findUnique
        .mockResolvedValueOnce(fromBudget)
        .mockResolvedValueOnce(inactiveToBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await expect(service.transferBudget(transferDto, 'user-id')).rejects.toThrow(
        'Both budgets must be active',
      );
    });
  });

  // ==================== BUDGET STATUS MANAGEMENT TESTS ====================

  describe('activateBudget', () => {
    it('should activate an inactive budget', async () => {
      const inactiveBudget = { ...mockBudget, isActive: false };
      mockPrismaService.budget.findUnique.mockResolvedValue(inactiveBudget);
      mockPrismaService.budget.update.mockResolvedValue({ ...mockBudget, isActive: true });

      const result = await service.activateBudget('budget-id', 'user-id');

      expect(result.isActive).toBe(true);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error when activating already active budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);

      await expect(service.activateBudget('budget-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activateBudget('budget-id', 'user-id')).rejects.toThrow(
        'already active',
      );
    });

    it('should throw error when activating budget with past end date', async () => {
      const expiredBudget = {
        ...mockBudget,
        isActive: false,
        endDate: new Date('2020-01-01'),
      };
      mockPrismaService.budget.findUnique.mockResolvedValue(expiredBudget);

      await expect(service.activateBudget('budget-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activateBudget('budget-id', 'user-id')).rejects.toThrow('past');
    });
  });

  describe('closeBudget', () => {
    it('should close an active budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(100000) },
      ]);
      mockPrismaService.budget.update.mockResolvedValue({ ...mockBudget, isActive: false });

      const result = await service.closeBudget('budget-id', 'user-id');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error when closing already inactive budget', async () => {
      const inactiveBudget = { ...mockBudget, isActive: false };
      mockPrismaService.budget.findUnique.mockResolvedValue(inactiveBudget);

      await expect(service.closeBudget('budget-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.closeBudget('budget-id', 'user-id')).rejects.toThrow('already inactive');
    });
  });

  describe('archiveBudget', () => {
    it('should archive a closed budget after end date', async () => {
      const closedBudget = {
        ...mockBudget,
        isActive: false,
        endDate: new Date('2020-01-01'),
      };
      mockPrismaService.budget.findUnique.mockResolvedValue(closedBudget);

      const result = await service.archiveBudget('budget-id', 'user-id');

      expect(result).toBeDefined();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error when archiving active budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);

      await expect(service.archiveBudget('budget-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.archiveBudget('budget-id', 'user-id')).rejects.toThrow(
        'must be closed before archiving',
      );
    });

    it('should throw error when archiving before end date', async () => {
      const futureEndBudget = {
        ...mockBudget,
        isActive: false,
        endDate: new Date('2030-12-31'),
      };
      mockPrismaService.budget.findUnique.mockResolvedValue(futureEndBudget);

      await expect(service.archiveBudget('budget-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.archiveBudget('budget-id', 'user-id')).rejects.toThrow('before its end');
    });
  });

  describe('getBudgetStatus', () => {
    it('should return ACTIVE for active budget within period', () => {
      const result = service.getBudgetStatus(mockBudget);
      expect(result).toBe(BudgetStatus.ACTIVE);
    });

    it('should return DRAFT for future active budget', () => {
      const futureBudget = {
        ...mockBudget,
        startDate: new Date('2030-01-01'),
        endDate: new Date('2030-12-31'),
      };

      const result = service.getBudgetStatus(futureBudget);
      expect(result).toBe(BudgetStatus.DRAFT);
    });

    it('should return CLOSED for inactive budget with future end date', () => {
      const closedBudget = {
        ...mockBudget,
        isActive: false,
        endDate: new Date('2030-12-31'),
      };

      const result = service.getBudgetStatus(closedBudget);
      expect(result).toBe(BudgetStatus.CLOSED);
    });

    it('should return ARCHIVED for inactive budget with past end date', () => {
      const archivedBudget = {
        ...mockBudget,
        isActive: false,
        endDate: new Date('2020-01-01'),
      };

      const result = service.getBudgetStatus(archivedBudget);
      expect(result).toBe(BudgetStatus.ARCHIVED);
    });
  });

  // ==================== BUDGET SUMMARY TESTS ====================

  describe('getBudgetSummary', () => {
    it('should return summary with aggregated metrics', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget, mockBudgetHardBlock]);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(200000) },
      ]);

      const result = await service.getBudgetSummary({});

      expect(result.summary.totalBudgets).toBe(2);
      expect(result.budgets).toHaveLength(2);
      expect(result.generatedAt).toBeDefined();
    });

    it('should filter by budget type', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getBudgetSummary({ type: BudgetType.DEPARTMENT });

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: BudgetType.DEPARTMENT,
          }),
        }),
      );
    });

    it('should filter by fiscal year', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getBudgetSummary({ fiscalYear: 2024 });

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: expect.any(Object),
            endDate: expect.any(Object),
          }),
        }),
      );
    });

    it('should count budgets over threshold', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(450000) },
      ]);

      const result = await service.getBudgetSummary({});

      expect(result.summary.budgetsOverThreshold).toBe(1); // 90% > 80% threshold
    });

    it('should count budgets exceeded', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([mockBudget]);
      mockPrismaService.expense.findMany.mockResolvedValue([
        { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(600000) },
      ]);

      const result = await service.getBudgetSummary({});

      expect(result.summary.budgetsExceeded).toBe(1);
    });

    it('should include inactive budgets when activeOnly is false', async () => {
      mockPrismaService.budget.findMany.mockResolvedValue([
        mockBudget,
        { ...mockBudget, id: 'inactive-id', isActive: false },
      ]);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      await service.getBudgetSummary({ activeOnly: false });

      expect(mockPrismaService.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  // ==================== EDGE CASES AND BOUNDARY CONDITIONS ====================

  describe('Edge Cases', () => {
    describe('Utilization with zero budget', () => {
      it('should handle zero totalAmount budget', async () => {
        const zeroBudget = { ...mockBudget, totalAmount: new Decimal(0) };
        mockPrismaService.budget.findUnique.mockResolvedValue(zeroBudget);
        mockPrismaService.expense.findMany.mockResolvedValue([]);

        const result = await service.getUtilization('budget-id');

        expect(result.utilizationPercentage).toBe(0);
        expect(result.available).toBe(0);
      });
    });

    describe('Budget check with committed amounts', () => {
      it('should include committed amounts in utilization check', async () => {
        mockPrismaService.budget.findUnique.mockResolvedValue(mockBudget);
        mockPrismaService.expense.findMany.mockResolvedValue([
          { id: 'exp-1', status: ExpenseStatus.PENDING_APPROVAL, amountInPKR: new Decimal(300000) },
          { id: 'exp-2', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(150000) },
        ]);

        const result = await service.checkBudgetForExpense('budget-id', 100000);

        // committed: 300000, spent: 150000, expense: 100000, total: 550000
        expect(result.wouldExceed).toBe(true);
      });
    });

    describe('Transfer boundary conditions', () => {
      it('should allow transfer of exact available amount', async () => {
        const fromBudget = { ...mockBudget, totalAmount: new Decimal(100000) };
        const toBudget = { ...mockBudget, id: 'to-id', totalAmount: new Decimal(50000) };

        mockPrismaService.budget.findUnique
          .mockResolvedValueOnce(fromBudget)
          .mockResolvedValueOnce(toBudget);
        mockPrismaService.expense.findMany.mockResolvedValue([]);

        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          const tx = {
            budget: {
              update: jest
                .fn()
                .mockResolvedValueOnce({ ...fromBudget, totalAmount: new Decimal(0) })
                .mockResolvedValueOnce({ ...toBudget, totalAmount: new Decimal(150000) }),
            },
            auditLog: { create: jest.fn() },
          };
          return callback(tx);
        });

        const result = await service.transferBudget(
          {
            fromBudgetId: 'budget-id',
            toBudgetId: 'to-id',
            amount: 100000,
            reason: 'Full transfer',
          },
          'user-id',
        );

        expect(result.success).toBe(true);
        expect(result.fromBudgetNewBalance).toBe(0);
      });
    });
  });

  // ==================== ENFORCEMENT ACTION TESTS ====================

  describe('Enforcement Actions', () => {
    const enforcementTestCases = [
      {
        enforcement: BudgetEnforcement.HARD_BLOCK,
        expectedAction: EnforcementAction.HARD_BLOCK,
        canProceed: false,
      },
      {
        enforcement: BudgetEnforcement.SOFT_WARNING,
        expectedAction: EnforcementAction.SOFT_WARNING,
        canProceed: true,
      },
      {
        enforcement: BudgetEnforcement.AUTO_ESCALATE,
        expectedAction: EnforcementAction.ESCALATE,
        canProceed: true,
      },
    ];

    enforcementTestCases.forEach(({ enforcement, expectedAction, canProceed }) => {
      it(`should return ${expectedAction} and canProceed=${canProceed} for ${enforcement} enforcement when exceeding budget`, async () => {
        const testBudget = { ...mockBudget, enforcement };
        mockPrismaService.budget.findUnique.mockResolvedValue(testBudget);
        mockPrismaService.expense.findMany.mockResolvedValue([
          { id: 'exp-1', status: ExpenseStatus.APPROVED, amountInPKR: new Decimal(480000) },
        ]);

        const result = await service.checkBudgetForExpense('budget-id', 50000);

        expect(result.enforcementAction).toBe(expectedAction);
        expect(result.canProceed).toBe(canProceed);
      });
    });

    it('should return NONE action when expense does not exceed budget', async () => {
      mockPrismaService.budget.findUnique.mockResolvedValue(mockBudgetHardBlock);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.checkBudgetForExpense('budget-hard-block', 50000);

      expect(result.enforcementAction).toBe(EnforcementAction.NONE);
      expect(result.canProceed).toBe(true);
    });
  });

  // ==================== PERIOD TYPE TESTS ====================

  describe('Budget Period Types', () => {
    it('should handle all budget period types for current period', () => {
      const periodTypes = [
        BudgetPeriod.ANNUAL,
        BudgetPeriod.QUARTERLY,
        BudgetPeriod.MONTHLY,
        BudgetPeriod.PROJECT_BASED,
      ];

      periodTypes.forEach((periodType) => {
        const result = service.getCurrentPeriod(periodType);
        expect(result.year).toBe(new Date().getFullYear());
      });
    });

    it('should handle February correctly for monthly period', () => {
      const result = service.getBudgetPeriodDates(BudgetPeriod.MONTHLY, 2024, undefined, 2);

      expect(result.startDate.getMonth()).toBe(1); // February
      expect(result.endDate.getDate()).toBe(29); // 2024 is a leap year
    });
  });
});
