import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CostCentersService', () => {
  let service: CostCentersService;

  const mockPrismaService = {
    costCenter: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostCentersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CostCentersService>(CostCentersService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a cost center with provided code', async () => {
      const dto = { name: 'Engineering', code: 'CC-ENG', description: 'Engineering dept' };
      const expectedCostCenter = { id: 'cc-1', ...dto };
      mockPrismaService.costCenter.create.mockResolvedValue(expectedCostCenter);

      const result = await service.create(dto);

      expect(result).toEqual(expectedCostCenter);
      expect(mockPrismaService.costCenter.create).toHaveBeenCalledWith({
        data: {
          name: 'Engineering',
          code: 'CC-ENG',
          description: 'Engineering dept',
        },
      });
    });

    it('should auto-generate code when not provided', async () => {
      const dto = { name: 'Marketing' };
      mockPrismaService.costCenter.create.mockResolvedValue({ id: 'cc-1' });

      await service.create(dto);

      const createCall = mockPrismaService.costCenter.create.mock.calls[0][0];
      expect(createCall.data.code).toBe('CC-MARKETING');
    });

    it('should replace spaces with hyphens in auto-generated code', async () => {
      const dto = { name: 'Human Resources' };
      mockPrismaService.costCenter.create.mockResolvedValue({ id: 'cc-1' });

      await service.create(dto);

      const createCall = mockPrismaService.costCenter.create.mock.calls[0][0];
      expect(createCall.data.code).toBe('CC-HUMAN-RESOURCES');
    });

    it('should truncate auto-generated code to 15 characters after prefix', async () => {
      const dto = { name: 'Very Long Department Name That Exceeds Limit' };
      mockPrismaService.costCenter.create.mockResolvedValue({ id: 'cc-1' });

      await service.create(dto);

      const createCall = mockPrismaService.costCenter.create.mock.calls[0][0];
      // "CC-" prefix + up to 15 characters from the name
      const codeAfterPrefix = createCall.data.code.slice(3);
      expect(codeAfterPrefix.length).toBeLessThanOrEqual(15);
    });
  });

  describe('findAll', () => {
    it('should return only active cost centers ordered by name', async () => {
      const costCenters = [
        { id: 'cc-1', name: 'Alpha', isActive: true },
        { id: 'cc-2', name: 'Beta', isActive: true },
      ];
      mockPrismaService.costCenter.findMany.mockResolvedValue(costCenters);

      const result = await service.findAll();

      expect(result).toEqual(costCenters);
      expect(mockPrismaService.costCenter.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no active cost centers exist', async () => {
      mockPrismaService.costCenter.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a cost center by id', async () => {
      const costCenter = { id: 'cc-1', name: 'Engineering', isActive: true };
      mockPrismaService.costCenter.findUnique.mockResolvedValue(costCenter);

      const result = await service.findOne('cc-1');

      expect(result).toEqual(costCenter);
      expect(mockPrismaService.costCenter.findUnique).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
      });
    });

    it('should throw NotFoundException when cost center does not exist', async () => {
      mockPrismaService.costCenter.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Cost Center with ID nonexistent not found',
      );
    });
  });

  describe('update', () => {
    it('should update an existing cost center', async () => {
      const existing = { id: 'cc-1', name: 'Old Name', isActive: true };
      const updated = { id: 'cc-1', name: 'New Name', isActive: true };
      mockPrismaService.costCenter.findUnique.mockResolvedValue(existing);
      mockPrismaService.costCenter.update.mockResolvedValue(updated);

      const result = await service.update('cc-1', { name: 'New Name' });

      expect(result).toEqual(updated);
      expect(mockPrismaService.costCenter.update).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException when updating non-existent cost center', async () => {
      mockPrismaService.costCenter.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete by setting isActive to false', async () => {
      const existing = { id: 'cc-1', name: 'Engineering', isActive: true };
      const softDeleted = { id: 'cc-1', name: 'Engineering', isActive: false };
      mockPrismaService.costCenter.findUnique.mockResolvedValue(existing);
      mockPrismaService.costCenter.update.mockResolvedValue(softDeleted);

      const result = await service.remove('cc-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.costCenter.update).toHaveBeenCalledWith({
        where: { id: 'cc-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when removing non-existent cost center', async () => {
      mockPrismaService.costCenter.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
