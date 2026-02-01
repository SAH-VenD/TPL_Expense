import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserStatus, RoleType } from '@prisma/client';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActiveUser = {
    id: 'user-id-123',
    email: 'user@tekcellent.com',
    firstName: 'Test',
    lastName: 'User',
    role: RoleType.EMPLOYEE,
    status: UserStatus.ACTIVE,
    departmentId: 'dept-1',
    department: { id: 'dept-1', name: 'Engineering' },
    createdAt: new Date(),
  };

  const mockPendingUser = {
    ...mockActiveUser,
    id: 'pending-user-id',
    status: UserStatus.PENDING_APPROVAL,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should list all users (paginated)', async () => {
      const mockUsers = [mockActiveUser, mockPendingUser];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.pagination.total).toBe(2);
      expect(result.meta.pagination.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPendingUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll({ status: UserStatus.PENDING_APPROVAL });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.PENDING_APPROVAL,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by role', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockActiveUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ role: RoleType.EMPLOYEE });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: RoleType.EMPLOYEE,
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockActiveUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ search: 'Test' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.anything() }),
              expect.objectContaining({ lastName: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
            ]),
          }),
        }),
      );
    });

    it('should filter by department', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockActiveUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ departmentId: 'dept-1' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-1',
          }),
        }),
      );
    });

    it('should paginate correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 2, pageSize: 10 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.pagination.totalPages).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);

      const result = await service.findOne('user-id-123');

      expect(result).toEqual(mockActiveUser);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveUser', () => {
    it('should approve pending user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPendingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockPendingUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.approveUser('pending-user-id');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pending-user-id' },
          data: { status: UserStatus.ACTIVE },
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.approveUser('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already active user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);

      await expect(service.approveUser('user-id-123')).rejects.toThrow(BadRequestException);
      await expect(service.approveUser('user-id-123')).rejects.toThrow('not pending approval');
    });

    it('should throw BadRequestException for inactive user', async () => {
      const inactiveUser = { ...mockActiveUser, status: UserStatus.INACTIVE };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.approveUser('user-id-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate active user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockActiveUser,
        status: UserStatus.INACTIVE,
      });

      const result = await service.deactivate('user-id-123');

      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-123' },
          data: { status: UserStatus.INACTIVE },
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate inactive user', async () => {
      const inactiveUser = { ...mockActiveUser, status: UserStatus.INACTIVE };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...inactiveUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.reactivate('user-id-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
    });

    it('should reactivate locked user', async () => {
      const lockedUser = { ...mockActiveUser, status: UserStatus.LOCKED };
      mockPrismaService.user.findUnique.mockResolvedValue(lockedUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...lockedUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.reactivate('user-id-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'newuser@tekcellent.com',
      firstName: 'New',
      lastName: 'User',
      role: RoleType.EMPLOYEE,
    };

    it('should create admin-created user as ACTIVE', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockActiveUser,
        email: createUserDto.email,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      });

      await service.create(createUserDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
            mustChangePassword: true,
          }),
        }),
      );
    });

    it('should generate temporary password if not provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockActiveUser,
        mustChangePassword: true,
      });

      await service.create(createUserDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow('already exists');
    });

    it('should assign department if provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockActiveUser);

      await service.create({ ...createUserDto, departmentId: 'dept-1' });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-1',
          }),
        }),
      );
    });

    it('should assign manager if provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockActiveUser);

      await service.create({ ...createUserDto, managerId: 'manager-id' });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            managerId: 'manager-id',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockActiveUser,
        ...updateUserDto,
      });

      const result = await service.update('user-id-123', updateUserDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockActiveUser,
        role: RoleType.APPROVER,
      });

      await service.update('user-id-123', { role: RoleType.APPROVER });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: RoleType.APPROVER,
          }),
        }),
      );
    });
  });

  describe('bulkImport', () => {
    it('should import multiple users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockActiveUser);

      const users = [
        { email: 'user1@tekcellent.com', firstName: 'User', lastName: 'One' },
        { email: 'user2@tekcellent.com', firstName: 'User', lastName: 'Two' },
      ];

      const result = await service.bulkImport(users);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should track errors for failed imports', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'existing' }); // Second user exists
      mockPrismaService.user.create.mockResolvedValue(mockActiveUser);

      const users = [
        { email: 'user1@tekcellent.com', firstName: 'User', lastName: 'One' },
        { email: 'existing@tekcellent.com', firstName: 'Existing', lastName: 'User' },
      ];

      const result = await service.bulkImport(users);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('existing@tekcellent.com');
    });
  });
});
