import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { RoleType, UserStatus } from '@prisma/client';

describe('ApprovalsController', () => {
  let controller: ApprovalsController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;

  const mockUser = {
    id: 'approver-1',
    email: 'approver@tekcellent.com',
    role: RoleType.APPROVER,
    status: UserStatus.ACTIVE,
  } as any;

  const mockReq = { user: mockUser } as any;

  beforeEach(async () => {
    const mockApprovalsService = {
      getPendingApprovals: jest.fn(),
      getApprovalHistory: jest.fn(),
      getExpenseApprovalHistory: jest.fn(),
      approve: jest.fn(),
      bulkApprove: jest.fn(),
      reject: jest.fn(),
      requestClarification: jest.fn(),
      getDelegations: jest.fn(),
      createDelegation: jest.fn(),
      revokeDelegation: jest.fn(),
      getApprovalTiers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalsController],
      providers: [{ provide: ApprovalsService, useValue: mockApprovalsService }],
    }).compile();

    controller = module.get<ApprovalsController>(ApprovalsController);
    service = module.get(ApprovalsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPending', () => {
    it('should delegate to approvalsService.getPendingApprovals with user and pagination', async () => {
      const expected = { data: [], meta: { pagination: { total: 0 } } };
      service.getPendingApprovals.mockResolvedValue(expected as any);

      const result = await controller.getPending(mockReq, 1, 10);

      expect(result).toEqual(expected);
      expect(service.getPendingApprovals).toHaveBeenCalledWith(mockUser, { page: 1, limit: 10 });
    });
  });

  describe('approve', () => {
    it('should delegate to approvalsService.approve with user and dto', async () => {
      const dto = { expenseId: 'exp-1', comments: 'Looks good' };
      const expected = { message: 'Expense approved' };
      service.approve.mockResolvedValue(expected as any);

      const result = await controller.approve(mockReq, dto as any);

      expect(result).toEqual(expected);
      expect(service.approve).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('reject', () => {
    it('should delegate to approvalsService.reject with user and dto', async () => {
      const dto = { expenseId: 'exp-1', reason: 'Missing receipt' };
      const expected = { message: 'Expense rejected' };
      service.reject.mockResolvedValue(expected as any);

      const result = await controller.reject(mockReq, dto as any);

      expect(result).toEqual(expected);
      expect(service.reject).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('requestClarification', () => {
    it('should delegate to approvalsService.requestClarification with user and dto', async () => {
      const dto = { expenseId: 'exp-1', question: 'What was this for?' };
      const expected = { message: 'Clarification requested' };
      service.requestClarification.mockResolvedValue(expected as any);

      const result = await controller.requestClarification(mockReq, dto as any);

      expect(result).toEqual(expected);
      expect(service.requestClarification).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('getHistory', () => {
    it('should delegate to approvalsService.getApprovalHistory with user', async () => {
      const expected = [{ id: 'history-1', action: 'APPROVED' }];
      service.getApprovalHistory.mockResolvedValue(expected as any);

      const result = await controller.getHistory(mockReq);

      expect(result).toEqual(expected);
      expect(service.getApprovalHistory).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getApprovalTiers', () => {
    it('should delegate to approvalsService.getApprovalTiers', async () => {
      const expected = [{ id: 'tier-1', minAmount: 0, maxAmount: 50000 }];
      service.getApprovalTiers.mockResolvedValue(expected as any);

      const result = await controller.getApprovalTiers();

      expect(result).toEqual(expected);
      expect(service.getApprovalTiers).toHaveBeenCalled();
    });
  });
});
