import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ExpenseStatus,
  ApprovalAction,
  RoleType,
  UserStatus,
  User,
  Expense,
  ApprovalTier,
} from '@prisma/client';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('ApprovalsService', () => {
  let service: ApprovalsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    approvalHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    approvalTier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    approvalDelegation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockApprover: User = {
    id: 'approver-id',
    email: 'approver@tekcellent.com',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'Approver',
    employeeId: null,
    phone: null,
    role: RoleType.APPROVER,
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

  const mockTier1: ApprovalTier = {
    id: 'tier-1',
    name: 'Tier 1 - Manager',
    tierOrder: 1,
    minAmount: new Decimal(0),
    maxAmount: new Decimal(50000),
    approverRole: RoleType.APPROVER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTier2: ApprovalTier = {
    id: 'tier-2',
    name: 'Tier 2 - Finance',
    tierOrder: 2,
    minAmount: new Decimal(10000),
    maxAmount: null,
    approverRole: RoleType.FINANCE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExpense: Expense = {
    id: 'expense-id',
    expenseNumber: 'EXP-001',
    type: 'STANDARD' as any,
    submitterId: 'employee-id',
    submittedAt: new Date(),
    vendorId: null,
    vendorName: null,
    expenseDate: new Date(),
    description: 'Test Expense',
    receiptNumber: null,
    invoiceNumber: null,
    currency: 'PKR',
    amount: new Decimal(25000),
    taxType: 'NONE' as any,
    taxAmount: new Decimal(0),
    totalAmount: new Decimal(25000),
    exchangeRate: null,
    amountInPKR: new Decimal(25000),
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
    status: ExpenseStatus.SUBMITTED,
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
      providers: [ApprovalsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default transaction behavior
    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      // Handle array of operations
      const results = [];
      for (const operation of callback) {
        results.push(await operation);
      }
      return results;
    });
  });

  describe('getPendingApprovals', () => {
    it('should return expenses pending approval for authorized approver', async () => {
      const financeUser = { ...mockApprover, role: RoleType.FINANCE };
      mockPrismaService.user.findUnique.mockResolvedValue(financeUser);

      // Mock pending expenses
      mockPrismaService.expense.findMany.mockResolvedValue([
        {
          ...mockExpense,
          amount: new Decimal(15000),
          amountInPKR: new Decimal(15000),
          approvalHistory: [],
        },
      ]);

      // Mock tier lookup
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1, mockTier2]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(financeUser, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
    });

    it('should filter out expenses that do not require user approval', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(mockApprover, {});

      expect(result.data).toEqual([]);
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.expense.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(mockApprover, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('approve', () => {
    it('should approve expense at first tier', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany
        .mockResolvedValueOnce([mockTier1]) // For getRequiredApprovalTier
        .mockResolvedValueOnce([mockTier1]); // For getNextApprovalTier
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);
      mockPrismaService.approvalTier.findFirst.mockResolvedValue(null); // No next tier

      const result = await service.approve(mockApprover, {
        expenseId: 'expense-id',
        comments: 'Approved',
      });

      expect(result.message).toContain('fully approved');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should progress to next tier when multiple tiers required', async () => {
      const highAmountExpense = {
        ...mockExpense,
        amount: new Decimal(100000),
        amountInPKR: new Decimal(100000),
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(highAmountExpense);
      mockPrismaService.approvalTier.findMany
        .mockResolvedValueOnce([mockTier1, mockTier2])
        .mockResolvedValueOnce([mockTier1, mockTier2]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);
      mockPrismaService.approvalTier.findFirst.mockResolvedValue(mockTier2);

      const result = await service.approve(mockApprover, { expenseId: 'expense-id' });

      expect(result.message).toContain('tier 1');
      expect(result.message).toContain('tier 2');
      expect(result.nextTier).toBe(mockTier2.name);
    });

    it('should reject approval from unauthorized user', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee); // Wrong role
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      await expect(service.approve(mockEmployee, { expenseId: 'expense-id' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject approval of non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.approve(mockApprover, { expenseId: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject approval of expense in wrong status', async () => {
      const approvedExpense = {
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(approvedExpense);

      await expect(service.approve(mockApprover, { expenseId: 'expense-id' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow approval through delegation', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      const delegation = {
        id: 'delegation-id',
        fromUserId: 'original-approver-id',
        toUserId: mockEmployee.id,
        startDate: new Date(Date.now() - 86400000), // Yesterday
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        reason: 'Vacation',
        isActive: true,
        createdAt: new Date(),
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue({
        ...delegation,
        fromUser: mockApprover,
      });
      mockPrismaService.approvalTier.findFirst.mockResolvedValue(null);

      const result = await service.approve(mockEmployee, { expenseId: 'expense-id' });

      expect(result.message).toContain('approved');
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple expenses', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);
      mockPrismaService.approvalTier.findFirst.mockResolvedValue(null);

      const result = await service.bulkApprove(mockApprover, {
        expenseIds: ['expense-1', 'expense-2'],
        comments: 'Bulk approved',
      });

      expect(result.summary.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures in bulk approval', async () => {
      mockPrismaService.expense.findUnique
        .mockResolvedValueOnce({
          ...mockExpense,
          approvalHistory: [],
          submitter: mockEmployee,
        })
        .mockResolvedValueOnce(null); // Second expense not found

      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);
      mockPrismaService.approvalTier.findFirst.mockResolvedValue(null);

      const result = await service.bulkApprove(mockApprover, {
        expenseIds: ['expense-1', 'expense-2'],
      });

      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('reject', () => {
    it('should reject expense with reason', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      const result = await service.reject(mockApprover, {
        expenseId: 'expense-id',
        reason: 'Missing receipt',
      });

      expect(result.message).toContain('rejected');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should require rejection reason', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      await expect(
        service.reject(mockApprover, { expenseId: 'expense-id', reason: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject from unauthorized user', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      await expect(
        service.reject(mockEmployee, { expenseId: 'expense-id', reason: 'No reason' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('requestClarification', () => {
    it('should request clarification with question', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      const result = await service.requestClarification(mockApprover, {
        expenseId: 'expense-id',
        question: 'Please provide more details',
      });

      expect(result.message).toContain('Clarification requested');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should require clarification question', async () => {
      const expenseWithHistory = {
        ...mockExpense,
        approvalHistory: [],
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(expenseWithHistory);
      mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1]);
      mockPrismaService.approvalHistory.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockApprover);
      mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

      await expect(
        service.requestClarification(mockApprover, { expenseId: 'expense-id', question: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resubmitExpense', () => {
    it('should resubmit rejected expense', async () => {
      const rejectedExpense = {
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
        rejectionReason: 'Missing receipt',
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(rejectedExpense);

      const result = await service.resubmitExpense('expense-id', mockEmployee.id, 'Receipt added');

      expect(result.message).toContain('resubmitted');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should resubmit expense with clarification requested', async () => {
      const clarificationExpense = {
        ...mockExpense,
        status: ExpenseStatus.CLARIFICATION_REQUESTED,
        clarificationNote: 'Need more details',
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(clarificationExpense);

      const result = await service.resubmitExpense('expense-id', mockEmployee.id, 'Details added');

      expect(result.message).toContain('resubmitted');
    });

    it('should reject resubmit from non-owner', async () => {
      const rejectedExpense = {
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(rejectedExpense);

      await expect(service.resubmitExpense('expense-id', 'other-user-id', 'Note')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject resubmit of approved expense', async () => {
      const approvedExpense = {
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
        submitter: mockEmployee,
      };

      mockPrismaService.expense.findUnique.mockResolvedValue(approvedExpense);

      await expect(service.resubmitExpense('expense-id', mockEmployee.id, 'Note')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for user', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          expenseId: 'expense-1',
          approverId: mockApprover.id,
          action: ApprovalAction.APPROVED,
          tierLevel: 1,
          comment: 'Approved',
          wasEscalated: false,
          escalatedFromId: null,
          delegatedFromId: null,
          createdAt: new Date(),
          expense: {
            ...mockExpense,
            submitter: { id: mockEmployee.id, firstName: 'Test', lastName: 'Employee' },
          },
        },
      ];

      mockPrismaService.approvalHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getApprovalHistory(mockApprover);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(ApprovalAction.APPROVED);
    });
  });

  describe('getExpenseApprovalHistory', () => {
    it('should return timeline for specific expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      const mockHistory = [
        {
          id: 'history-1',
          expenseId: 'expense-id',
          approverId: mockApprover.id,
          action: ApprovalAction.APPROVED,
          tierLevel: 1,
          comment: 'Looks good',
          wasEscalated: false,
          delegatedFromId: null,
          createdAt: new Date(),
          approver: {
            id: mockApprover.id,
            firstName: mockApprover.firstName,
            lastName: mockApprover.lastName,
            role: mockApprover.role,
          },
        },
      ];

      mockPrismaService.approvalHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getExpenseApprovalHistory('expense-id');

      expect(result.expenseId).toBe('expense-id');
      expect(result.currentStatus).toBe(ExpenseStatus.SUBMITTED);
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].action).toBe(ApprovalAction.APPROVED);
    });

    it('should throw error for non-existent expense', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(service.getExpenseApprovalHistory('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Delegation Management', () => {
    describe('getDelegations', () => {
      it('should return active delegations for user', async () => {
        const mockDelegations = [
          {
            id: 'delegation-1',
            fromUserId: mockApprover.id,
            toUserId: mockEmployee.id,
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(Date.now() + 86400000),
            reason: 'Vacation',
            isActive: true,
            createdAt: new Date(),
            fromUser: {
              id: mockApprover.id,
              firstName: mockApprover.firstName,
              lastName: mockApprover.lastName,
              role: mockApprover.role,
            },
            toUser: {
              id: mockEmployee.id,
              firstName: mockEmployee.firstName,
              lastName: mockEmployee.lastName,
              role: mockEmployee.role,
            },
          },
        ];

        mockPrismaService.approvalDelegation.findMany.mockResolvedValue(mockDelegations);

        const result = await service.getDelegations(mockApprover.id);

        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe('Vacation');
      });
    });

    describe('createDelegation', () => {
      it('should create delegation with valid dates', async () => {
        const delegate = { ...mockEmployee, id: 'delegate-id' };
        mockPrismaService.user.findUnique.mockResolvedValue(delegate);
        mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(null);

        const newDelegation = {
          id: 'new-delegation',
          fromUserId: mockApprover.id,
          toUserId: delegate.id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-15'),
          reason: 'Vacation',
          isActive: true,
          createdAt: new Date(),
        };

        mockPrismaService.approvalDelegation.create.mockResolvedValue(newDelegation);

        const result = await service.createDelegation(mockApprover.id, {
          delegateId: delegate.id,
          startDate: '2024-03-01',
          endDate: '2024-03-15',
          reason: 'Vacation',
        });

        expect(result.fromUserId).toBe(mockApprover.id);
        expect(result.toUserId).toBe(delegate.id);
      });

      it('should reject delegation with invalid dates', async () => {
        await expect(
          service.createDelegation(mockApprover.id, {
            delegateId: 'delegate-id',
            startDate: '2024-03-15',
            endDate: '2024-03-01', // End before start
            reason: 'Vacation',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject delegation to non-existent user', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.createDelegation(mockApprover.id, {
            delegateId: 'non-existent',
            startDate: '2024-03-01',
            endDate: '2024-03-15',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject overlapping delegations', async () => {
        const delegate = { ...mockEmployee, id: 'delegate-id' };
        mockPrismaService.user.findUnique.mockResolvedValue(delegate);

        // Existing delegation
        const existingDelegation = {
          id: 'existing',
          fromUserId: mockApprover.id,
          toUserId: 'other-delegate',
          startDate: new Date('2024-03-05'),
          endDate: new Date('2024-03-20'),
          isActive: true,
        };

        mockPrismaService.approvalDelegation.findFirst.mockResolvedValue(existingDelegation);

        await expect(
          service.createDelegation(mockApprover.id, {
            delegateId: delegate.id,
            startDate: '2024-03-01',
            endDate: '2024-03-10', // Overlaps with existing
          }),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('revokeDelegation', () => {
      it('should revoke own delegation', async () => {
        const delegation = {
          id: 'delegation-id',
          fromUserId: mockApprover.id,
          toUserId: mockEmployee.id,
          startDate: new Date(),
          endDate: new Date(),
          reason: null,
          isActive: true,
          createdAt: new Date(),
        };

        mockPrismaService.approvalDelegation.findUnique.mockResolvedValue(delegation);
        mockPrismaService.approvalDelegation.update.mockResolvedValue({
          ...delegation,
          isActive: false,
        });

        const result = await service.revokeDelegation(mockApprover.id, {
          delegationId: 'delegation-id',
        });

        expect(result.isActive).toBe(false);
      });

      it('should reject revoking other user delegation', async () => {
        const delegation = {
          id: 'delegation-id',
          fromUserId: 'other-user-id',
          toUserId: mockEmployee.id,
          startDate: new Date(),
          endDate: new Date(),
          reason: null,
          isActive: true,
          createdAt: new Date(),
        };

        mockPrismaService.approvalDelegation.findUnique.mockResolvedValue(delegation);

        await expect(
          service.revokeDelegation(mockApprover.id, { delegationId: 'delegation-id' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw error for non-existent delegation', async () => {
        mockPrismaService.approvalDelegation.findUnique.mockResolvedValue(null);

        await expect(
          service.revokeDelegation(mockApprover.id, { delegationId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Approval Tier Management', () => {
    describe('getApprovalTiers', () => {
      it('should return all active tiers ordered by tierOrder', async () => {
        mockPrismaService.approvalTier.findMany.mockResolvedValue([mockTier1, mockTier2]);

        const result = await service.getApprovalTiers();

        expect(result).toHaveLength(2);
        expect(result[0].tierOrder).toBe(1);
      });
    });

    describe('createApprovalTier', () => {
      it('should create approval tier', async () => {
        const newTier = {
          id: 'new-tier',
          name: 'Tier 3',
          tierOrder: 3,
          minAmount: new Decimal(50000),
          maxAmount: null,
          approverRole: RoleType.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrismaService.approvalTier.create.mockResolvedValue(newTier);

        const result = await service.createApprovalTier({
          name: 'Tier 3',
          tierOrder: 3,
          minAmount: 50000,
          approverRole: RoleType.ADMIN,
        });

        expect(result.name).toBe('Tier 3');
        expect(result.tierOrder).toBe(3);
      });
    });

    describe('updateApprovalTier', () => {
      it('should update approval tier', async () => {
        const updatedTier = { ...mockTier1, name: 'Updated Tier' };
        mockPrismaService.approvalTier.update.mockResolvedValue(updatedTier);

        const result = await service.updateApprovalTier('tier-1', { name: 'Updated Tier' });

        expect(result.name).toBe('Updated Tier');
      });
    });

    describe('deleteApprovalTier', () => {
      it('should soft delete approval tier', async () => {
        const deletedTier = { ...mockTier1, isActive: false };
        mockPrismaService.approvalTier.update.mockResolvedValue(deletedTier);

        const result = await service.deleteApprovalTier('tier-1');

        expect(result.isActive).toBe(false);
      });
    });
  });
});
