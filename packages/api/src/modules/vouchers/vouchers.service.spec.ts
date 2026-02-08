import { Test, TestingModule } from '@nestjs/testing';
import { VouchersService } from './vouchers.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  VoucherStatus,
  RoleType,
  UserStatus,
  User,
  Voucher,
  ExpenseStatus,
  ExpenseType,
  Expense,
  Currency,
} from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('VouchersService', () => {
  let service: VouchersService;

  const mockPrismaService = {
    voucher: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
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
    departmentId: null,
    managerId: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastActivityAt: new Date(),
    mustChangePassword: false,
    passwordChangedAt: null,
    passwordHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFinance: User = {
    ...mockEmployee,
    id: 'finance-id',
    email: 'finance@tekcellent.com',
    role: RoleType.FINANCE,
  };

  const mockApprover: User = {
    ...mockEmployee,
    id: 'approver-id',
    email: 'approver@tekcellent.com',
    role: RoleType.APPROVER,
  };

  const mockAdmin: User = {
    ...mockEmployee,
    id: 'admin-id',
    email: 'admin@tekcellent.com',
    role: RoleType.ADMIN,
  };

  const mockSuperApprover: User = {
    ...mockEmployee,
    id: 'super-approver-id',
    email: 'superapprover@tekcellent.com',
    role: RoleType.SUPER_APPROVER,
  };

  const mockCeo: User = {
    ...mockEmployee,
    id: 'ceo-id',
    email: 'ceo@tekcellent.com',
    role: RoleType.CEO,
  };

  const mockVoucher: Voucher = {
    id: 'voucher-id',
    voucherNumber: 'PC-2024-0001',
    requesterId: 'employee-id',
    currency: Currency.PKR,
    requestedAmount: new Decimal(50000),
    approvedAmount: null,
    disbursedAmount: null,
    settledAmount: null,
    underSpendAmount: null,
    overSpendAmount: null,
    cashReturned: null,
    purpose: 'Office supplies purchase',
    status: VoucherStatus.REQUESTED,
    requestedAt: new Date(),
    approvedAt: null,
    approvedBy: null,
    disbursedAt: null,
    disbursedBy: null,
    settledAt: null,
    settlementDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExpense: Expense = {
    id: 'expense-id',
    expenseNumber: 'EXP-001',
    type: ExpenseType.PETTY_CASH,
    submitterId: 'employee-id',
    submittedAt: new Date(),
    vendorId: null,
    vendorName: null,
    expenseDate: new Date(),
    description: 'Test Expense',
    receiptNumber: null,
    invoiceNumber: null,
    currency: Currency.PKR,
    amount: new Decimal(10000),
    taxType: 'NONE' as any,
    taxAmount: new Decimal(0),
    totalAmount: new Decimal(10000),
    exchangeRate: null,
    amountInPKR: new Decimal(10000),
    exchangeRateDate: null,
    categoryId: 'cat-id',
    departmentId: null,
    projectId: null,
    costCenterId: null,
    budgetId: null,
    preApprovalId: null,
    voucherId: null,
    isMileage: false,
    mileageStart: null,
    mileageEnd: null,
    mileageDistance: null,
    mileageRate: null,
    vehicleType: null,
    isPerDiem: false,
    perDiemDays: null,
    perDiemRate: null,
    perDiemDestination: null,
    ocrProcessed: false,
    ocrConfidence: null,
    ocrRawData: null,
    ocrNeedsReview: false,
    status: ExpenseStatus.APPROVED,
    rejectionReason: null,
    clarificationNote: null,
    submissionDeadline: null,
    isOverdue: false,
    isDuplicate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VouchersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<VouchersService>(VouchersService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default transaction behavior
    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      const results = [];
      for (const operation of callback) {
        results.push(await operation);
      }
      return results;
    });
  });

  describe('create', () => {
    const createDto = {
      requestedAmount: 25000,
      purpose: 'Office supplies for team meeting',
      settlementDeadline: undefined,
    };

    it('should create a voucher request successfully', async () => {
      mockPrismaService.voucher.findFirst.mockResolvedValue(null); // No open vouchers
      mockPrismaService.voucher.findFirst.mockResolvedValueOnce(null); // For number generation
      mockPrismaService.voucher.create.mockResolvedValue({
        ...mockVoucher,
        requestedAmount: new Decimal(createDto.requestedAmount),
        purpose: createDto.purpose,
        requester: mockEmployee,
      });

      const result = await service.create(mockEmployee.id, createDto);

      expect(result).toBeDefined();
      expect(result.purpose).toBe(createDto.purpose);
      expect(mockPrismaService.voucher.create).toHaveBeenCalled();
    });

    it('should reject voucher with negative amount', async () => {
      const invalidDto = { ...createDto, requestedAmount: -100 };

      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        'Requested amount must be positive',
      );
    });

    it('should reject voucher with zero amount', async () => {
      const invalidDto = { ...createDto, requestedAmount: 0 };

      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject voucher exceeding maximum amount', async () => {
      const invalidDto = { ...createDto, requestedAmount: 60000 };

      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        'Maximum petty cash request is PKR 50000',
      );
    });

    it('should reject voucher with short purpose', async () => {
      const invalidDto = { ...createDto, purpose: 'Short' };

      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockEmployee.id, invalidDto)).rejects.toThrow(
        'minimum 10 characters',
      );
    });

    it('should reject voucher if user has open voucher', async () => {
      mockPrismaService.voucher.findFirst.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });

      await expect(service.create(mockEmployee.id, createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(mockEmployee.id, createDto)).rejects.toThrow(
        'already have an open petty cash voucher',
      );
    });

    it('should generate unique voucher numbers', async () => {
      mockPrismaService.voucher.findFirst
        .mockResolvedValueOnce(null) // No open vouchers
        .mockResolvedValueOnce({ voucherNumber: 'PC-2024-0005' }); // Last voucher

      mockPrismaService.voucher.create.mockResolvedValue({
        ...mockVoucher,
        voucherNumber: 'PC-2024-0006',
        requester: mockEmployee,
      });

      const result = await service.create(mockEmployee.id, createDto);

      expect(result.voucherNumber).toMatch(/^PC-\d{4}-\d{4}$/);
    });
  });

  describe('findAll', () => {
    it('should return all vouchers for admin/finance', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
      mockPrismaService.voucher.count.mockResolvedValue(1);
      mockPrismaService.voucher.groupBy.mockResolvedValue([]);

      const result = await service.findAll(mockFinance);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // No requester filter for admin/finance
        }),
      );
    });

    it('should return only user vouchers for employee', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
      mockPrismaService.voucher.count.mockResolvedValue(1);
      mockPrismaService.voucher.groupBy.mockResolvedValue([]);

      const result = await service.findAll(mockEmployee);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requesterId: mockEmployee.id },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
      mockPrismaService.voucher.count.mockResolvedValue(1);
      mockPrismaService.voucher.groupBy.mockResolvedValue([]);

      await service.findAll(mockEmployee, VoucherStatus.REQUESTED);

      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requesterId: mockEmployee.id,
            status: VoucherStatus.REQUESTED,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return voucher for owner', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.findOne(mockVoucher.id, mockEmployee);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockVoucher.id);
    });

    it('should return voucher for admin/finance', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.findOne(mockVoucher.id, mockFinance);

      expect(result).toBeDefined();
    });

    it('should reject access for non-owner employee', async () => {
      const otherEmployee = { ...mockEmployee, id: 'other-id' };
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        requester: mockEmployee,
        expenses: [],
      });

      await expect(service.findOne(mockVoucher.id, otherEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw not found for non-existent voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPendingApproval', () => {
    it('should return pending vouchers for approver', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);

      const result = await service.getPendingApproval(mockApprover);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: VoucherStatus.REQUESTED },
        }),
      );
    });

    it('should return pending vouchers for finance', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);

      const result = await service.getPendingApproval(mockFinance);

      expect(result).toBeDefined();
    });

    it('should reject access for employee', async () => {
      await expect(service.getPendingApproval(mockEmployee)).rejects.toThrow(ForbiddenException);
      await expect(service.getPendingApproval(mockEmployee)).rejects.toThrow(
        'Insufficient permissions',
      );
    });
  });

  describe('getOutstanding', () => {
    it('should return outstanding vouchers for finance', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([
        { ...mockVoucher, status: VoucherStatus.DISBURSED },
      ]);

      const result = await service.getOutstanding(mockFinance);

      expect(result).toBeDefined();
      expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: [VoucherStatus.DISBURSED, VoucherStatus.PARTIALLY_SETTLED] },
          },
        }),
      );
    });

    it('should reject access for non-finance/admin', async () => {
      await expect(service.getOutstanding(mockApprover)).rejects.toThrow(ForbiddenException);
      await expect(service.getOutstanding(mockEmployee)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOverdue', () => {
    it('should return overdue vouchers for admin', async () => {
      mockPrismaService.voucher.findMany.mockResolvedValue([
        { ...mockVoucher, status: VoucherStatus.OVERDUE },
      ]);

      const result = await service.getOverdue(mockAdmin);

      expect(result).toBeDefined();
    });

    it('should reject access for non-finance/admin', async () => {
      await expect(service.getOverdue(mockApprover)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve', () => {
    it('should approve requested voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(mockVoucher);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
        approvedBy: mockApprover.id,
        approvedAt: new Date(),
        approvedAmount: mockVoucher.requestedAmount,
        requester: mockEmployee,
      });

      const result = await service.approve(mockVoucher.id, mockApprover);

      expect(result.status).toBe(VoucherStatus.APPROVED);
      expect(result.approvedBy).toBe(mockApprover.id);
      expect(mockPrismaService.voucher.update).toHaveBeenCalled();
    });

    it('should reject approval of non-requested voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
      });

      await expect(service.approve(mockVoucher.id, mockApprover)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve(mockVoucher.id, mockApprover)).rejects.toThrow(
        'Only requested vouchers can be approved',
      );
    });

    it('should throw not found for non-existent voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(null);

      await expect(service.approve('non-existent', mockApprover)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    const rejectDto = { reason: 'Amount exceeds policy limit' };

    it('should reject requested voucher with reason', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(mockVoucher);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.REJECTED,
        notes: rejectDto.reason,
        requester: mockEmployee,
      });

      const result = await service.reject(mockVoucher.id, mockApprover, rejectDto);

      expect(result.status).toBe(VoucherStatus.REJECTED);
      expect(result.notes).toBe(rejectDto.reason);
    });

    it('should require rejection reason', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(mockVoucher);

      await expect(service.reject(mockVoucher.id, mockApprover, { reason: '' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject(mockVoucher.id, mockApprover, { reason: '  ' })).rejects.toThrow(
        'Rejection reason is required',
      );
    });

    it('should reject non-requested voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
      });

      await expect(service.reject(mockVoucher.id, mockApprover, rejectDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel voucher by owner before disbursement', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(mockVoucher);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.REJECTED,
        notes: 'Cancelled by requester',
      });

      const result = await service.cancel(mockVoucher.id, mockEmployee);

      expect(result.status).toBe(VoucherStatus.REJECTED);
      expect(result.notes).toContain('Cancelled');
    });

    it('should reject cancel by non-owner', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(mockVoucher);

      await expect(service.cancel(mockVoucher.id, mockApprover)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.cancel(mockVoucher.id, mockApprover)).rejects.toThrow(
        'Only the requester can cancel',
      );
    });

    it('should reject cancel after disbursement', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });

      await expect(service.cancel(mockVoucher.id, mockEmployee)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(mockVoucher.id, mockEmployee)).rejects.toThrow(
        'can only be cancelled before disbursement',
      );
    });
  });

  describe('disburse', () => {
    const disburseDto = { amount: 45000 };

    it('should disburse approved voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
      });
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(disburseDto.amount),
        disbursedBy: mockFinance.id,
        disbursedAt: new Date(),
        requester: mockEmployee,
      });

      const result = await service.disburse(mockVoucher.id, mockFinance, disburseDto);

      expect(result.status).toBe(VoucherStatus.DISBURSED);
      expect(result.disbursedBy).toBe(mockFinance.id);
      expect(result.disbursedAt).toBeDefined();
    });

    it('should reject disbursement exceeding requested amount', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
        requestedAmount: new Decimal(40000),
      });

      await expect(
        service.disburse(mockVoucher.id, mockFinance, { amount: 50000 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.disburse(mockVoucher.id, mockFinance, { amount: 50000 }),
      ).rejects.toThrow('cannot exceed requested amount');
    });

    it('should reject disbursement of non-approved voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.REQUESTED,
      });

      await expect(service.disburse(mockVoucher.id, mockFinance, disburseDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.disburse(mockVoucher.id, mockFinance, disburseDto)).rejects.toThrow(
        'Only approved vouchers can be disbursed',
      );
    });

    it('should calculate settlement deadline (7 business days)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
      });
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(disburseDto.amount),
        settlementDeadline: new Date(),
        requester: mockEmployee,
      });

      await service.disburse(mockVoucher.id, mockFinance, disburseDto);

      const updateCall = mockPrismaService.voucher.update.mock.calls[0][0];
      expect(updateCall.data.settlementDeadline).toBeDefined();
    });
  });

  describe('linkExpense', () => {
    const linkDto = { expenseId: 'expense-id' };

    it('should link petty cash expense to disbursed voucher', async () => {
      mockPrismaService.voucher.findUnique
        .mockResolvedValueOnce({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
        })
        .mockResolvedValueOnce({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
          requester: mockEmployee,
          expenses: [mockExpense],
        });

      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        type: ExpenseType.PETTY_CASH,
      });
      mockPrismaService.expense.update.mockResolvedValue(mockExpense);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });

      const result = await service.linkExpense(mockVoucher.id, mockEmployee, linkDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.expense.update).toHaveBeenCalled();
    });

    it('should reject linking by non-owner', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });

      await expect(service.linkExpense(mockVoucher.id, mockApprover, linkDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.linkExpense(mockVoucher.id, mockApprover, linkDto)).rejects.toThrow(
        'Only the requester can link expenses',
      );
    });

    it('should reject linking to non-disbursed voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
      });

      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        'must be disbursed before linking',
      );
    });

    it('should reject linking non-petty-cash expense', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        type: ExpenseType.OUT_OF_POCKET,
      });

      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject linking non-owned expense', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
      });
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        submitterId: 'other-user-id',
      });

      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.linkExpense(mockVoucher.id, mockEmployee, linkDto)).rejects.toThrow(
        'only link your own expenses',
      );
    });
  });

  describe('settle', () => {
    const settleDto = {
      notes: 'All expenses documented',
      overspendJustification: undefined,
      cashReturnConfirmed: undefined,
    };

    it('should settle voucher with exact spend', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(30000), status: ExpenseStatus.APPROVED },
          { ...mockExpense, totalAmount: new Decimal(20000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        settledAmount: new Decimal(50000),
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockEmployee, {
        ...settleDto,
        cashReturnConfirmed: false,
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should require overspend justification', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(40000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(50000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);

      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        'Overspend justification required',
      );
    });

    it('should settle with overspend justification', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(40000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(50000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockEmployee, {
        ...settleDto,
        overspendJustification: 'Additional items required',
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should require cash return confirmation for underspend', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(30000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);

      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        'confirm return of PKR',
      );
    });

    it('should settle with cash return confirmation', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(30000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockEmployee, {
        ...settleDto,
        cashReturnConfirmed: true,
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should reject settlement with pending expenses', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.SUBMITTED }, // Pending expense
      ]);

      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        'still pending approval',
      );
    });

    it('should reject settlement by non-owner (non-admin)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        expenses: [],
      });

      await expect(service.settle(mockVoucher.id, mockApprover, settleDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow settlement by finance', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(50000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockFinance, {
        ...settleDto,
        cashReturnConfirmed: false,
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should reject settlement of non-disbursed voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.APPROVED,
        expenses: [],
      });

      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        'not ready for settlement',
      );
    });

    it('should allow settlement from PARTIALLY_SETTLED status', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.PARTIALLY_SETTLED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(50000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockEmployee, {
        ...settleDto,
        cashReturnConfirmed: false,
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should allow settlement by admin', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(50000), status: ExpenseStatus.APPROVED },
        ],
      });
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      const result = await service.settle(mockVoucher.id, mockAdmin, {
        ...settleDto,
        cashReturnConfirmed: false,
      });

      expect(result.status).toBe(VoucherStatus.SETTLED);
    });

    it('should handle rejected expenses during settlement (not counted)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.DISBURSED,
        disbursedAmount: new Decimal(50000),
        expenses: [
          { ...mockExpense, totalAmount: new Decimal(30000), status: ExpenseStatus.APPROVED },
        ],
      });
      // All expenses including rejected
      mockPrismaService.expense.findMany.mockResolvedValue([
        { ...mockExpense, status: ExpenseStatus.APPROVED, totalAmount: new Decimal(30000) },
        { ...mockExpense, status: ExpenseStatus.REJECTED, totalAmount: new Decimal(10000) },
      ]);
      mockPrismaService.voucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.SETTLED,
        requester: mockEmployee,
        expenses: [],
      });

      // Should proceed with cash return confirmation for underspend
      await expect(service.settle(mockVoucher.id, mockEmployee, settleDto)).rejects.toThrow(
        'confirm return',
      );
    });

    it('should throw NotFoundException for non-existent voucher', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(null);

      await expect(service.settle('non-existent', mockEmployee, settleDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== ADDITIONAL EDGE CASE TESTS ====================

  describe('Edge Cases and Boundary Conditions', () => {
    describe('create - boundary values', () => {
      it('should accept exactly 50000 PKR (maximum limit)', async () => {
        const createDto = {
          requestedAmount: 50000,
          purpose: 'Maximum petty cash for office supplies',
        };

        mockPrismaService.voucher.findFirst.mockResolvedValue(null);
        mockPrismaService.voucher.create.mockResolvedValue({
          ...mockVoucher,
          requestedAmount: new Decimal(50000),
          requester: mockEmployee,
        });

        const result = await service.create(mockEmployee.id, createDto);
        expect(result).toBeDefined();
      });

      it('should accept exactly 10 character purpose (minimum length)', async () => {
        const createDto = {
          requestedAmount: 25000,
          purpose: '1234567890', // Exactly 10 characters
        };

        mockPrismaService.voucher.findFirst.mockResolvedValue(null);
        mockPrismaService.voucher.create.mockResolvedValue({
          ...mockVoucher,
          purpose: createDto.purpose,
          requester: mockEmployee,
        });

        const result = await service.create(mockEmployee.id, createDto);
        expect(result).toBeDefined();
      });

      it('should reject 9 character purpose (below minimum)', async () => {
        const createDto = {
          requestedAmount: 25000,
          purpose: '123456789', // 9 characters
        };

        await expect(service.create(mockEmployee.id, createDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should reject 50001 PKR (above maximum)', async () => {
        const createDto = {
          requestedAmount: 50001,
          purpose: 'Slightly above maximum limit',
        };

        await expect(service.create(mockEmployee.id, createDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(mockEmployee.id, createDto)).rejects.toThrow('50000');
      });

      it('should accept 1 PKR (minimum positive)', async () => {
        const createDto = {
          requestedAmount: 1,
          purpose: 'Minimum petty cash for small item',
        };

        mockPrismaService.voucher.findFirst.mockResolvedValue(null);
        mockPrismaService.voucher.create.mockResolvedValue({
          ...mockVoucher,
          requestedAmount: new Decimal(1),
          requester: mockEmployee,
        });

        const result = await service.create(mockEmployee.id, createDto);
        expect(result).toBeDefined();
      });
    });

    describe('disburse - boundary values', () => {
      it('should allow disbursing exactly the requested amount', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.APPROVED,
          requestedAmount: new Decimal(40000),
        });
        mockPrismaService.voucher.update.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(40000),
          requester: mockEmployee,
        });

        const result = await service.disburse(mockVoucher.id, mockFinance, { amount: 40000 });
        expect(result.status).toBe(VoucherStatus.DISBURSED);
      });

      it('should allow disbursing 1 PKR less than requested', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.APPROVED,
          requestedAmount: new Decimal(40000),
        });
        mockPrismaService.voucher.update.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(39999),
          requester: mockEmployee,
        });

        const result = await service.disburse(mockVoucher.id, mockFinance, { amount: 39999 });
        expect(result.status).toBe(VoucherStatus.DISBURSED);
      });

      it('should reject disbursing 1 PKR more than requested', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.APPROVED,
          requestedAmount: new Decimal(40000),
        });

        await expect(
          service.disburse(mockVoucher.id, mockFinance, { amount: 40001 }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.disburse(mockVoucher.id, mockFinance, { amount: 40001 }),
        ).rejects.toThrow('cannot exceed requested amount');
      });
    });

    describe('linkExpense - edge cases', () => {
      it('should allow linking to OVERDUE voucher', async () => {
        mockPrismaService.voucher.findUnique
          .mockResolvedValueOnce({
            ...mockVoucher,
            status: VoucherStatus.OVERDUE,
            disbursedAmount: new Decimal(50000),
          })
          .mockResolvedValueOnce({
            ...mockVoucher,
            status: VoucherStatus.OVERDUE,
            requester: mockEmployee,
            expenses: [mockExpense],
          });
        mockPrismaService.expense.findUnique.mockResolvedValue({
          ...mockExpense,
          type: ExpenseType.PETTY_CASH,
        });
        mockPrismaService.expense.update.mockResolvedValue(mockExpense);
        mockPrismaService.voucher.update.mockResolvedValue(mockVoucher);

        const result = await service.linkExpense(mockVoucher.id, mockEmployee, {
          expenseId: mockExpense.id,
        });
        expect(result).toBeDefined();
      });

      it('should allow linking to PARTIALLY_SETTLED voucher', async () => {
        mockPrismaService.voucher.findUnique
          .mockResolvedValueOnce({
            ...mockVoucher,
            status: VoucherStatus.PARTIALLY_SETTLED,
            disbursedAmount: new Decimal(50000),
          })
          .mockResolvedValueOnce({
            ...mockVoucher,
            status: VoucherStatus.PARTIALLY_SETTLED,
            requester: mockEmployee,
            expenses: [mockExpense],
          });
        mockPrismaService.expense.findUnique.mockResolvedValue({
          ...mockExpense,
          type: ExpenseType.PETTY_CASH,
        });
        mockPrismaService.expense.update.mockResolvedValue(mockExpense);
        mockPrismaService.voucher.update.mockResolvedValue(mockVoucher);

        const result = await service.linkExpense(mockVoucher.id, mockEmployee, {
          expenseId: mockExpense.id,
        });
        expect(result).toBeDefined();
      });

      it('should reject linking to REQUESTED voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.REQUESTED,
        });

        await expect(
          service.linkExpense(mockVoucher.id, mockEmployee, { expenseId: mockExpense.id }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.linkExpense(mockVoucher.id, mockEmployee, { expenseId: mockExpense.id }),
        ).rejects.toThrow('must be disbursed before linking');
      });

      it('should reject linking to SETTLED voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.SETTLED,
        });

        await expect(
          service.linkExpense(mockVoucher.id, mockEmployee, { expenseId: mockExpense.id }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject linking non-existent expense', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
        });
        mockPrismaService.expense.findUnique.mockResolvedValue(null);

        await expect(
          service.linkExpense(mockVoucher.id, mockEmployee, { expenseId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('cancel - all statuses', () => {
      const statuses = [
        { status: VoucherStatus.REQUESTED, shouldSucceed: true },
        { status: VoucherStatus.APPROVED, shouldSucceed: true },
        { status: VoucherStatus.DISBURSED, shouldSucceed: false },
        { status: VoucherStatus.PARTIALLY_SETTLED, shouldSucceed: false },
        { status: VoucherStatus.SETTLED, shouldSucceed: false },
        { status: VoucherStatus.OVERDUE, shouldSucceed: false },
        { status: VoucherStatus.REJECTED, shouldSucceed: false },
      ];

      statuses.forEach(({ status, shouldSucceed }) => {
        it(`should ${shouldSucceed ? 'allow' : 'reject'} cancellation of ${status} voucher`, async () => {
          mockPrismaService.voucher.findUnique.mockResolvedValue({
            ...mockVoucher,
            status,
          });

          if (shouldSucceed) {
            mockPrismaService.voucher.update.mockResolvedValue({
              ...mockVoucher,
              status: VoucherStatus.REJECTED,
              notes: 'Cancelled by requester',
            });

            const result = await service.cancel(mockVoucher.id, mockEmployee);
            expect(result.status).toBe(VoucherStatus.REJECTED);
          } else {
            await expect(service.cancel(mockVoucher.id, mockEmployee)).rejects.toThrow(
              BadRequestException,
            );
          }
        });
      });
    });

    describe('approve - status validation', () => {
      const statuses = [
        { status: VoucherStatus.REQUESTED, shouldSucceed: true },
        { status: VoucherStatus.APPROVED, shouldSucceed: false },
        { status: VoucherStatus.REJECTED, shouldSucceed: false },
        { status: VoucherStatus.DISBURSED, shouldSucceed: false },
        { status: VoucherStatus.PARTIALLY_SETTLED, shouldSucceed: false },
        { status: VoucherStatus.SETTLED, shouldSucceed: false },
        { status: VoucherStatus.OVERDUE, shouldSucceed: false },
      ];

      statuses.forEach(({ status, shouldSucceed }) => {
        it(`should ${shouldSucceed ? 'allow' : 'reject'} approval of ${status} voucher`, async () => {
          mockPrismaService.voucher.findUnique.mockResolvedValue({
            ...mockVoucher,
            status,
          });

          if (shouldSucceed) {
            mockPrismaService.voucher.update.mockResolvedValue({
              ...mockVoucher,
              status: VoucherStatus.APPROVED,
              approvedBy: mockApprover.id,
              requester: mockEmployee,
            });

            const result = await service.approve(mockVoucher.id, mockApprover);
            expect(result.status).toBe(VoucherStatus.APPROVED);
          } else {
            await expect(service.approve(mockVoucher.id, mockApprover)).rejects.toThrow(
              BadRequestException,
            );
          }
        });
      });
    });

    describe('reject - status validation', () => {
      it('should reject already rejected voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.REJECTED,
        });

        await expect(
          service.reject(mockVoucher.id, mockApprover, { reason: 'Test reason' }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.reject(mockVoucher.id, mockApprover, { reason: 'Test reason' }),
        ).rejects.toThrow('Only requested vouchers can be rejected');
      });

      it('should reject disbursed voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          status: VoucherStatus.DISBURSED,
        });

        await expect(
          service.reject(mockVoucher.id, mockApprover, { reason: 'Test reason' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('disburse - status validation', () => {
      const statuses = [
        { status: VoucherStatus.APPROVED, shouldSucceed: true },
        { status: VoucherStatus.REQUESTED, shouldSucceed: false },
        { status: VoucherStatus.REJECTED, shouldSucceed: false },
        { status: VoucherStatus.DISBURSED, shouldSucceed: false },
        { status: VoucherStatus.SETTLED, shouldSucceed: false },
      ];

      statuses.forEach(({ status, shouldSucceed }) => {
        it(`should ${shouldSucceed ? 'allow' : 'reject'} disbursement of ${status} voucher`, async () => {
          mockPrismaService.voucher.findUnique.mockResolvedValue({
            ...mockVoucher,
            status,
            requestedAmount: new Decimal(50000),
          });

          if (shouldSucceed) {
            mockPrismaService.voucher.update.mockResolvedValue({
              ...mockVoucher,
              status: VoucherStatus.DISBURSED,
              disbursedBy: mockFinance.id,
              requester: mockEmployee,
            });

            const result = await service.disburse(mockVoucher.id, mockFinance, { amount: 40000 });
            expect(result.status).toBe(VoucherStatus.DISBURSED);
          } else {
            await expect(
              service.disburse(mockVoucher.id, mockFinance, { amount: 40000 }),
            ).rejects.toThrow(BadRequestException);
          }
        });
      });
    });

    describe('open voucher validation - all open statuses', () => {
      const openStatuses = [
        VoucherStatus.REQUESTED,
        VoucherStatus.APPROVED,
        VoucherStatus.DISBURSED,
        VoucherStatus.PARTIALLY_SETTLED,
        VoucherStatus.OVERDUE,
      ];

      openStatuses.forEach((status) => {
        it(`should block new voucher when user has ${status} voucher`, async () => {
          mockPrismaService.voucher.findFirst.mockResolvedValue({
            ...mockVoucher,
            voucherNumber: 'PC-2024-0001',
            status,
          });

          await expect(
            service.create(mockEmployee.id, {
              requestedAmount: 25000,
              purpose: 'Test purpose for validation',
            }),
          ).rejects.toThrow(BadRequestException);
          await expect(
            service.create(mockEmployee.id, {
              requestedAmount: 25000,
              purpose: 'Test purpose for validation',
            }),
          ).rejects.toThrow('already have an open petty cash voucher');
        });
      });

      const closedStatuses = [VoucherStatus.SETTLED, VoucherStatus.REJECTED];

      closedStatuses.forEach((status) => {
        it(`should allow new voucher when user only has ${status} voucher`, async () => {
          mockPrismaService.voucher.findFirst.mockResolvedValue(null); // No open voucher found
          mockPrismaService.voucher.create.mockResolvedValue({
            ...mockVoucher,
            requester: mockEmployee,
          });

          const result = await service.create(mockEmployee.id, {
            requestedAmount: 25000,
            purpose: 'Test purpose for closed voucher',
          });

          expect(result).toBeDefined();
        });
      });
    });
  });

  // ==================== ROLE-BASED ACCESS TESTS ====================

  describe('Role-Based Access Control', () => {
    describe('getPendingApproval - role restrictions', () => {
      it('should allow APPROVER role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getPendingApproval(mockApprover);
        expect(result).toBeDefined();
      });

      it('should allow FINANCE role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getPendingApproval(mockFinance);
        expect(result).toBeDefined();
      });

      it('should allow ADMIN role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getPendingApproval(mockAdmin);
        expect(result).toBeDefined();
      });

      it('should reject EMPLOYEE role', async () => {
        await expect(service.getPendingApproval(mockEmployee)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getOutstanding - role restrictions', () => {
      it('should allow FINANCE role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getOutstanding(mockFinance);
        expect(result).toBeDefined();
      });

      it('should allow ADMIN role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getOutstanding(mockAdmin);
        expect(result).toBeDefined();
      });

      it('should reject APPROVER role', async () => {
        await expect(service.getOutstanding(mockApprover)).rejects.toThrow(ForbiddenException);
      });

      it('should reject EMPLOYEE role', async () => {
        await expect(service.getOutstanding(mockEmployee)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getOverdue - role restrictions', () => {
      it('should allow FINANCE role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getOverdue(mockFinance);
        expect(result).toBeDefined();
      });

      it('should allow ADMIN role', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        const result = await service.getOverdue(mockAdmin);
        expect(result).toBeDefined();
      });

      it('should reject APPROVER role', async () => {
        await expect(service.getOverdue(mockApprover)).rejects.toThrow(ForbiddenException);
      });

      it('should reject EMPLOYEE role', async () => {
        await expect(service.getOverdue(mockEmployee)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('findAll - role-based filtering', () => {
      it('should filter by requesterId for EMPLOYEE', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockEmployee);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              requesterId: mockEmployee.id,
            }),
          }),
        );
      });

      it('should not filter by requesterId for FINANCE', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockFinance);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          }),
        );
      });

      it('should not filter by requesterId for ADMIN', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockAdmin);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          }),
        );
      });

      it('should not filter by requesterId for SUPER_APPROVER', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockSuperApprover);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          }),
        );
      });

      it('should not filter by requesterId for CEO', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockCeo);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          }),
        );
      });

      it('should filter by requesterId for APPROVER', async () => {
        mockPrismaService.voucher.findMany.mockResolvedValue([mockVoucher]);
        mockPrismaService.voucher.count.mockResolvedValue(1);
        mockPrismaService.voucher.groupBy.mockResolvedValue([]);

        await service.findAll(mockApprover);

        expect(mockPrismaService.voucher.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              requesterId: mockApprover.id,
            }),
          }),
        );
      });
    });

    describe('findOne - access control', () => {
      it('should allow owner to access', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          requester: mockEmployee,
          expenses: [],
        });

        const result = await service.findOne(mockVoucher.id, mockEmployee);
        expect(result).toBeDefined();
      });

      it('should allow FINANCE to access any voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          requester: mockEmployee,
          expenses: [],
        });

        const result = await service.findOne(mockVoucher.id, mockFinance);
        expect(result).toBeDefined();
      });

      it('should allow ADMIN to access any voucher', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          requester: mockEmployee,
          expenses: [],
        });

        const result = await service.findOne(mockVoucher.id, mockAdmin);
        expect(result).toBeDefined();
      });

      it('should reject non-owner EMPLOYEE', async () => {
        const otherEmployee = { ...mockEmployee, id: 'other-employee' };
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          requester: mockEmployee,
          expenses: [],
        });

        await expect(service.findOne(mockVoucher.id, otherEmployee)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should reject non-owner APPROVER', async () => {
        mockPrismaService.voucher.findUnique.mockResolvedValue({
          ...mockVoucher,
          requester: mockEmployee,
          expenses: [],
        });

        await expect(service.findOne(mockVoucher.id, mockApprover)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });
  });
});
