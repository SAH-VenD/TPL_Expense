import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePreApprovalDto } from './dto/create-pre-approval.dto';
import { PreApprovalStatus, RoleType, User } from '@prisma/client';

@Injectable()
export class PreApprovalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPreApprovalDto: CreatePreApprovalDto) {
    // Default expiry is 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Generate unique pre-approval number
    const preApprovalNumber = `PA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return this.prisma.preApproval.create({
      data: {
        preApprovalNumber,
        requesterId: userId,
        categoryId: createPreApprovalDto.categoryId,
        description: createPreApprovalDto.purpose || 'Pre-approval request',
        estimatedAmount: createPreApprovalDto.estimatedAmount,
        purpose: createPreApprovalDto.purpose,
        expiresAt: createPreApprovalDto.expiresAt
          ? new Date(createPreApprovalDto.expiresAt)
          : expiresAt,
        status: PreApprovalStatus.PENDING,
      },
    });
  }

  async findAll(
    user: User,
    status?: PreApprovalStatus,
  ) {
    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    return this.prisma.preApproval.findMany({
      where: {
        ...(isAdmin ? {} : { requesterId: user.id }),
        ...(status && { status }),
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        category: true,
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPending(user: User) {
    return this.prisma.preApproval.findMany({
      where: {
        status: PreApprovalStatus.PENDING,
        requester: {
          managerId: user.id,
        },
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, user: User) {
    const preApproval = await this.prisma.preApproval.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: true,
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
        expenses: true,
      },
    });

    if (!preApproval) {
      throw new NotFoundException(`Pre-approval with ID ${id} not found`);
    }

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    if (!isAdmin && preApproval.requesterId !== user.id) {
      throw new ForbiddenException('You do not have access to this pre-approval');
    }

    return preApproval;
  }

  async approve(id: string, user: User, comments?: string) {
    const preApproval = await this.prisma.preApproval.findUnique({
      where: { id },
    });

    if (!preApproval) {
      throw new NotFoundException(`Pre-approval with ID ${id} not found`);
    }

    if (preApproval.status !== PreApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending pre-approvals can be approved');
    }

    return this.prisma.preApproval.update({
      where: { id },
      data: {
        status: PreApprovalStatus.APPROVED,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, user: User, reason: string) {
    const preApproval = await this.prisma.preApproval.findUnique({
      where: { id },
    });

    if (!preApproval) {
      throw new NotFoundException(`Pre-approval with ID ${id} not found`);
    }

    if (preApproval.status !== PreApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending pre-approvals can be rejected');
    }

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.preApproval.update({
      where: { id },
      data: {
        status: PreApprovalStatus.REJECTED,
        approverId: user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async getValidPreApproval(userId: string, categoryId: string) {
    return this.prisma.preApproval.findFirst({
      where: {
        requesterId: userId,
        categoryId,
        status: PreApprovalStatus.APPROVED,
        expiresAt: { gte: new Date() },
      },
    });
  }
}
