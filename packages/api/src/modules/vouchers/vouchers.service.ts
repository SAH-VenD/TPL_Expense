import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import {
  DisburseVoucherDto,
  SettleVoucherDto,
  RejectVoucherDto,
  LinkExpenseDto,
} from './dto/voucher-actions.dto';
import { VoucherStatus, RoleType, User, ExpenseStatus, ExpenseType } from '@prisma/client';

@Injectable()
export class VouchersService {
  private readonly MAX_PETTY_CASH_AMOUNT = 50000; // PKR
  private readonly SETTLEMENT_DEADLINE_DAYS = 7; // Business days

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE VOUCHER ====================

  async create(userId: string, createVoucherDto: CreateVoucherDto) {
    // Rule 1: Validate requested amount is positive
    if (createVoucherDto.requestedAmount <= 0) {
      throw new BadRequestException('Requested amount must be positive');
    }

    // Rule 2: Validate maximum amount
    if (createVoucherDto.requestedAmount > this.MAX_PETTY_CASH_AMOUNT) {
      throw new BadRequestException(
        `Maximum petty cash request is PKR ${this.MAX_PETTY_CASH_AMOUNT}`,
      );
    }

    // Rule 3: Validate purpose minimum length
    if (!createVoucherDto.purpose || createVoucherDto.purpose.trim().length < 10) {
      throw new BadRequestException('Please provide a detailed purpose (minimum 10 characters)');
    }

    // Rule 4: Validate no multiple open vouchers per user
    await this.validateNoOpenVoucher(userId);

    // Generate voucher number
    const voucherNumber = await this.generateVoucherNumber();

    // Default settlement deadline is 30 days from creation
    const settlementDeadline = new Date();
    settlementDeadline.setDate(settlementDeadline.getDate() + 30);

    return this.prisma.voucher.create({
      data: {
        voucherNumber,
        requesterId: userId,
        requestedAmount: createVoucherDto.requestedAmount,
        purpose: createVoucherDto.purpose,
        settlementDeadline: createVoucherDto.settlementDeadline
          ? new Date(createVoucherDto.settlementDeadline)
          : settlementDeadline,
        status: VoucherStatus.REQUESTED,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // ==================== QUERY VOUCHERS ====================

  async findAll(user: User, status?: VoucherStatus, page: number = 1, pageSize: number = 10) {
    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    // Base where clause for user access (without status filter)
    const baseWhere = isAdmin ? {} : { requesterId: user.id };

    // Where clause with status filter for paginated results
    const where = {
      ...baseWhere,
      ...(status && { status }),
    };

    const [data, total, statusCountsRaw] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          expenses: {
            take: 5,
            select: {
              id: true,
              expenseNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.voucher.count({ where }),
      // Get status counts for ALL vouchers (without status filter)
      this.prisma.voucher.groupBy({
        by: ['status'],
        _count: { status: true },
        where: baseWhere,
      }),
    ]);

    // Convert status counts to a simple object
    const statusCounts: Record<string, number> = {};
    for (const item of statusCountsRaw) {
      statusCounts[item.status] = item._count.status;
    }

    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      statusCounts,
    };
  }

  async findOne(id: string, user: User) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
        },
        expenses: {
          include: {
            category: true,
            receipts: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    if (!isAdmin && voucher.requesterId !== user.id) {
      throw new ForbiddenException('You do not have access to this voucher');
    }

    return voucher;
  }

  async getPendingApproval(user: User) {
    // Only approvers, finance, and admin can view pending approvals
    const allowedRoles: RoleType[] = [RoleType.APPROVER, RoleType.FINANCE, RoleType.ADMIN];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions to view pending approvals');
    }

    return this.prisma.voucher.findMany({
      where: {
        status: VoucherStatus.REQUESTED,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async getOutstanding(user: User) {
    // Only finance and admin can view all outstanding
    const allowedRoles: RoleType[] = [RoleType.FINANCE, RoleType.ADMIN];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions to view outstanding vouchers');
    }

    return this.prisma.voucher.findMany({
      where: {
        status: {
          in: [VoucherStatus.DISBURSED, VoucherStatus.PARTIALLY_SETTLED],
        },
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
        },
        expenses: {
          select: {
            id: true,
            expenseNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { settlementDeadline: 'asc' },
    });
  }

  async getOverdue(user: User) {
    // Only finance and admin can view overdue
    const allowedRoles: RoleType[] = [RoleType.FINANCE, RoleType.ADMIN];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions to view overdue vouchers');
    }

    const now = new Date();

    return this.prisma.voucher.findMany({
      where: {
        OR: [
          { status: VoucherStatus.OVERDUE },
          {
            status: {
              in: [VoucherStatus.DISBURSED, VoucherStatus.PARTIALLY_SETTLED],
            },
            settlementDeadline: { lt: now },
          },
        ],
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
        },
        expenses: {
          select: {
            id: true,
            expenseNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { settlementDeadline: 'asc' },
    });
  }

  // ==================== VOUCHER ACTIONS ====================

  async approve(id: string, user: User) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (voucher.status !== VoucherStatus.REQUESTED) {
      throw new BadRequestException('Only requested vouchers can be approved');
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.APPROVED,
        approvedBy: user.id,
        approvedAt: new Date(),
        approvedAmount: voucher.requestedAmount,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async reject(id: string, user: User, dto: RejectVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    if (voucher.status !== VoucherStatus.REQUESTED) {
      throw new BadRequestException('Only requested vouchers can be rejected');
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.REJECTED,
        notes: dto.reason,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async cancel(id: string, user: User) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    // Only owner can cancel
    if (voucher.requesterId !== user.id) {
      throw new ForbiddenException('Only the requester can cancel this voucher');
    }

    // Can only cancel before disbursement
    const cancellableStatuses: VoucherStatus[] = [VoucherStatus.REQUESTED, VoucherStatus.APPROVED];
    if (!cancellableStatuses.includes(voucher.status)) {
      throw new BadRequestException(
        'Voucher can only be cancelled before disbursement (REQUESTED or APPROVED status)',
      );
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.REJECTED, // Use REJECTED status for cancelled vouchers
        notes: 'Cancelled by requester',
      },
    });
  }

  async disburse(id: string, user: User, dto: DisburseVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    // Rule 1: Can only disburse approved vouchers
    if (voucher.status !== VoucherStatus.APPROVED) {
      throw new BadRequestException('Only approved vouchers can be disbursed');
    }

    // Rule 2: Disbursed amount cannot exceed requested amount
    if (dto.amount > Number(voucher.requestedAmount)) {
      throw new BadRequestException('Disbursed amount cannot exceed requested amount');
    }

    // Rule 3: Calculate settlement deadline (7 business days from disbursement)
    const settlementDeadline = this.calculateSettlementDeadline(this.SETTLEMENT_DEADLINE_DAYS);

    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: VoucherStatus.DISBURSED,
        disbursedBy: user.id,
        disbursedAt: new Date(),
        disbursedAmount: dto.amount,
        settlementDeadline,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async settle(id: string, user: User, dto: SettleVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        expenses: {
          where: {
            status: {
              in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
            },
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    // Rule 1: Only owner can settle (or finance/admin)
    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;
    if (voucher.requesterId !== user.id && !isAdmin) {
      throw new ForbiddenException('Only the requester can settle this voucher');
    }

    // Rule 2: Can only settle disbursed or partially settled vouchers
    if (
      voucher.status !== VoucherStatus.DISBURSED &&
      voucher.status !== VoucherStatus.PARTIALLY_SETTLED
    ) {
      throw new BadRequestException('Voucher is not ready for settlement');
    }

    // Rule 3: Validate all expenses are approved
    const allExpenses = await this.prisma.expense.findMany({
      where: { voucherId: voucher.id },
    });

    const pendingExpenses = allExpenses.filter(
      (e) =>
        e.status !== ExpenseStatus.APPROVED &&
        e.status !== ExpenseStatus.PAID &&
        e.status !== ExpenseStatus.REJECTED,
    );

    if (pendingExpenses.length > 0) {
      throw new BadRequestException(
        `${pendingExpenses.length} expense(s) still pending approval. All expenses must be approved before settlement.`,
      );
    }

    // Calculate totals
    const totalExpensesAmount = voucher.expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    const disbursedAmount = Number(voucher.disbursedAmount || 0);
    const balance = disbursedAmount - totalExpensesAmount;

    // Rule 4: Handle overspend (balance < 0)
    if (balance < 0) {
      if (!dto.overspendJustification) {
        throw new BadRequestException(
          `Expenses exceed disbursed amount by PKR ${Math.abs(balance).toFixed(2)}. Overspend justification required.`,
        );
      }
    }

    // Rule 5: Handle underspend (balance > 0) - require cash return confirmation
    if (balance > 0) {
      if (!dto.cashReturnConfirmed) {
        throw new BadRequestException(
          `Please confirm return of PKR ${balance.toFixed(2)} unused cash`,
        );
      }
    }

    // Determine final status
    const finalStatus = VoucherStatus.SETTLED;

    // Update voucher with settlement data
    return this.prisma.voucher.update({
      where: { id },
      data: {
        status: finalStatus,
        settledAmount: totalExpensesAmount,
        settledAt: new Date(),
        underSpendAmount: Math.max(balance, 0),
        overSpendAmount: Math.max(-balance, 0),
        cashReturned: Math.max(balance, 0),
        notes: dto.notes || voucher.notes,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        expenses: {
          include: {
            category: true,
            receipts: true,
          },
        },
      },
    });
  }

  async linkExpense(voucherId: string, user: User, dto: LinkExpenseDto) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${voucherId} not found`);
    }

    // Only owner can link expenses
    if (voucher.requesterId !== user.id) {
      throw new ForbiddenException('Only the requester can link expenses to this voucher');
    }

    // Voucher must be disbursed before linking expenses
    const linkableStatuses: VoucherStatus[] = [
      VoucherStatus.DISBURSED,
      VoucherStatus.PARTIALLY_SETTLED,
      VoucherStatus.OVERDUE,
    ];
    if (!linkableStatuses.includes(voucher.status)) {
      throw new BadRequestException('Voucher must be disbursed before linking expenses');
    }

    // Validate expense exists and belongs to user
    const expense = await this.prisma.expense.findUnique({
      where: { id: dto.expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${dto.expenseId} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only link your own expenses');
    }

    // Expense must be petty cash type
    if (expense.type !== ExpenseType.PETTY_CASH) {
      throw new BadRequestException('Only petty cash expenses can be linked to vouchers');
    }

    // Link the expense to the voucher
    await this.prisma.expense.update({
      where: { id: dto.expenseId },
      data: { voucherId },
    });

    // Update voucher totals
    await this.updateVoucherTotals(voucherId);

    // Return updated voucher
    return this.prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        expenses: {
          include: {
            category: true,
            receipts: true,
          },
        },
      },
    });
  }

  // ==================== HELPER METHODS ====================

  private async validateNoOpenVoucher(userId: string): Promise<void> {
    const openVoucher = await this.prisma.voucher.findFirst({
      where: {
        requesterId: userId,
        status: {
          in: [
            VoucherStatus.REQUESTED,
            VoucherStatus.APPROVED,
            VoucherStatus.DISBURSED,
            VoucherStatus.PARTIALLY_SETTLED,
            VoucherStatus.OVERDUE,
          ],
        },
      },
    });

    if (openVoucher) {
      throw new BadRequestException(
        `You already have an open petty cash voucher (${openVoucher.voucherNumber}). Please settle it first.`,
      );
    }
  }

  private async updateVoucherTotals(voucherId: string): Promise<void> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        expenses: {
          where: {
            status: {
              in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
            },
          },
        },
      },
    });

    if (!voucher) {
      return;
    }

    const totalExpensesAmount = voucher.expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    const disbursedAmount = Number(voucher.disbursedAmount || 0);
    const balance = disbursedAmount - totalExpensesAmount;

    // Determine if partially settled
    let status = voucher.status;
    if (voucher.status === VoucherStatus.DISBURSED && totalExpensesAmount > 0 && balance !== 0) {
      status = VoucherStatus.PARTIALLY_SETTLED;
    }

    await this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        settledAmount: totalExpensesAmount,
        underSpendAmount: Math.max(balance, 0),
        overSpendAmount: Math.max(-balance, 0),
        status,
      },
    });
  }

  private calculateSettlementDeadline(businessDays: number): Date {
    const deadline = new Date();
    let daysAdded = 0;

    while (daysAdded < businessDays) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return deadline;
  }

  private async generateVoucherNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PC';

    const lastVoucher = await this.prisma.voucher.findFirst({
      where: {
        voucherNumber: {
          startsWith: `${prefix}-${year}`,
        },
      },
      orderBy: { voucherNumber: 'desc' },
    });

    let sequence = 1;
    if (lastVoucher) {
      const lastSequence = Number.parseInt(lastVoucher.voucherNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
  }
}
