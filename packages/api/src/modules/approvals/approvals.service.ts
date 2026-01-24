import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApproveDto, RejectDto, ClarifyDto, BulkApproveDto } from './dto/approval.dto';
import { CreateDelegationDto } from './dto/delegation.dto';
import { ExpenseStatus, ApprovalAction, RoleType, User } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async getPendingApprovals(
    user: User,
    filters: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Get direct reports or all if admin/finance
    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    const expenses = await this.prisma.expense.findMany({
      where: {
        status: ExpenseStatus.SUBMITTED,
        ...(isAdmin
          ? {}
          : {
              submitter: {
                managerId: user.id,
              },
            }),
      },
      include: {
        category: true,
        vendor: true,
        submitter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        receipts: true,
      },
      orderBy: { submittedAt: 'asc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.expense.count({
      where: {
        status: ExpenseStatus.SUBMITTED,
        ...(isAdmin
          ? {}
          : {
              submitter: {
                managerId: user.id,
              },
            }),
      },
    });

    return {
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApprovalHistory(user: User) {
    return this.prisma.approvalHistory.findMany({
      where: { approverId: user.id },
      include: {
        expense: {
          include: {
            submitter: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async approve(user: User, dto: ApproveDto) {
    await this.validateApprovalAccess(dto.expenseId, user);

    await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: dto.expenseId },
        data: {
          status: ExpenseStatus.APPROVED,
        },
      }),
      this.prisma.approvalHistory.create({
        data: {
          expenseId: dto.expenseId,
          approverId: user.id,
          action: ApprovalAction.APPROVED,
          tierLevel: 1,
          comment: dto.comments,
        },
      }),
    ]);

    return { message: 'Expense approved successfully' };
  }

  async bulkApprove(user: User, dto: BulkApproveDto) {
    const results: { expenseId: string; success: boolean; error?: string }[] = [];

    for (const expenseId of dto.expenseIds) {
      try {
        await this.approve(user, { expenseId, comments: dto.comments });
        results.push({ expenseId, success: true });
      } catch (error) {
        results.push({ expenseId, success: false, error: (error as Error).message });
      }
    }

    return { results };
  }

  async reject(user: User, dto: RejectDto) {
    await this.validateApprovalAccess(dto.expenseId, user);

    if (!dto.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: dto.expenseId },
        data: {
          status: ExpenseStatus.REJECTED,
          rejectionReason: dto.reason,
        },
      }),
      this.prisma.approvalHistory.create({
        data: {
          expenseId: dto.expenseId,
          approverId: user.id,
          action: ApprovalAction.REJECTED,
          tierLevel: 1,
          comment: dto.reason,
        },
      }),
    ]);

    return { message: 'Expense rejected' };
  }

  async requestClarification(user: User, dto: ClarifyDto) {
    await this.validateApprovalAccess(dto.expenseId, user);

    if (!dto.question) {
      throw new BadRequestException('Clarification question is required');
    }

    await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: dto.expenseId },
        data: {
          status: ExpenseStatus.CLARIFICATION_REQUESTED,
          clarificationNote: dto.question,
        },
      }),
      this.prisma.approvalHistory.create({
        data: {
          expenseId: dto.expenseId,
          approverId: user.id,
          action: ApprovalAction.CLARIFICATION_REQUESTED,
          tierLevel: 1,
          comment: dto.question,
        },
      }),
    ]);

    return { message: 'Clarification requested' };
  }

  async getDelegations(userId: string) {
    return this.prisma.approvalDelegation.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        endDate: { gte: new Date() },
      },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        toUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async createDelegation(userId: string, dto: CreateDelegationDto) {
    return this.prisma.approvalDelegation.create({
      data: {
        fromUserId: userId,
        toUserId: dto.delegateId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
  }

  private async validateApprovalAccess(expenseId: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        submitter: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    if (expense.status !== ExpenseStatus.SUBMITTED) {
      throw new BadRequestException('This expense is not pending approval');
    }

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    if (!isAdmin && expense.submitter.managerId !== user.id) {
      throw new ForbiddenException('You are not authorized to approve this expense');
    }

    return expense;
  }
}
