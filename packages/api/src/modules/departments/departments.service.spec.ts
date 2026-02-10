import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  const mockPrismaService = {
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const now = new Date();

  const mockDepartment = {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Engineering department',
    parentId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const mockChildDepartment = {
    id: 'dept-2',
    name: 'Frontend',
    code: 'FE',
    description: 'Frontend team',
    parentId: 'dept-1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const mockGrandchildDepartment = {
    id: 'dept-3',
    name: 'React Team',
    code: 'REACT',
    description: 'React specialists',
    parentId: 'dept-2',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DepartmentsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);

    jest.clearAllMocks();
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    const createDto = {
      name: 'Engineering',
      code: 'ENG',
      description: 'Engineering department',
    };

    it('should create a department successfully', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null); // code check
      mockPrismaService.department.create.mockResolvedValue({
        ...mockDepartment,
        parent: null,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Engineering');
      expect(mockPrismaService.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Engineering',
            code: 'ENG',
          }),
        }),
      );
    });

    it('should create a department with a valid parent', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce({ ...mockDepartment, isActive: true }); // parent check
      mockPrismaService.department.create.mockResolvedValue({
        ...mockChildDepartment,
        parent: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
      });

      const result = await service.create({
        name: 'Frontend',
        code: 'FE',
        parentId: 'dept-1',
      });

      expect(result).toBeDefined();
      expect(result.parent).toEqual({ id: 'dept-1', name: 'Engineering', code: 'ENG' });
    });

    it('should uppercase the code on creation', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null); // code check
      mockPrismaService.department.create.mockResolvedValue({
        ...mockDepartment,
        code: 'ENG',
        parent: null,
      });

      await service.create({ name: 'Engineering', code: 'eng' });

      expect(mockPrismaService.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'ENG',
          }),
        }),
      );
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrismaService.department.findUnique.mockResolvedValueOnce({
        id: 'existing-dept',
        name: 'Engineering',
      });

      try {
        await service.create(createDto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('Department with name "Engineering" already exists');
      }
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce({ id: 'existing-dept', code: 'ENG' }); // code check fails

      try {
        await service.create(createDto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('Department with code "ENG" already exists');
      }
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({ ...createDto, parentId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parent is inactive', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce({ ...mockDepartment, isActive: false }); // parent check

      try {
        await service.create({ ...createDto, parentId: 'dept-1' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot set an inactive department as parent');
      }
    });
  });

  // ==================== FIND ALL (TREE) TESTS ====================

  describe('findAll', () => {
    it('should build a tree from flat departments list', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { ...mockDepartment, _count: { users: 5 } },
        { ...mockChildDepartment, _count: { users: 3 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dept-1');
      expect(result[0].userCount).toBe(5);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('dept-2');
      expect(result[0].children[0].userCount).toBe(3);
    });

    it('should return empty array when no departments exist', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should filter active departments by default', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should include inactive departments when includeInactive is true', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should build a multi-level tree correctly', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { ...mockDepartment, _count: { users: 5 } },
        { ...mockChildDepartment, _count: { users: 3 } },
        { ...mockGrandchildDepartment, _count: { users: 2 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('dept-3');
      expect(result[0].children[0].children[0].userCount).toBe(2);
    });

    it('should sort tree nodes alphabetically', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-z', name: 'Zebra', code: 'ZEB', description: null, parentId: null, isActive: true, createdAt: now, updatedAt: now, _count: { users: 0 } },
        { id: 'dept-a', name: 'Alpha', code: 'ALP', description: null, parentId: null, isActive: true, createdAt: now, updatedAt: now, _count: { users: 0 } },
        { id: 'dept-m', name: 'Mid', code: 'MID', description: null, parentId: null, isActive: true, createdAt: now, updatedAt: now, _count: { users: 0 } },
      ]);

      const result = await service.findAll();

      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Mid');
      expect(result[2].name).toBe('Zebra');
    });

    it('should sort child nodes alphabetically', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { ...mockDepartment, _count: { users: 0 } },
        { id: 'dept-z', name: 'Zulu Team', code: 'ZULU', description: null, parentId: 'dept-1', isActive: true, createdAt: now, updatedAt: now, _count: { users: 0 } },
        { id: 'dept-a', name: 'Alpha Team', code: 'ALPHA', description: null, parentId: 'dept-1', isActive: true, createdAt: now, updatedAt: now, _count: { users: 0 } },
      ]);

      const result = await service.findAll();

      expect(result[0].children[0].name).toBe('Alpha Team');
      expect(result[0].children[1].name).toBe('Zulu Team');
    });

    it('should handle orphaned departments as root nodes', async () => {
      // A department whose parentId references a department not in the result set
      mockPrismaService.department.findMany.mockResolvedValue([
        { ...mockChildDepartment, _count: { users: 1 } },
      ]);

      const result = await service.findAll();

      // dept-2 has parentId='dept-1' but dept-1 is not in the list, so dept-2 becomes a root
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dept-2');
    });
  });

  // ==================== FIND ALL FLAT TESTS ====================

  describe('findAllFlat', () => {
    it('should return a flat list with user counts', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: 'Engineering', code: 'ENG', description: 'Eng', isActive: true, parentId: null, _count: { users: 10 } },
        { id: 'dept-2', name: 'Frontend', code: 'FE', description: 'FE', isActive: true, parentId: 'dept-1', _count: { users: 5 } },
      ]);

      const result = await service.findAllFlat();

      expect(result).toHaveLength(2);
      expect(result[0].userCount).toBe(10);
      expect(result[1].userCount).toBe(5);
      // Should not have _count property
      expect((result[0] as Record<string, unknown>)._count).toBeUndefined();
    });

    it('should filter active departments by default', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);

      await service.findAllFlat();

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should include inactive departments when includeInactive is true', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);

      await service.findAllFlat(true);

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ==================== FIND ONE TESTS ====================

  describe('findOne', () => {
    it('should return a department by ID with counts', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        parent: null,
        children: [],
        _count: { users: 10, expenses: 25, budgets: 3 },
      });

      const result = await service.findOne('dept-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('dept-1');
      expect(result.userCount).toBe(10);
      expect(result.expenseCount).toBe(25);
      expect(result.budgetCount).toBe(3);
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Department with ID "non-existent" not found',
      );
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    const updateDto = {
      name: 'Updated Engineering',
    };

    it('should update a department successfully', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce(null); // validateUpdateName -> validateUniqueName (no conflict)

      mockPrismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        name: 'Updated Engineering',
        parent: null,
        children: [],
      });

      const result = await service.update('dept-1', updateDto);

      expect(result.name).toBe('Updated Engineering');
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing to a duplicate name', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce({ id: 'other-dept', name: 'Updated Engineering' }); // name uniqueness

      await expect(
        service.update('dept-1', { name: 'Updated Engineering' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when changing to a duplicate code', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce({ id: 'other-dept', code: 'HR' }); // code uniqueness

      await expect(service.update('dept-1', { code: 'HR' })).rejects.toThrow(ConflictException);
    });

    it('should not check name uniqueness if name unchanged', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        description: 'New desc',
        parent: null,
        children: [],
      });

      await service.update('dept-1', { name: 'Engineering', description: 'New desc' });

      // findUnique called once for findExistingDepartment only
      // validateUpdateName skips because name === existing.name
      expect(mockPrismaService.department.update).toHaveBeenCalled();
    });

    it('should not check code uniqueness if code unchanged', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        parent: null,
        children: [],
      });

      await service.update('dept-1', { code: 'ENG' });

      // code is already 'ENG' (uppercased matches existing.code)
      expect(mockPrismaService.department.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when setting self as parent', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);

      await expect(service.update('dept-1', { parentId: 'dept-1' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('dept-1', { parentId: 'dept-1' })).rejects.toThrow(
        'A department cannot be its own parent',
      );
    });

    it('should throw NotFoundException when new parent does not exist', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce(null); // parent lookup (validateParentExists)

      await expect(
        service.update('dept-1', { parentId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new parent is inactive', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce({ ...mockDepartment, id: 'inactive-parent', isActive: false }); // parent lookup

      try {
        await service.update('dept-1', { parentId: 'inactive-parent' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot set an inactive department as parent');
      }
    });

    it('should throw BadRequestException for circular reference (child as parent)', async () => {
      // dept-1 -> dept-2 (dept-2 is child of dept-1)
      // Trying to set dept-2 as parent of dept-1 would be circular
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment(dept-1)
        .mockResolvedValueOnce({ ...mockChildDepartment, isActive: true }) // validateParentExists(dept-2)
        .mockResolvedValueOnce({ parentId: 'dept-1' }); // checkCircularReference: traverse from dept-2 -> parentId is dept-1

      try {
        await service.update('dept-1', { parentId: 'dept-2' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('circular reference');
      }
    });

    it('should throw BadRequestException for deep circular reference', async () => {
      // dept-1 -> dept-2 -> dept-3
      // Trying to set dept-3 as parent of dept-1 would be circular
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment(dept-1)
        .mockResolvedValueOnce({ ...mockGrandchildDepartment, isActive: true }) // validateParentExists(dept-3)
        .mockResolvedValueOnce({ parentId: 'dept-2' }) // checkCircularReference: dept-3 -> parentId is dept-2
        .mockResolvedValueOnce({ parentId: 'dept-1' }); // checkCircularReference: dept-2 -> parentId is dept-1 === departmentId

      try {
        await service.update('dept-1', { parentId: 'dept-3' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('circular reference');
      }
    });

    it('should allow setting a valid non-circular parent', async () => {
      const unrelatedDept = {
        id: 'dept-4',
        name: 'HR',
        code: 'HR',
        isActive: true,
        parentId: null,
      };

      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockChildDepartment) // findExistingDepartment(dept-2)
        .mockResolvedValueOnce(unrelatedDept) // validateParentExists(dept-4)
        .mockResolvedValueOnce({ parentId: null }); // checkCircularReference: dept-4 -> parentId is null, stops

      mockPrismaService.department.update.mockResolvedValue({
        ...mockChildDepartment,
        parentId: 'dept-4',
        parent: { id: 'dept-4', name: 'HR', code: 'HR' },
        children: [],
      });

      const result = await service.update('dept-2', { parentId: 'dept-4' });

      expect(result.parentId).toBe('dept-4');
    });

    it('should allow removing parent (setting parentId to null)', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(mockChildDepartment);
      mockPrismaService.department.update.mockResolvedValue({
        ...mockChildDepartment,
        parentId: null,
        parent: null,
        children: [],
      });

      // parentId is empty string (falsy but not undefined) - treated as "set parent to null"
      const result = await service.update('dept-2', { parentId: '' } as unknown as { parentId: string });

      expect(mockPrismaService.department.update).toHaveBeenCalled();
    });

    it('should uppercase the code on update', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment) // findExistingDepartment
        .mockResolvedValueOnce(null); // code uniqueness check

      mockPrismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        code: 'NEWENG',
        parent: null,
        children: [],
      });

      await service.update('dept-1', { code: 'neweng' });

      expect(mockPrismaService.department.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'NEWENG',
          }),
        }),
      );
    });
  });

  // ==================== SOFT DELETE TESTS ====================

  describe('softDelete', () => {
    it('should deactivate a department successfully', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 0, children: 0 },
      });
      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        isActive: false,
      });

      const result = await service.softDelete('dept-1');

      expect(result.message).toContain('Engineering');
      expect(result.message).toContain('deactivated');
      expect(result.department.isActive).toBe(false);
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when department is already inactive', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        isActive: false,
        _count: { users: 0, children: 0 },
      });

      await expect(service.softDelete('dept-1')).rejects.toThrow(BadRequestException);
      await expect(service.softDelete('dept-1')).rejects.toThrow('Department is already inactive');
    });

    it('should throw BadRequestException when department has active users', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 5, children: 0 },
      });

      await expect(service.softDelete('dept-1')).rejects.toThrow(BadRequestException);
      await expect(service.softDelete('dept-1')).rejects.toThrow(
        'Cannot deactivate department: 5 active user(s) are still assigned to it',
      );
    });

    it('should throw BadRequestException when department has active children', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 0, children: 2 },
      });

      await expect(service.softDelete('dept-1')).rejects.toThrow(BadRequestException);
      await expect(service.softDelete('dept-1')).rejects.toThrow(
        'Cannot deactivate department: 2 active child department(s) exist',
      );
    });

    it('should check for non-INACTIVE users only', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 0, children: 0 },
      });
      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        isActive: false,
      });

      await service.softDelete('dept-1');

      expect(mockPrismaService.department.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: expect.objectContaining({
              select: expect.objectContaining({
                users: { where: { status: { not: 'INACTIVE' } } },
              }),
            }),
          }),
        }),
      );
    });
  });

  // ==================== REACTIVATE TESTS ====================

  describe('reactivate', () => {
    it('should reactivate an inactive department successfully', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        isActive: false,
        parentId: null,
      });
      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        isActive: true,
      });

      const result = await service.reactivate('dept-1');

      expect(result.message).toContain('Engineering');
      expect(result.message).toContain('reactivated');
      expect(result.department.isActive).toBe(true);
    });

    it('should reactivate a child department when parent is active', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce({ ...mockChildDepartment, isActive: false }) // department lookup
        .mockResolvedValueOnce({ ...mockDepartment, isActive: true }); // parent lookup

      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-2',
        name: 'Frontend',
        code: 'FE',
        isActive: true,
      });

      const result = await service.reactivate('dept-2');

      expect(result.department.isActive).toBe(true);
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.reactivate('non-existent')).rejects.toThrow(
        'Department with ID "non-existent" not found',
      );
    });

    it('should throw BadRequestException when department is already active', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        isActive: true,
      });

      await expect(service.reactivate('dept-1')).rejects.toThrow(BadRequestException);
      await expect(service.reactivate('dept-1')).rejects.toThrow('Department is already active');
    });

    it('should throw BadRequestException when parent is inactive', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce({ ...mockChildDepartment, isActive: false }) // department lookup
        .mockResolvedValueOnce({ ...mockDepartment, isActive: false }); // parent lookup

      try {
        await service.reactivate('dept-2');
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Cannot reactivate: parent department is inactive');
      }
    });

    it('should allow reactivation when department has no parent', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        isActive: false,
        parentId: null,
      });
      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        isActive: true,
      });

      const result = await service.reactivate('dept-1');

      expect(result.department.isActive).toBe(true);
      // findUnique called only once (no parent to look up)
      expect(mockPrismaService.department.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
