import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus, RoleType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check if email exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Generate temporary password if not provided
    const tempPassword = dto.password || this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeId: dto.employeeId,
        phone: dto.phone,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        role: dto.role || RoleType.EMPLOYEE,
        status: UserStatus.ACTIVE, // Admin-created users are active
        passwordHistory: [passwordHash],
        mustChangePassword: true,
        passwordChangedAt: new Date(),
      },
      include: {
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Return user without password hash
    const { passwordHash: _, passwordHistory: __, ...result } = user;
    return result;
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    departmentId?: string;
    role?: RoleType;
    status?: UserStatus;
  }) {
    // Ensure page and pageSize are valid numbers with defaults
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const { search, departmentId, role, status } = params;
    const skip = Math.max(0, (page - 1) * pageSize);

    const where: Prisma.UserWhereInput = {};

    // Only apply search filter if search string is not empty
    if (search && search.trim().length > 0) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          phone: true,
          role: true,
          status: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        phone: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        managerId: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        directReports: { select: { id: true, firstName: true, lastName: true } },
        lastLoginAt: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        phone: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return user;
  }

  async approveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not pending approval');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
  }

  async reactivate(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
  }

  async bulkImport(users: CreateUserDto[]) {
    const results = {
      imported: 0,
      errors: [] as string[],
    };

    for (const userData of users) {
      try {
        await this.create(userData);
        results.imported++;
      } catch (error) {
        results.errors.push(
          `${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  async delete(id: string) {
    const user = await this.findOne(id);

    // Check if user has any related records that would prevent deletion
    const hasExpenses = await this.prisma.expense.count({
      where: { submitterId: id },
    });

    if (hasExpenses > 0) {
      throw new BadRequestException(
        'Cannot delete user with existing expenses. Deactivate the user instead.',
      );
    }

    // Delete related records first
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.notification.deleteMany({ where: { userId: id } });

    // Delete the user
    await this.prisma.user.delete({ where: { id } });

    return {
      message: `User ${user.firstName} ${user.lastName} has been deleted`,
      id,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
