import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import {
  ExpenseStatus,
  RoleType,
  UserStatus,
  User,
  ExpenseType,
  Currency,
} from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('ExpensesService', () => {
  let service: ExpensesService;

  const mockPrismaService = {
    expense: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    exchangeRate: {
      findFirst: jest.fn(),
    },
  };

  const mockEmailService = {
    sendExpenseSubmittedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmployee: User = {
    id: 'employee-id',
    email: 'employee@tekcellent.com',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'Employee',
    employeeId: null,
    phone: null,
    role: RoleType.EMPLOYEE,
    status: UserStatus.ACTIVE,
    departmentId: 'dept-1',
    managerId: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastActivityAt: new Date(),
    mustChangePassword: false,
    passwordChangedAt: null,
    passwordHistory: [],
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: User = {
    ...mockEmployee,
    id: 'admin-id',
    email: 'admin@tekcellent.com',
    role: RoleType.ADMIN,
  };

  const mockFinance: User = {
    ...mockEmployee,
    id: 'finance-id',
    email: 'finance@tekcellent.com',
    role: RoleType.FINANCE,
  };

  const mockCeo: User = {
    ...mockEmployee,
    id: 'ceo-id',
    email: 'ceo@tekcellent.com',
    role: RoleType.CEO,
  };

  const mockSuperApprover: User = {
    ...mockEmployee,
    id: 'super-approver-id',
    email: 'superapprover@tekcellent.com',
    role: RoleType.SUPER_APPROVER,
  };

  const mockApprover: User = {
    ...mockEmployee,
    id: 'approver-id',
    email: 'approver@tekcellent.com',
    role: RoleType.APPROVER,
    departmentId: 'dept-1',
  };

  const mockExpense = {
    id: 'expense-id',
    expenseNumber: 'EXP-2026-00001',
    type: ExpenseType.OUT_OF_POCKET,
    submitterId: 'employee-id',
    submittedAt: null,
    vendorId: null,
    vendorName: null,
    expenseDate: new Date(),
    description: 'Test expense',
    receiptNumber: null,
    invoiceNumber: null,
    currency: Currency.PKR,
    amount: new Decimal(5000),
    taxAmount: new Decimal(0),
    totalAmount: new Decimal(5000),
    exchangeRate: null,
    amountInPKR: new Decimal(5000),
    categoryId: 'cat-id',
    departmentId: null,
    projectId: null,
    costCenterId: null,
    budgetId: null,
    preApprovalId: null,
    voucherId: null,
    status: ExpenseStatus.DRAFT,
    rejectionReason: null,
    clarificationNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat-id', name: 'Travel' },
    vendor: null,
    receipts: [{ id: 'receipt-1' }],
  };

  const createExpenseDto = {
    type: ExpenseType.OUT_OF_POCKET,
    categoryId: 'cat-id',
    description: 'Client dinner meeting',
    amount: 5000,
    currency: Currency.PKR,
    expenseDate: '2026-03-15',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);

    jest.clearAllMocks();
  });

  // ==================== CREATE ====================

  describe('create', () => {
    it('should create an expense with DRAFT status', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });

      const result = await service.create(mockEmployee.id, createExpenseDto);

      expect(result.status).toBe(ExpenseStatus.DRAFT);
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submitterId: mockEmployee.id,
            status: ExpenseStatus.DRAFT,
          }),
        }),
      );
    });

    it('should generate expense number with EXP-YYYY-XXXXX format', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      await service.create(mockEmployee.id, createExpenseDto);

      const year = new Date().getFullYear();
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseNumber: `EXP-${year}-00001`,
          }),
        }),
      );
    });

    it('should increment expense number based on last expense', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue({
        expenseNumber: `EXP-${new Date().getFullYear()}-00042`,
      });
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      await service.create(mockEmployee.id, createExpenseDto);

      const year = new Date().getFullYear();
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseNumber: `EXP-${year}-00043`,
          }),
        }),
      );
    });

    it('should calculate totalAmount as amount + taxAmount', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      const dtoWithTax = { ...createExpenseDto, taxAmount: 500 };
      await service.create(mockEmployee.id, dtoWithTax);

      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 5500,
          }),
        }),
      );
    });

    it('should set amountInPKR equal to totalAmount for PKR currency', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      await service.create(mockEmployee.id, createExpenseDto);

      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountInPKR: 5000,
          }),
        }),
      );
    });

    it('should convert to PKR using exchange rate for foreign currency', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue({
        rate: new Decimal(280),
        effectiveDate: new Date(),
      });
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      const foreignDto = { ...createExpenseDto, currency: Currency.USD };
      await service.create(mockEmployee.id, foreignDto);

      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountInPKR: 5000 * 280,
            exchangeRate: 280,
          }),
        }),
      );
    });

    it('should use provided exchange rate over database rate', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      const foreignDto = {
        ...createExpenseDto,
        currency: Currency.USD,
        exchangeRate: 300,
      };
      await service.create(mockEmployee.id, foreignDto);

      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            exchangeRate: 300,
            amountInPKR: 5000 * 300,
          }),
        }),
      );
    });

    it('should include category, vendor, and receipts in result', async () => {
      mockPrismaService.expense.findFirst.mockResolvedValue(null);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      await service.create(mockEmployee.id, createExpenseDto);

      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            category: true,
            vendor: true,
            receipts: true,
          }),
        }),
      );
    });
  });

  // ==================== FIND ALL ====================

  describe('findAll', () => {
    const defaultFilters = {};

    beforeEach(() => {
      mockPrismaService.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrismaService.expense.count.mockResolvedValue(1);
    });

    it('should return paginated expenses with meta', async () => {
      const result = await service.findAll(mockEmployee, defaultFilters);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual(
        expect.objectContaining({
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      );
    });

    it('should use default page=1 and limit=20', async () => {
      await service.findAll(mockEmployee, {});

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply custom pagination', async () => {
      await service.findAll(mockEmployee, { page: 3, limit: 10 });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    // RBAC visibility tests
    it('should show only own expenses for EMPLOYEE', async () => {
      await service.findAll(mockEmployee, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submitterId: mockEmployee.id,
          }),
        }),
      );
    });

    it('should show all expenses for ADMIN', async () => {
      await service.findAll(mockAdmin, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should show all expenses for FINANCE', async () => {
      await service.findAll(mockFinance, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should show all expenses for CEO', async () => {
      await service.findAll(mockCeo, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should show all expenses for SUPER_APPROVER', async () => {
      await service.findAll(mockSuperApprover, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should show own + department expenses for APPROVER with departmentId', async () => {
      await service.findAll(mockApprover, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { submitterId: mockApprover.id },
              { submitter: { departmentId: mockApprover.departmentId } },
            ],
          }),
        }),
      );
    });

    it('should show only own expenses for APPROVER without departmentId', async () => {
      const approverNoDept = { ...mockApprover, departmentId: null };
      await service.findAll(approverNoDept, defaultFilters);

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submitterId: approverNoDept.id,
          }),
        }),
      );
    });

    // Filtering tests
    it('should filter by single status', async () => {
      await service.findAll(mockEmployee, { status: 'DRAFT' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should filter by comma-separated statuses', async () => {
      await service.findAll(mockEmployee, { status: 'DRAFT,SUBMITTED' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['DRAFT', 'SUBMITTED'] },
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      await service.findAll(mockEmployee, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expenseDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should filter by categoryId', async () => {
      await service.findAll(mockEmployee, { categoryId: 'cat-id' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-id',
          }),
        }),
      );
    });

    it('should filter by amount range', async () => {
      await service.findAll(mockEmployee, { amountMin: 1000, amountMax: 5000 });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            totalAmount: { gte: 1000, lte: 5000 },
          }),
        }),
      );
    });

    it('should filter by search term in description and expenseNumber', async () => {
      await service.findAll(mockEmployee, { search: 'dinner' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { description: { contains: 'dinner', mode: 'insensitive' } },
              { expenseNumber: { contains: 'dinner', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    // Sorting tests
    it('should sort by createdAt desc by default', async () => {
      await service.findAll(mockEmployee, {});

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply valid sort field and direction', async () => {
      await service.findAll(mockEmployee, { sort: 'totalAmount:asc' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { totalAmount: 'asc' },
        }),
      );
    });

    it('should fallback to default sort for invalid sort field', async () => {
      await service.findAll(mockEmployee, { sort: 'invalidField:asc' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should fallback to default sort for invalid direction', async () => {
      await service.findAll(mockEmployee, { sort: 'createdAt:invalid' });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ==================== FIND ONE ====================

  describe('findOne', () => {
    const expenseWithSubmitter = {
      ...mockExpense,
      submitter: { id: 'employee-id', firstName: 'Test', lastName: 'Employee', departmentId: 'dept-1' },
      approvalHistory: [],
      comments: [],
      splits: [],
    };

    it('should return expense for owner', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockEmployee);

      expect(result).toBeDefined();
      expect(result.id).toBe('expense-id');
    });

    it('should return expense for ADMIN', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockAdmin);

      expect(result).toBeDefined();
    });

    it('should return expense for FINANCE', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockFinance);

      expect(result).toBeDefined();
    });

    it('should return expense for CEO', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockCeo);

      expect(result).toBeDefined();
    });

    it('should return expense for SUPER_APPROVER', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockSuperApprover);

      expect(result).toBeDefined();
    });

    it('should return expense for APPROVER in same department', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      const result = await service.findOne('expense-id', mockApprover);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-owner EMPLOYEE', async () => {
      const otherEmployee = { ...mockEmployee, id: 'other-id' };
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      await expect(service.findOne('expense-id', otherEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for APPROVER in different department', async () => {
      const otherDeptApprover = { ...mockApprover, departmentId: 'dept-other' };
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithSubmitter);

      await expect(service.findOne('expense-id', otherDeptApprover)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== UPDATE ====================

  describe('update', () => {
    const updateDto = { description: 'Updated description' };

    it('should update a DRAFT expense owned by user', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        description: 'Updated description',
      });

      const result = await service.update('expense-id', mockEmployee, updateDto);

      expect(result.description).toBe('Updated description');
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'expense-id' },
        }),
      );
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', mockEmployee, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
      });

      await expect(service.update('expense-id', mockEmployee, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('expense-id', mockEmployee, updateDto)).rejects.toThrow(
        'only update your own expenses',
      );
    });

    it('should throw BadRequestException when updating non-DRAFT expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });

      await expect(service.update('expense-id', mockEmployee, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('expense-id', mockEmployee, updateDto)).rejects.toThrow(
        'Only draft expenses',
      );
    });

    it('should convert expenseDate string to Date object', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });
      mockPrismaService.expense.update.mockResolvedValue(mockExpense);

      await service.update('expense-id', mockEmployee, { expenseDate: '2026-06-15' } as any);

      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseDate: new Date('2026-06-15'),
          }),
        }),
      );
    });
  });

  // ==================== SUBMIT ====================

  describe('submit', () => {
    it('should submit a DRAFT expense with receipts', async () => {
      mockPrismaService.expense.findUnique
        .mockResolvedValueOnce({
          ...mockExpense,
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'receipt-1' }],
        })
        .mockResolvedValueOnce({
          ...mockExpense,
          submitter: { firstName: 'Test', lastName: 'Employee', manager: null },
          category: { name: 'Travel' },
        });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
        submittedAt: new Date(),
      });

      const result = await service.submit('expense-id', mockEmployee);

      expect(result.status).toBe(ExpenseStatus.SUBMITTED);
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.SUBMITTED,
            submittedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.submit('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-owner submits', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
        receipts: [{ id: 'receipt-1' }],
      });

      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        'only submit your own expenses',
      );
    });

    it('should throw BadRequestException for non-DRAFT expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
        receipts: [{ id: 'receipt-1' }],
      });

      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        'Only draft expenses',
      );
    });

    it('should throw BadRequestException when expense has no receipts', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
        receipts: [],
      });

      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submit('expense-id', mockEmployee)).rejects.toThrow(
        'At least one receipt',
      );
    });

    it('should send email to manager on submission', async () => {
      const managerData = { email: 'manager@tekcellent.com', firstName: 'Manager' };
      mockPrismaService.expense.findUnique
        .mockResolvedValueOnce({
          ...mockExpense,
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'receipt-1' }],
        })
        .mockResolvedValueOnce({
          ...mockExpense,
          submitter: {
            firstName: 'Test',
            lastName: 'Employee',
            manager: managerData,
          },
          category: { name: 'Travel' },
        });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });

      await service.submit('expense-id', mockEmployee);

      expect(mockEmailService.sendExpenseSubmittedEmail).toHaveBeenCalledWith(
        managerData,
        expect.any(Object),
      );
    });

    it('should not block submission when email fails', async () => {
      mockPrismaService.expense.findUnique
        .mockResolvedValueOnce({
          ...mockExpense,
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'receipt-1' }],
        })
        .mockResolvedValueOnce({
          ...mockExpense,
          submitter: {
            firstName: 'Test',
            lastName: 'Employee',
            manager: { email: 'manager@tekcellent.com' },
          },
          category: { name: 'Travel' },
        });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });
      mockEmailService.sendExpenseSubmittedEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.submit('expense-id', mockEmployee);

      expect(result.status).toBe(ExpenseStatus.SUBMITTED);
    });

    it('should not send email when submitter has no manager', async () => {
      mockPrismaService.expense.findUnique
        .mockResolvedValueOnce({
          ...mockExpense,
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'receipt-1' }],
        })
        .mockResolvedValueOnce({
          ...mockExpense,
          submitter: {
            firstName: 'Test',
            lastName: 'Employee',
            manager: null,
          },
          category: { name: 'Travel' },
        });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });

      await service.submit('expense-id', mockEmployee);

      expect(mockEmailService.sendExpenseSubmittedEmail).not.toHaveBeenCalled();
    });
  });

  // ==================== RESUBMIT ====================

  describe('resubmit', () => {
    it('should resubmit a REJECTED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
      });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.RESUBMITTED,
        submittedAt: new Date(),
      });

      const result = await service.resubmit('expense-id', mockEmployee);

      expect(result.status).toBe(ExpenseStatus.RESUBMITTED);
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.RESUBMITTED,
            submittedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.resubmit('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-owner resubmits', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
        status: ExpenseStatus.REJECTED,
      });

      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        'only resubmit your own expenses',
      );
    });

    it('should throw BadRequestException for non-REJECTED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });

      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        'Only rejected expenses',
      );
    });

    it('should throw BadRequestException for SUBMITTED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });

      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for APPROVED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(service.resubmit('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== REMOVE ====================

  describe('remove', () => {
    it('should delete a DRAFT expense owned by user', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });
      mockPrismaService.expense.delete.mockResolvedValue(mockExpense);

      const result = await service.remove('expense-id', mockEmployee);

      expect(result).toBeDefined();
      expect(mockPrismaService.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-id' },
      });
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-owner deletes', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
      });

      await expect(service.remove('expense-id', mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove('expense-id', mockEmployee)).rejects.toThrow(
        'only delete your own expenses',
      );
    });

    it('should throw BadRequestException for non-DRAFT expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });

      await expect(service.remove('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('expense-id', mockEmployee)).rejects.toThrow(
        'Only draft expenses',
      );
    });

    it('should throw BadRequestException for APPROVED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(service.remove('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== WITHDRAW ====================

  describe('withdraw', () => {
    it('should withdraw a SUBMITTED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
        submittedAt: null,
      });

      const result = await service.withdraw('expense-id', mockEmployee);

      expect(result.status).toBe(ExpenseStatus.DRAFT);
      expect(result.submittedAt).toBeNull();
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.DRAFT,
            submittedAt: null,
          }),
        }),
      );
    });

    it('should withdraw a PENDING_APPROVAL expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.PENDING_APPROVAL,
      });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
        submittedAt: null,
      });

      const result = await service.withdraw('expense-id', mockEmployee);

      expect(result.status).toBe(ExpenseStatus.DRAFT);
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.withdraw('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-owner withdraws', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
        status: ExpenseStatus.SUBMITTED,
      });

      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        'only withdraw your own expenses',
      );
    });

    it('should throw BadRequestException for DRAFT expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });

      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        'Only submitted or pending approval',
      );
    });

    it('should throw BadRequestException for APPROVED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for REJECTED expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
      });

      await expect(service.withdraw('expense-id', mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include category, vendor, receipts in response', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.SUBMITTED,
      });
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
      });

      await service.withdraw('expense-id', mockEmployee);

      expect(mockPrismaService.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            category: true,
            vendor: true,
            receipts: true,
          }),
        }),
      );
    });
  });

  // ==================== BULK SUBMIT ====================

  describe('bulkSubmit', () => {
    const expenseIds = ['expense-1', 'expense-2'];

    it('should bulk submit valid DRAFT expenses', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          expenseNumber: 'EXP-2026-00001',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-1' }],
        },
        {
          ...mockExpense,
          id: 'expense-2',
          expenseNumber: 'EXP-2026-00002',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-2' }],
        },
      ]);
      mockPrismaService.expense.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkSubmit(mockEmployee.id, expenseIds);

      expect(result).toEqual({ submitted: 2 });
      expect(mockPrismaService.expense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: expenseIds } },
          data: expect.objectContaining({
            status: ExpenseStatus.SUBMITTED,
            submittedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when some expenses not found', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, id: 'expense-1', receipts: [{ id: 'r-1' }] },
      ]);

      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        'One or more expenses not found',
      );
    });

    it('should throw ForbiddenException when expense is not owned by user', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          submitterId: 'other-user-id',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-1' }],
        },
        {
          ...mockExpense,
          id: 'expense-2',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-2' }],
        },
      ]);

      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when expense is not DRAFT', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          expenseNumber: 'EXP-2026-00001',
          status: ExpenseStatus.SUBMITTED,
          receipts: [{ id: 'r-1' }],
        },
        {
          ...mockExpense,
          id: 'expense-2',
          expenseNumber: 'EXP-2026-00002',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-2' }],
        },
      ]);

      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        'not in draft status',
      );
    });

    it('should throw BadRequestException when expense has no receipts', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          expenseNumber: 'EXP-2026-00001',
          status: ExpenseStatus.DRAFT,
          receipts: [],
        },
        {
          ...mockExpense,
          id: 'expense-2',
          expenseNumber: 'EXP-2026-00002',
          status: ExpenseStatus.DRAFT,
          receipts: [{ id: 'r-2' }],
        },
      ]);

      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.bulkSubmit(mockEmployee.id, expenseIds)).rejects.toThrow(
        'requires at least one receipt',
      );
    });
  });

  // ==================== BULK DELETE ====================

  describe('bulkDelete', () => {
    const expenseIds = ['expense-1', 'expense-2'];

    it('should bulk delete valid DRAFT expenses', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          expenseNumber: 'EXP-2026-00001',
          status: ExpenseStatus.DRAFT,
        },
        {
          ...mockExpense,
          id: 'expense-2',
          expenseNumber: 'EXP-2026-00002',
          status: ExpenseStatus.DRAFT,
        },
      ]);
      mockPrismaService.expense.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkDelete(mockEmployee.id, expenseIds);

      expect(result).toEqual({ deleted: 2 });
      expect(mockPrismaService.expense.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: expenseIds } },
        }),
      );
    });

    it('should throw NotFoundException when some expenses not found', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, id: 'expense-1' },
      ]);

      await expect(service.bulkDelete(mockEmployee.id, expenseIds)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when expense is not owned by user', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          submitterId: 'other-user-id',
          status: ExpenseStatus.DRAFT,
        },
        {
          ...mockExpense,
          id: 'expense-2',
          status: ExpenseStatus.DRAFT,
        },
      ]);

      await expect(service.bulkDelete(mockEmployee.id, expenseIds)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when expense is not DRAFT', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          id: 'expense-1',
          expenseNumber: 'EXP-2026-00001',
          status: ExpenseStatus.APPROVED,
        },
        {
          ...mockExpense,
          id: 'expense-2',
          expenseNumber: 'EXP-2026-00002',
          status: ExpenseStatus.DRAFT,
        },
      ]);

      await expect(service.bulkDelete(mockEmployee.id, expenseIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.bulkDelete(mockEmployee.id, expenseIds)).rejects.toThrow(
        'not in draft status',
      );
    });
  });

  // ==================== GET APPROVALS ====================

  describe('getApprovals', () => {
    const expenseWithHistory = {
      ...mockExpense,
      submitterId: 'employee-id',
      submitter: { id: 'employee-id', departmentId: 'dept-1' },
      approvalHistory: [
        {
          id: 'approval-1',
          action: 'APPROVED',
          approver: { id: 'approver-id', firstName: 'Approver', lastName: 'One' },
          createdAt: new Date(),
        },
      ],
    };

    it('should return approval history for expense owner', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockEmployee);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('APPROVED');
    });

    it('should return approval history for ADMIN', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockAdmin);

      expect(result).toHaveLength(1);
    });

    it('should return approval history for FINANCE', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockFinance);

      expect(result).toHaveLength(1);
    });

    it('should return approval history for CEO', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockCeo);

      expect(result).toHaveLength(1);
    });

    it('should return approval history for SUPER_APPROVER', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockSuperApprover);

      expect(result).toHaveLength(1);
    });

    it('should return approval history for APPROVER in same department', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      const result = await service.getApprovals('expense-id', mockApprover);

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for non-owner EMPLOYEE', async () => {
      const otherEmployee = { ...mockEmployee, id: 'other-employee-id' };
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      await expect(service.getApprovals('expense-id', otherEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for APPROVER in different department', async () => {
      const otherDeptApprover = { ...mockApprover, departmentId: 'dept-other' };
      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);

      await expect(service.getApprovals('expense-id', otherDeptApprover)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.getApprovals('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
