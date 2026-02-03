import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApproveDto, RejectDto, ClarifyDto, BulkApproveDto } from './dto/approval.dto';
import { CreateDelegationDto, RevokeDelegationDto } from './dto/delegation.dto';
import {
  ExpenseStatus,
  ApprovalAction,
  RoleType,
  User,
  Expense,
  ApprovalTier,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { EMERGENCY_APPROVAL_ROLES } from '../../common/constants/roles';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  // ==================== PENDING APPROVALS ====================

  async getPendingApprovals(user: User, filters: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Find expenses that need this user's approval
    const expenses = await this.findExpensesRequiringApproval(user.id);

    // Apply pagination
    const paginatedExpenses = expenses.slice(skip, skip + limit);

    // Get full expense data with relations
    const expenseIds = paginatedExpenses.map((e) => e.id);
    const fullExpenses = await this.prisma.expense.findMany({
      where: { id: { in: expenseIds } },
      include: {
        category: true,
        vendor: true,
        submitter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        receipts: true,
        approvalHistory: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return {
      data: fullExpenses,
      meta: {
        total: expenses.length,
        page,
        limit,
        totalPages: Math.ceil(expenses.length / limit),
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

  async getExpenseApprovalHistory(expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    const history = await this.prisma.approvalHistory.findMany({
      where: { expenseId },
      include: {
        approver: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      expenseId,
      currentStatus: expense.status,
      timeline: history.map((h) => ({
        timestamp: h.createdAt,
        action: h.action,
        actor: `${h.approver.firstName} ${h.approver.lastName}`,
        actorRole: h.approver.role,
        tierLevel: h.tierLevel,
        comment: h.comment,
        wasDelegated: !!h.delegatedFromId,
        wasEscalated: h.wasEscalated,
        isEmergencyApproval: h.isEmergencyApproval,
        emergencyReason: h.emergencyReason,
      })),
    };
  }

  // ==================== APPROVAL ACTIONS ====================

  async approve(user: User, dto: ApproveDto) {
    const expense = await this.getExpenseWithValidation(dto.expenseId);

    // Handle emergency approval flow
    if (dto.isEmergencyApproval) {
      // Validate user has emergency approval authority
      if (!EMERGENCY_APPROVAL_ROLES.includes(user.role)) {
        throw new ForbiddenException(
          'Only CEO, SUPER_APPROVER, or FINANCE can perform emergency approvals',
        );
      }

      // CEO doesn't need to provide reason (implicit authority), others do
      if (user.role !== RoleType.CEO) {
        if (!dto.emergencyReason || dto.emergencyReason.length < 20) {
          throw new BadRequestException(
            'Emergency approval requires detailed justification (minimum 20 characters)',
          );
        }
      }

      // Emergency approval bypasses tier requirements - approve immediately
      await this.prisma.$transaction(async (tx) => {
        // Record emergency approval
        await tx.approvalHistory.create({
          data: {
            expenseId: dto.expenseId,
            approverId: user.id,
            action: ApprovalAction.APPROVED,
            tierLevel: 0, // 0 indicates emergency bypass
            comment: dto.comments,
            isEmergencyApproval: true,
            emergencyReason: dto.emergencyReason || 'CEO emergency approval',
          },
        });

        // Mark expense as APPROVED
        await tx.expense.update({
          where: { id: dto.expenseId },
          data: {
            status: ExpenseStatus.APPROVED,
          },
        });
      });

      // Log emergency approval to audit log for compliance tracking
      await this.logEmergencyApproval(user, dto.expenseId, dto.emergencyReason);

      return {
        message: 'Emergency approval granted',
        isEmergencyApproval: true,
        approvedBy: `${user.firstName} ${user.lastName} (${user.role})`,
      };
    }

    // Standard approval flow
    // Determine current required tier
    const requiredTier = await this.getRequiredApprovalTier(expense);

    // Check if user is authorized (considering delegation)
    const { isAuthorized, delegatedFromId } = await this.checkApprovalAuthority(
      user.id,
      expense,
      requiredTier,
    );

    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to approve this expense');
    }

    // Check if there are higher tiers needed
    const nextTier = await this.getNextApprovalTier(expense, requiredTier);

    await this.prisma.$transaction(async (tx) => {
      // Record approval
      await tx.approvalHistory.create({
        data: {
          expenseId: dto.expenseId,
          approverId: user.id,
          action: ApprovalAction.APPROVED,
          tierLevel: requiredTier.tierOrder,
          comment: dto.comments,
          delegatedFromId,
          isEmergencyApproval: false,
        },
      });

      // Determine next status
      if (nextTier) {
        // More approvals needed - keep as PENDING_APPROVAL
        await tx.expense.update({
          where: { id: dto.expenseId },
          data: {
            status: ExpenseStatus.PENDING_APPROVAL,
          },
        });
      } else {
        // All approvals complete - mark as APPROVED
        await tx.expense.update({
          where: { id: dto.expenseId },
          data: {
            status: ExpenseStatus.APPROVED,
          },
        });
      }
    });

    return {
      message: nextTier
        ? `Approved at tier ${requiredTier.tierOrder}. Pending approval from tier ${nextTier.tierOrder}.`
        : 'Expense fully approved',
      nextTier: nextTier?.name,
    };
  }

  async bulkApprove(user: User, dto: BulkApproveDto) {
    const results: { expenseId: string; success: boolean; error?: string }[] = [];

    for (const expenseId of dto.expenseIds) {
      try {
        await this.approve(user, {
          expenseId,
          comments: dto.comments,
          isEmergencyApproval: dto.isEmergencyApproval,
          emergencyReason: dto.emergencyReason,
        });
        results.push({ expenseId, success: true });
      } catch (error) {
        results.push({ expenseId, success: false, error: (error as Error).message });
      }
    }

    return {
      summary: {
        total: dto.expenseIds.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      results,
    };
  }

  async reject(user: User, dto: RejectDto) {
    const expense = await this.getExpenseWithValidation(dto.expenseId);
    const requiredTier = await this.getRequiredApprovalTier(expense);

    const { isAuthorized, delegatedFromId } = await this.checkApprovalAuthority(
      user.id,
      expense,
      requiredTier,
    );

    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to reject this expense');
    }

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
          tierLevel: requiredTier.tierOrder,
          comment: dto.reason,
          delegatedFromId,
        },
      }),
    ]);

    return { message: 'Expense rejected' };
  }

  async requestClarification(user: User, dto: ClarifyDto) {
    const expense = await this.getExpenseWithValidation(dto.expenseId);
    const requiredTier = await this.getRequiredApprovalTier(expense);

    const { isAuthorized, delegatedFromId } = await this.checkApprovalAuthority(
      user.id,
      expense,
      requiredTier,
    );

    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to request clarification');
    }

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
          tierLevel: requiredTier.tierOrder,
          comment: dto.question,
          delegatedFromId,
        },
      }),
    ]);

    return { message: 'Clarification requested' };
  }

  async resubmitExpense(expenseId: string, userId: string, resubmissionNote?: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { submitter: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    // Validate can resubmit
    const resubmittableStatuses: ExpenseStatus[] = [
      ExpenseStatus.REJECTED,
      ExpenseStatus.CLARIFICATION_REQUESTED,
    ];

    if (!resubmittableStatuses.includes(expense.status)) {
      throw new BadRequestException(
        `Expense cannot be resubmitted in current status: ${expense.status}`,
      );
    }

    if (expense.submitterId !== userId) {
      throw new ForbiddenException('You can only resubmit your own expenses');
    }

    await this.prisma.$transaction([
      // Record resubmission as CLARIFICATION_REQUESTED with special comment
      this.prisma.approvalHistory.create({
        data: {
          expenseId,
          approverId: userId,
          action: ApprovalAction.CLARIFICATION_REQUESTED,
          tierLevel: 0,
          comment: `RESUBMITTED: ${resubmissionNote || 'Expense resubmitted for approval'}`,
        },
      }),
      // Reset to submitted status
      this.prisma.expense.update({
        where: { id: expenseId },
        data: {
          status: ExpenseStatus.SUBMITTED,
          submittedAt: new Date(),
          clarificationNote: null,
          rejectionReason: null,
        },
      }),
    ]);

    return { message: 'Expense resubmitted successfully' };
  }

  // ==================== APPROVAL TIERS ====================

  async getApprovalTiers() {
    return this.prisma.approvalTier.findMany({
      where: { isActive: true },
      orderBy: { tierOrder: 'asc' },
    });
  }

  async createApprovalTier(data: {
    name: string;
    tierOrder: number;
    minAmount: number;
    maxAmount?: number;
    approverRole: RoleType;
  }) {
    return this.prisma.approvalTier.create({
      data: {
        name: data.name,
        tierOrder: data.tierOrder,
        minAmount: new Decimal(data.minAmount),
        maxAmount: data.maxAmount ? new Decimal(data.maxAmount) : null,
        approverRole: data.approverRole,
      },
    });
  }

  async updateApprovalTier(tierId: string, data: Partial<ApprovalTier>) {
    return this.prisma.approvalTier.update({
      where: { id: tierId },
      data,
    });
  }

  async deleteApprovalTier(tierId: string) {
    return this.prisma.approvalTier.update({
      where: { id: tierId },
      data: { isActive: false },
    });
  }

  // ==================== DELEGATIONS ====================

  async getDelegations(userId: string) {
    const now = new Date();

    return this.prisma.approvalDelegation.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        toUser: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  }

  async createDelegation(userId: string, dto: CreateDelegationDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate delegate exists
    const delegate = await this.prisma.user.findUnique({
      where: { id: dto.delegateId },
    });

    if (!delegate) {
      throw new NotFoundException('Delegate user not found');
    }

    // Check for overlapping delegations
    const existing = await this.prisma.approvalDelegation.findFirst({
      where: {
        fromUserId: userId,
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (existing) {
      throw new ConflictException('You already have an active delegation for this time period');
    }

    return this.prisma.approvalDelegation.create({
      data: {
        fromUserId: userId,
        toUserId: dto.delegateId,
        startDate,
        endDate,
        reason: dto.reason,
      },
    });
  }

  async revokeDelegation(userId: string, dto: RevokeDelegationDto) {
    const delegation = await this.prisma.approvalDelegation.findUnique({
      where: { id: dto.delegationId },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (delegation.fromUserId !== userId) {
      throw new ForbiddenException('You can only revoke your own delegations');
    }

    return this.prisma.approvalDelegation.update({
      where: { id: dto.delegationId },
      data: { isActive: false },
    });
  }

  // ==================== HELPER METHODS ====================

  private async getExpenseWithValidation(expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        submitter: true,
        approvalHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    const approvableStatuses: ExpenseStatus[] = [
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.PENDING_APPROVAL,
    ];

    if (!approvableStatuses.includes(expense.status)) {
      throw new BadRequestException(
        `This expense cannot be approved in its current status: ${expense.status}`,
      );
    }

    return expense;
  }

  private async getRequiredApprovalTier(expense: Expense): Promise<ApprovalTier> {
    // Get PKR amount for tier comparison (use amountInPKR if set, otherwise amount)
    const pkrAmount = expense.amountInPKR || expense.amount;

    // Get already approved tiers for this expense
    const approvedTiers = await this.prisma.approvalHistory.findMany({
      where: {
        expenseId: expense.id,
        action: ApprovalAction.APPROVED,
      },
      select: { tierLevel: true },
    });

    const approvedTierLevels = new Set(approvedTiers.map((h) => h.tierLevel));

    // Find the next tier that needs approval
    const tiers = await this.prisma.approvalTier.findMany({
      where: {
        isActive: true,
        minAmount: { lte: pkrAmount },
        OR: [{ maxAmount: null }, { maxAmount: { gte: pkrAmount } }],
      },
      orderBy: { tierOrder: 'asc' },
    });

    // Find first tier not yet approved
    for (const tier of tiers) {
      if (!approvedTierLevels.has(tier.tierOrder)) {
        return tier;
      }
    }

    // This shouldn't happen if data is consistent
    throw new BadRequestException('No approval tier found for this expense amount');
  }

  private async getNextApprovalTier(
    expense: Expense,
    currentTier: ApprovalTier,
  ): Promise<ApprovalTier | null> {
    const pkrAmount = expense.amountInPKR || expense.amount;

    const nextTier = await this.prisma.approvalTier.findFirst({
      where: {
        isActive: true,
        tierOrder: { gt: currentTier.tierOrder },
        minAmount: { lte: pkrAmount },
        OR: [{ maxAmount: null }, { maxAmount: { gte: pkrAmount } }],
      },
      orderBy: { tierOrder: 'asc' },
    });

    return nextTier;
  }

  private async checkApprovalAuthority(
    userId: string,
    _expense: Expense,
    requiredTier: ApprovalTier,
  ): Promise<{ isAuthorized: boolean; delegatedFromId?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { isAuthorized: false };
    }

    // CEO can approve at any tier
    if (user.role === RoleType.CEO) {
      return { isAuthorized: true };
    }

    // SUPER_APPROVER can approve at any tier except CEO-only tiers
    if (user.role === RoleType.SUPER_APPROVER && requiredTier.approverRole !== RoleType.CEO) {
      return { isAuthorized: true };
    }

    // FINANCE can approve at FINANCE and lower tiers
    if (
      user.role === RoleType.FINANCE &&
      (requiredTier.approverRole === RoleType.FINANCE ||
        requiredTier.approverRole === RoleType.APPROVER)
    ) {
      return { isAuthorized: true };
    }

    // Check if user's role matches the required tier
    if (user.role === requiredTier.approverRole) {
      return { isAuthorized: true };
    }

    // Check if user is acting as delegate
    const now = new Date();
    const delegation = await this.prisma.approvalDelegation.findFirst({
      where: {
        toUserId: userId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        fromUser: {
          role: requiredTier.approverRole,
        },
      },
    });

    if (delegation) {
      return { isAuthorized: true, delegatedFromId: delegation.fromUserId };
    }

    return { isAuthorized: false };
  }

  private async findExpensesRequiringApproval(userId: string): Promise<Expense[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    // Get all pending expenses
    const pendingExpenses = await this.prisma.expense.findMany({
      where: {
        status: {
          in: [ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_APPROVAL],
        },
      },
      include: {
        approvalHistory: true,
      },
    });

    // Filter expenses where user can approve at current tier
    const expensesForUser: Expense[] = [];

    for (const expense of pendingExpenses) {
      const requiredTier = await this.getRequiredApprovalTier(expense);
      const { isAuthorized } = await this.checkApprovalAuthority(userId, expense, requiredTier);

      if (isAuthorized) {
        expensesForUser.push(expense);
      }
    }

    return expensesForUser;
  }

  /**
   * Log emergency approval to audit log for compliance tracking.
   * Emergency approvals bypass normal tier requirements and require additional audit trail.
   */
  private async logEmergencyApproval(
    user: User,
    expenseId: string,
    emergencyReason: string | undefined,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EMERGENCY_APPROVAL',
        entityType: 'Expense',
        entityId: expenseId,
        newValue: {
          approverRole: user.role,
          approverName: `${user.firstName} ${user.lastName}`,
          emergencyReason: emergencyReason || 'CEO emergency approval (no reason required)',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}
