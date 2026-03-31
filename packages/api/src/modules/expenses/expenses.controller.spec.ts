import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { RoleType, UserStatus } from '@prisma/client';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@tekcellent.com',
    role: RoleType.EMPLOYEE,
    status: UserStatus.ACTIVE,
  } as any;

  const mockReq = { user: mockUser } as any;

  beforeEach(async () => {
    const mockExpensesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      submit: jest.fn(),
      resubmit: jest.fn(),
      withdraw: jest.fn(),
      bulkSubmit: jest.fn(),
      bulkDelete: jest.fn(),
      getApprovals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: mockExpensesService }],
    }).compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get(ExpensesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to expensesService.create with user id', async () => {
      const dto = { title: 'Lunch', amount: 25.0, categoryId: 'cat-1' };
      const expected = { id: 'exp-1', ...dto };
      service.create.mockResolvedValue(expected as any);

      const result = await controller.create(mockReq, dto as any);

      expect(result).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findAll', () => {
    it('should delegate to expensesService.findAll with user and filters', async () => {
      const filters = { page: 1, limit: 10 };
      const expected = { data: [], meta: { pagination: { total: 0 } } };
      service.findAll.mockResolvedValue(expected as any);

      const result = await controller.findAll(mockReq, filters as any);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(mockUser, filters);
    });
  });

  describe('findOne', () => {
    it('should delegate to expensesService.findOne with id and user', async () => {
      const expected = { id: 'exp-1', title: 'Lunch' };
      service.findOne.mockResolvedValue(expected as any);

      const result = await controller.findOne(mockReq, 'exp-1');

      expect(result).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith('exp-1', mockUser);
    });
  });

  describe('update', () => {
    it('should delegate to expensesService.update with id, user, and dto', async () => {
      const dto = { title: 'Updated Lunch' };
      const expected = { id: 'exp-1', title: 'Updated Lunch' };
      service.update.mockResolvedValue(expected as any);

      const result = await controller.update(mockReq, 'exp-1', dto as any);

      expect(result).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith('exp-1', mockUser, dto);
    });
  });

  describe('remove', () => {
    it('should delegate to expensesService.remove with id and user', async () => {
      const expected = { id: 'exp-1', deleted: true };
      service.remove.mockResolvedValue(expected as any);

      const result = await controller.remove(mockReq, 'exp-1');

      expect(result).toEqual(expected);
      expect(service.remove).toHaveBeenCalledWith('exp-1', mockUser);
    });
  });

  describe('submit', () => {
    it('should delegate to expensesService.submit with id and user', async () => {
      const expected = { id: 'exp-1', status: 'SUBMITTED' };
      service.submit.mockResolvedValue(expected as any);

      const result = await controller.submit(mockReq, 'exp-1');

      expect(result).toEqual(expected);
      expect(service.submit).toHaveBeenCalledWith('exp-1', mockUser);
    });
  });
});
