import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    expense: {
      count: jest.fn(),
    },
  };

  const now = new Date();

  const mockCategory = {
    id: 'cat-1',
    name: 'Travel',
    code: 'TRAVEL',
    description: 'Travel expenses',
    parentId: null,
    isActive: true,
    requiresReceipt: true,
    requiresPreApproval: false,
    maxAmount: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockChildCategory = {
    id: 'cat-2',
    name: 'Flights',
    code: 'FLIGHTS',
    description: 'Flight tickets',
    parentId: 'cat-1',
    isActive: true,
    requiresReceipt: true,
    requiresPreApproval: false,
    maxAmount: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockGrandchildCategory = {
    id: 'cat-3',
    name: 'Domestic Flights',
    code: 'DOM_FLIGHTS',
    description: 'Domestic flight tickets',
    parentId: 'cat-2',
    isActive: true,
    requiresReceipt: true,
    requiresPreApproval: false,
    maxAmount: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    const createDto = {
      name: 'Travel',
      code: 'TRAVEL',
      description: 'Travel expenses',
    };

    it('should create a category successfully', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({
        ...mockCategory,
        parent: null,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Travel');
      expect(result.code).toBe('TRAVEL');
      expect(mockPrismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Travel',
            code: 'TRAVEL',
            requiresReceipt: true,
            requiresPreApproval: false,
          }),
        }),
      );
    });

    it('should create a category with a valid parent', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce({ ...mockCategory, id: 'parent-id', isActive: true }); // parent check
      mockPrismaService.category.create.mockResolvedValue({
        ...mockChildCategory,
        parent: { id: 'parent-id', name: 'Travel', code: 'TRAVEL' },
      });

      const result = await service.create({ ...createDto, code: 'FLIGHTS', parentId: 'parent-id' });

      expect(result).toBeDefined();
      expect(result.parent).toEqual({ id: 'parent-id', name: 'Travel', code: 'TRAVEL' });
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow("Category with code 'TRAVEL' already exists");
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({ ...createDto, parentId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parent is inactive', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce({ ...mockCategory, isActive: false }); // parent check

      try {
        await service.create({ ...createDto, parentId: 'cat-1' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot assign to an inactive parent category');
      }
    });

    it('should default requiresReceipt to true and requiresPreApproval to false', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({ ...mockCategory, parent: null });

      await service.create({ name: 'Test', code: 'TEST' });

      expect(mockPrismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiresReceipt: true,
            requiresPreApproval: false,
          }),
        }),
      );
    });

    it('should respect explicit requiresReceipt and requiresPreApproval values', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({ ...mockCategory, parent: null });

      await service.create({
        name: 'Test',
        code: 'TEST',
        requiresReceipt: false,
        requiresPreApproval: true,
      });

      expect(mockPrismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiresReceipt: false,
            requiresPreApproval: true,
          }),
        }),
      );
    });
  });

  // ==================== FIND ALL (TREE) TESTS ====================

  describe('findAll', () => {
    it('should build a tree from flat categories list', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        { ...mockCategory, children: [{ id: 'cat-2', name: 'Flights', code: 'FLIGHTS' }] },
        { ...mockChildCategory, children: [] },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('cat-2');
    });

    it('should return empty array when no categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should filter active categories by default', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should include inactive categories when includeInactive is true', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should build a multi-level tree correctly', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        { ...mockCategory, children: [] },
        { ...mockChildCategory, children: [] },
        { ...mockGrandchildCategory, children: [] },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].id).toBe('cat-3');
    });
  });

  // ==================== FIND ALL FLAT TESTS ====================

  describe('findAllFlat', () => {
    it('should return a flat list of categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Travel', code: 'TRAVEL', isActive: true, parentId: null },
        { id: 'cat-2', name: 'Flights', code: 'FLIGHTS', isActive: true, parentId: 'cat-1' },
      ]);

      const result = await service.findAllFlat();

      expect(result).toHaveLength(2);
    });

    it('should filter active categories by default', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findAllFlat();

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should include inactive categories when activeOnly is false', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findAllFlat(false);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ==================== FIND TREE TESTS ====================

  describe('findTree', () => {
    it('should build a tree from all categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        mockCategory,
        mockChildCategory,
      ]);

      const result = await service.findTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('cat-2');
    });

    it('should filter active categories by default', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findTree();

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should include inactive categories when includeInactive is true', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.findTree(true);

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ==================== FIND ONE TESTS ====================

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });

      const result = await service.findOne('cat-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Travel');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        "Category with ID 'non-existent' not found",
      );
    });
  });

  // ==================== FIND BY CODE TESTS ====================

  describe('findByCode', () => {
    it('should return a category by code', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
      });

      const result = await service.findByCode('TRAVEL');

      expect(result).toBeDefined();
      expect(result.code).toBe('TRAVEL');
    });

    it('should throw NotFoundException when code does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NONEXISTENT')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('NONEXISTENT')).rejects.toThrow(
        "Category with code 'NONEXISTENT' not found",
      );
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    const updateDto = {
      name: 'Updated Travel',
    };

    it('should update a category successfully', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'Updated Travel',
        parent: null,
        children: [],
      });

      const result = await service.update('cat-1', updateDto);

      expect(result.name).toBe('Updated Travel');
      expect(mockPrismaService.category.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing to a duplicate code', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, parent: null, children: [] }) // findOne
        .mockResolvedValueOnce({ id: 'other-cat', code: 'FOOD' }); // code uniqueness check

      try {
        await service.update('cat-1', { code: 'FOOD' });
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain("Category with code 'FOOD' already exists");
      }
    });

    it('should allow updating to the same code', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });

      await service.update('cat-1', { code: 'TRAVEL' });

      // Should not check for uniqueness when the code hasn't changed
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.category.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when setting self as parent', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(
        'A category cannot be its own parent',
      );
    });

    it('should throw NotFoundException when new parent does not exist', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, parent: null, children: [] }) // findOne
        .mockResolvedValueOnce(null); // parent lookup

      await expect(service.update('cat-1', { parentId: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new parent is inactive', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, parent: null, children: [] }) // findOne
        .mockResolvedValueOnce({ ...mockCategory, id: 'inactive-parent', isActive: false }); // parent lookup

      try {
        await service.update('cat-1', { parentId: 'inactive-parent' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot assign to an inactive parent category');
      }
    });

    it('should throw BadRequestException for circular reference (child as parent)', async () => {
      // cat-1 -> cat-2 (cat-2 is child of cat-1)
      // Trying to set cat-2 as parent of cat-1 would be circular
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, parent: null, children: [] }) // findOne(cat-1)
        .mockResolvedValueOnce({ ...mockChildCategory, isActive: true }); // parent lookup(cat-2)

      // getAllDescendantIds: cat-1's children include cat-2
      mockPrismaService.category.findMany
        .mockResolvedValueOnce([{ id: 'cat-2' }]) // children of cat-1
        .mockResolvedValueOnce([]); // children of cat-2

      try {
        await service.update('cat-1', { parentId: 'cat-2' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('circular reference');
      }
    });

    it('should throw BadRequestException for deep circular reference (grandchild as parent)', async () => {
      // cat-1 -> cat-2 -> cat-3
      // Trying to set cat-3 as parent of cat-1 would be circular
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, parent: null, children: [] }) // findOne(cat-1)
        .mockResolvedValueOnce({ ...mockGrandchildCategory, isActive: true }); // parent lookup(cat-3)

      // getAllDescendantIds: cat-1 -> cat-2 -> cat-3
      mockPrismaService.category.findMany
        .mockResolvedValueOnce([{ id: 'cat-2' }]) // children of cat-1
        .mockResolvedValueOnce([{ id: 'cat-3' }]) // children of cat-2
        .mockResolvedValueOnce([]); // children of cat-3

      try {
        await service.update('cat-1', { parentId: 'cat-3' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('circular reference');
      }
    });

    it('should allow setting a valid non-circular parent', async () => {
      // cat-2 is child of cat-1; setting cat-2's parent to cat-4 (unrelated) is fine
      const unrelatedParent = {
        id: 'cat-4',
        name: 'Office',
        code: 'OFFICE',
        isActive: true,
        parentId: null,
      };

      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockChildCategory, parent: null, children: [] }) // findOne(cat-2)
        .mockResolvedValueOnce(unrelatedParent); // parent lookup(cat-4)

      // getAllDescendantIds: cat-2 has no children
      mockPrismaService.category.findMany.mockResolvedValueOnce([]);

      mockPrismaService.category.update.mockResolvedValue({
        ...mockChildCategory,
        parentId: 'cat-4',
        parent: { id: 'cat-4', name: 'Office', code: 'OFFICE' },
        children: [],
      });

      const result = await service.update('cat-2', { parentId: 'cat-4' });

      expect(result.parentId).toBe('cat-4');
    });
  });

  // ==================== SOFT DELETE TESTS ====================

  describe('softDelete', () => {
    it('should deactivate a category successfully', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });
      mockPrismaService.expense.count.mockResolvedValue(0);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: false,
        parent: null,
      });
      mockPrismaService.category.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.softDelete('cat-1');

      expect(result.message).toContain('Travel');
      expect(result.message).toContain('deactivated');
      expect(result.category.isActive).toBe(false);
    });

    it('should cascade deactivation to child categories', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [{ id: 'cat-2', name: 'Flights', code: 'FLIGHTS' }],
      });
      mockPrismaService.expense.count.mockResolvedValue(0);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: false,
        parent: null,
      });
      mockPrismaService.category.updateMany.mockResolvedValue({ count: 1 });

      await service.softDelete('cat-1');

      expect(mockPrismaService.category.updateMany).toHaveBeenCalledWith({
        where: { parentId: 'cat-1' },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException when category has active expenses', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });
      mockPrismaService.expense.count.mockResolvedValue(3);

      await expect(service.softDelete('cat-1')).rejects.toThrow(BadRequestException);
      await expect(service.softDelete('cat-1')).rejects.toThrow(
        'Cannot deactivate category with 3 active expense(s)',
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should count only non-terminal expenses (exclude PAID and REJECTED)', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        parent: null,
        children: [],
      });
      mockPrismaService.expense.count.mockResolvedValue(0);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: false,
        parent: null,
      });
      mockPrismaService.category.updateMany.mockResolvedValue({ count: 0 });

      await service.softDelete('cat-1');

      expect(mockPrismaService.expense.count).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat-1',
          status: { notIn: ['PAID', 'REJECTED'] },
        },
      });
    });
  });

  // ==================== REACTIVATE TESTS ====================

  describe('reactivate', () => {
    it('should reactivate an inactive category successfully', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        isActive: false,
        parentId: null,
      });
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: true,
        parent: null,
      });

      const result = await service.reactivate('cat-1');

      expect(result.isActive).toBe(true);
    });

    it('should reactivate a child category when parent is active', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockChildCategory, isActive: false }) // category lookup
        .mockResolvedValueOnce({ ...mockCategory, isActive: true }); // parent lookup

      mockPrismaService.category.update.mockResolvedValue({
        ...mockChildCategory,
        isActive: true,
        parent: { id: 'cat-1', name: 'Travel', code: 'TRAVEL' },
      });

      const result = await service.reactivate('cat-2');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.reactivate('non-existent')).rejects.toThrow(
        "Category with ID 'non-existent' not found",
      );
    });

    it('should throw BadRequestException when category is already active', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        isActive: true,
      });

      await expect(service.reactivate('cat-1')).rejects.toThrow(BadRequestException);
      await expect(service.reactivate('cat-1')).rejects.toThrow('Category is already active');
    });

    it('should throw BadRequestException when parent is inactive', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ ...mockChildCategory, isActive: false }) // category lookup (must be inactive to reactivate)
        .mockResolvedValueOnce({ ...mockCategory, isActive: false }); // parent lookup

      try {
        await service.reactivate('cat-2');
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot reactivate category while parent category is inactive');
      }
    });

    it('should allow reactivation when category has no parent', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        ...mockCategory,
        isActive: false,
        parentId: null,
      });
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: true,
        parent: null,
      });

      const result = await service.reactivate('cat-1');

      expect(result.isActive).toBe(true);
      // findUnique called only once (no parent to look up)
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
