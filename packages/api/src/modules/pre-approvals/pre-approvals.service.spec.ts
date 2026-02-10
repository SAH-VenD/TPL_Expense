import { Test, TestingModule } from '@nestjs/testing';
import { PreApprovalsService } from './pre-approvals.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PreApprovalStatus, RoleType, UserStatus, User } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PreApprovalsService', () => {
  let service: PreApprovalsService;

  const mockPrismaService = {
    preApproval: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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
    managerId: 'manager-id',
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

  const mockApprover: User = {
    ...mockEmployee,
    id: 'approver-id',
    email: 'approver@tekcellent.com',
    role: RoleType.APPROVER,
  };

  const mockPreApproval = {
    id: 'pa-id',
    preApprovalNumber: 'PA-1234567890-ABCDE',
    requesterId: 'employee-id',
    categoryId: 'cat-id',
    description: 'Business trip to Dubai for client meeting',
    estimatedAmount: new Decimal(150000),
    purpose: 'Business trip to Dubai for client meeting',
    status: PreApprovalStatus.PENDING,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    approverId: null,
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createDto = {
    categoryId: 'cat-id',
    estimatedAmount: 150000,
    purpose: 'Business trip to Dubai for client meeting',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreApprovalsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PreApprovalsService>(PreApprovalsService);

    jest.clearAllMocks();
  });

  // ==================== CREATE ====================

  describe('create', () => {
    it('should create a pre-approval with PENDING status', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      const result = await service.create(mockEmployee.id, createDto);

      expect(result.status).toBe(PreApprovalStatus.PENDING);
      expect(mockPrismaService.preApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requesterId: mockEmployee.id,
            categoryId: createDto.categoryId,
            estimatedAmount: createDto.estimatedAmount,
            status: PreApprovalStatus.PENDING,
          }),
        }),
      );
    });

    it('should generate a unique pre-approval number starting with PA-', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      await service.create(mockEmployee.id, createDto);

      expect(mockPrismaService.preApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preApprovalNumber: expect.stringMatching(/^PA-/),
          }),
        }),
      );
    });

    it('should set default 30-day expiry when expiresAt not provided', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      const now = Date.now();
      await service.create(mockEmployee.id, createDto);

      const createCall = mockPrismaService.preApproval.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;

      // Should be approximately 30 days from now (within 5 seconds tolerance)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + thirtyDaysMs - 5000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(now + thirtyDaysMs + 5000);
    });

    it('should use provided expiresAt when specified', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      const customExpiry = '2026-06-15';
      await service.create(mockEmployee.id, { ...createDto, expiresAt: customExpiry });

      expect(mockPrismaService.preApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: new Date(customExpiry),
          }),
        }),
      );
    });

    it('should use purpose as description', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      await service.create(mockEmployee.id, createDto);

      expect(mockPrismaService.preApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: createDto.purpose,
            purpose: createDto.purpose,
          }),
        }),
      );
    });

    it('should use default description when purpose is not provided', async () => {
      mockPrismaService.preApproval.create.mockResolvedValue(mockPreApproval);

      await service.create(mockEmployee.id, {
        ...createDto,
        purpose: undefined as any,
      });

      expect(mockPrismaService.preApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Pre-approval request',
          }),
        }),
      );
    });
  });

  // ==================== FIND ALL ====================

  describe('findAll', () => {
    it('should return own pre-approvals for EMPLOYEE', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      const result = await service.findAll(mockEmployee);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterId: mockEmployee.id,
          }),
        }),
      );
    });

    it('should return all pre-approvals for ADMIN', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      await service.findAll(mockAdmin);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            requesterId: expect.any(String),
          }),
        }),
      );
    });

    it('should return all pre-approvals for FINANCE', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      await service.findAll(mockFinance);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            requesterId: expect.any(String),
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      await service.findAll(mockEmployee, PreApprovalStatus.PENDING);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PreApprovalStatus.PENDING,
          }),
        }),
      );
    });

    it('should not filter by status when not provided', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      await service.findAll(mockEmployee);

      const callArgs = mockPrismaService.preApproval.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBeUndefined();
    });

    it('should include requester, category, and approver', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([]);

      await service.findAll(mockEmployee);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            requester: expect.any(Object),
            category: true,
            approver: expect.any(Object),
          }),
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([]);

      await service.findAll(mockEmployee);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ==================== GET PENDING ====================

  describe('getPending', () => {
    it('should return PENDING pre-approvals for managed employees', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([mockPreApproval]);

      const result = await service.getPending(mockApprover);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PreApprovalStatus.PENDING,
            requester: {
              managerId: mockApprover.id,
            },
          }),
        }),
      );
    });

    it('should include requester and category', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([]);

      await service.getPending(mockApprover);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            requester: expect.any(Object),
            category: true,
          }),
        }),
      );
    });

    it('should order by createdAt asc (oldest first)', async () => {
      mockPrismaService.preApproval.findMany.mockResolvedValue([]);

      await service.getPending(mockApprover);

      expect(mockPrismaService.preApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  // ==================== FIND ONE ====================

  describe('findOne', () => {
    const preApprovalWithIncludes = {
      ...mockPreApproval,
      requester: { id: 'employee-id', firstName: 'Test', lastName: 'Employee', email: 'e@t.com' },
      category: { id: 'cat-id', name: 'Travel' },
      approver: null,
      expenses: [],
    };

    it('should return pre-approval for owner', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(preApprovalWithIncludes);

      const result = await service.findOne('pa-id', mockEmployee);

      expect(result).toBeDefined();
      expect(result.id).toBe('pa-id');
    });

    it('should return pre-approval for ADMIN', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(preApprovalWithIncludes);

      const result = await service.findOne('pa-id', mockAdmin);

      expect(result).toBeDefined();
    });

    it('should return pre-approval for FINANCE', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(preApprovalWithIncludes);

      const result = await service.findOne('pa-id', mockFinance);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(preApprovalWithIncludes);

      await expect(service.findOne('pa-id', mockApprover)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne('pa-id', mockApprover)).rejects.toThrow(
        'do not have access',
      );
    });

    it('should throw NotFoundException for non-existent pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockEmployee)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== APPROVE ====================

  describe('approve', () => {
    it('should approve a PENDING pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.PENDING,
      });
      mockPrismaService.preApproval.update.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.APPROVED,
        approverId: mockApprover.id,
        approvedAt: new Date(),
      });

      const result = await service.approve('pa-id', mockApprover);

      expect(result.status).toBe(PreApprovalStatus.APPROVED);
      expect(result.approverId).toBe(mockApprover.id);
      expect(result.approvedAt).toBeDefined();
      expect(mockPrismaService.preApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pa-id' },
          data: expect.objectContaining({
            status: PreApprovalStatus.APPROVED,
            approverId: mockApprover.id,
            approvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(null);

      await expect(service.approve('non-existent', mockApprover)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for APPROVED pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.APPROVED,
      });

      await expect(service.approve('pa-id', mockApprover)).rejects.toThrow(BadRequestException);
      await expect(service.approve('pa-id', mockApprover)).rejects.toThrow(
        'Only pending pre-approvals can be approved',
      );
    });

    it('should throw BadRequestException for REJECTED pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.REJECTED,
      });

      await expect(service.approve('pa-id', mockApprover)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for EXPIRED pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.EXPIRED,
      });

      await expect(service.approve('pa-id', mockApprover)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== REJECT ====================

  describe('reject', () => {
    it('should reject a PENDING pre-approval with reason', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.PENDING,
      });
      mockPrismaService.preApproval.update.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.REJECTED,
        approverId: mockApprover.id,
        rejectedAt: new Date(),
        rejectionReason: 'Budget exceeded',
      });

      const result = await service.reject('pa-id', mockApprover, 'Budget exceeded');

      expect(result.status).toBe(PreApprovalStatus.REJECTED);
      expect(result.rejectedAt).toBeDefined();
      expect(result.rejectionReason).toBe('Budget exceeded');
      expect(mockPrismaService.preApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pa-id' },
          data: expect.objectContaining({
            status: PreApprovalStatus.REJECTED,
            approverId: mockApprover.id,
            rejectedAt: expect.any(Date),
            rejectionReason: 'Budget exceeded',
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue(null);

      await expect(service.reject('non-existent', mockApprover, 'Reason')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-PENDING pre-approval', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.APPROVED,
      });

      await expect(service.reject('pa-id', mockApprover, 'Reason')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject('pa-id', mockApprover, 'Reason')).rejects.toThrow(
        'Only pending pre-approvals can be rejected',
      );
    });

    it('should throw BadRequestException when reason is empty', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.PENDING,
      });

      await expect(service.reject('pa-id', mockApprover, '')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject('pa-id', mockApprover, '')).rejects.toThrow(
        'Rejection reason is required',
      );
    });

    it('should throw BadRequestException when reason is falsy (undefined/null)', async () => {
      mockPrismaService.preApproval.findUnique.mockResolvedValue({
        ...mockPreApproval,
        status: PreApprovalStatus.PENDING,
      });

      await expect(service.reject('pa-id', mockApprover, undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== GET VALID PRE-APPROVAL ====================

  describe('getValidPreApproval', () => {
    it('should return APPROVED and non-expired pre-approval', async () => {
      const validPreApproval = {
        ...mockPreApproval,
        status: PreApprovalStatus.APPROVED,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };
      mockPrismaService.preApproval.findFirst.mockResolvedValue(validPreApproval);

      const result = await service.getValidPreApproval('employee-id', 'cat-id');

      expect(result).toBeDefined();
      expect(result!.status).toBe(PreApprovalStatus.APPROVED);
      expect(mockPrismaService.preApproval.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterId: 'employee-id',
            categoryId: 'cat-id',
            status: PreApprovalStatus.APPROVED,
            expiresAt: { gte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should return null when no valid pre-approval exists', async () => {
      mockPrismaService.preApproval.findFirst.mockResolvedValue(null);

      const result = await service.getValidPreApproval('employee-id', 'cat-id');

      expect(result).toBeNull();
    });

    it('should check that expiresAt is in the future', async () => {
      mockPrismaService.preApproval.findFirst.mockResolvedValue(null);

      await service.getValidPreApproval('employee-id', 'cat-id');

      const callArgs = mockPrismaService.preApproval.findFirst.mock.calls[0][0];
      const expiresAtFilter = callArgs.where.expiresAt.gte;
      // The date should be approximately now
      expect(expiresAtFilter.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      expect(expiresAtFilter.getTime()).toBeGreaterThanOrEqual(Date.now() - 5000);
    });

    it('should filter by both userId and categoryId', async () => {
      mockPrismaService.preApproval.findFirst.mockResolvedValue(null);

      await service.getValidPreApproval('user-123', 'cat-456');

      expect(mockPrismaService.preApproval.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterId: 'user-123',
            categoryId: 'cat-456',
          }),
        }),
      );
    });
  });
});
