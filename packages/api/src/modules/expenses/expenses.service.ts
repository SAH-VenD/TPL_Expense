import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFiltersDto } from './dto/expense-filters.dto';
import { ExpenseStatus, RoleType, User, Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    const expenseNumber = await this.generateExpenseNumber();
    const totalAmount = createExpenseDto.amount + (createExpenseDto.taxAmount || 0);

    // Calculate amountInPKR for approval tier matching
    let amountInPKR: number | undefined;
    let exchangeRate = createExpenseDto.exchangeRate;
    let exchangeRateDate: Date | undefined;

    if (createExpenseDto.currency === 'PKR') {
      amountInPKR = totalAmount;
    } else {
      // Get exchange rate if not provided
      if (!exchangeRate) {
        const rate = await this.getExchangeRate(createExpenseDto.currency, 'PKR');
        if (rate) {
          exchangeRate = rate;
          exchangeRateDate = new Date();
        }
      }

      if (exchangeRate) {
        amountInPKR = totalAmount * exchangeRate;
        exchangeRateDate = exchangeRateDate || new Date();
      }
    }

    return this.prisma.expense.create({
      data: {
        expenseNumber,
        submitterId: userId,
        type: createExpenseDto.type,
        categoryId: createExpenseDto.categoryId,
        vendorId: createExpenseDto.vendorId,
        projectId: createExpenseDto.projectId,
        costCenterId: createExpenseDto.costCenterId,
        description: createExpenseDto.description,
        amount: createExpenseDto.amount,
        totalAmount,
        currency: createExpenseDto.currency,
        exchangeRate,
        exchangeRateDate,
        amountInPKR,
        taxAmount: createExpenseDto.taxAmount || 0,
        expenseDate: new Date(createExpenseDto.expenseDate),
        invoiceNumber: createExpenseDto.invoiceNumber,
        preApprovalId: createExpenseDto.preApprovalId,
        status: ExpenseStatus.DRAFT,
      },
      include: {
        category: true,
        vendor: true,
        receipts: true,
      },
    });
  }

  /**
   * Get the latest exchange rate for currency conversion
   */
  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: fromCurrency as any,
        toCurrency: toCurrency as any,
        effectiveDate: { lte: today },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return rate ? rate.rate.toNumber() : null;
  }

  async findAll(user: User, filters: ExpenseFiltersDto) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = this.buildExpenseWhereClause(user, filters);
    const orderBy = this.buildExpenseOrderBy(filters.sort);

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          category: true,
          vendor: true,
          submitter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

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

  private buildExpenseWhereClause(
    user: User,
    filters: ExpenseFiltersDto,
  ): Prisma.ExpenseWhereInput {
    const { status, dateFrom, dateTo, categoryId, amountMin, amountMax, search } = filters;

    // Org-wide visibility roles (can see all expenses)
    const isOrgWide =
      user.role === RoleType.ADMIN ||
      user.role === RoleType.FINANCE ||
      user.role === RoleType.CEO ||
      user.role === RoleType.SUPER_APPROVER;

    // Department-scoped visibility (can see own + department expenses)
    const isDepartmentScoped = user.role === RoleType.APPROVER;

    let where: Prisma.ExpenseWhereInput = {};

    if (isOrgWide) {
      // Org-wide roles see all expenses
      where = {};
    } else if (isDepartmentScoped && user.departmentId) {
      // APPROVER sees their own expenses + department expenses
      where = {
        OR: [
          { submitterId: user.id }, // Own expenses
          { submitter: { departmentId: user.departmentId } }, // Department expenses
        ],
      };
    } else {
      // EMPLOYEE and others see only their own expenses
      where = { submitterId: user.id };
    }

    // Status filter (single or comma-separated)
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()) as ExpenseStatus[];
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.expenseDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Amount range filter
    if (amountMin !== undefined || amountMax !== undefined) {
      where.totalAmount = {
        ...(amountMin !== undefined && { gte: amountMin }),
        ...(amountMax !== undefined && { lte: amountMax }),
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { expenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildExpenseOrderBy(sort?: string): Prisma.ExpenseOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const validFields = ['createdAt', 'totalAmount', 'expenseDate', 'amount'];
    const validDirections = ['asc', 'desc'];

    if (validFields.includes(field) && validDirections.includes(direction)) {
      return { [field]: direction as 'asc' | 'desc' };
    }

    return { createdAt: 'desc' };
  }

  async findOne(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        submitter: {
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
        },
        receipts: true,
        splits: {
          include: { category: true },
        },
        approvalHistory: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Org-wide visibility roles (can see all expenses)
    const isOrgWide =
      user.role === RoleType.ADMIN ||
      user.role === RoleType.FINANCE ||
      user.role === RoleType.CEO ||
      user.role === RoleType.SUPER_APPROVER;

    // Department-scoped visibility (can see own + department expenses)
    const isDepartmentScoped = user.role === RoleType.APPROVER;

    // Check access
    const isOwnExpense = expense.submitterId === user.id;
    const isSameDepartment =
      isDepartmentScoped &&
      user.departmentId &&
      expense.submitter.departmentId === user.departmentId;

    if (!isOrgWide && !isOwnExpense && !isSameDepartment) {
      throw new ForbiddenException('You do not have access to this expense');
    }

    return expense;
  }

  async update(id: string, user: User, updateExpenseDto: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only update your own expenses');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Only draft expenses can be updated');
    }

    const updateData: Record<string, unknown> = { ...updateExpenseDto };
    if (updateExpenseDto.expenseDate) {
      updateData.expenseDate = new Date(updateExpenseDto.expenseDate);
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        vendor: true,
        receipts: true,
      },
    });
  }

  async submit(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { receipts: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only submit your own expenses');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Only draft expenses can be submitted');
    }

    if (expense.receipts.length === 0) {
      throw new BadRequestException('At least one receipt is required');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  async resubmit(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only resubmit your own expenses');
    }

    if (expense.status !== ExpenseStatus.REJECTED) {
      throw new BadRequestException('Only rejected expenses can be resubmitted');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.RESUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  async remove(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only delete your own expenses');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Only draft expenses can be deleted');
    }

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  async withdraw(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.submitterId !== user.id) {
      throw new ForbiddenException('You can only withdraw your own expenses');
    }

    const withdrawableStatuses: ExpenseStatus[] = [
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.PENDING_APPROVAL,
    ];
    if (!withdrawableStatuses.includes(expense.status)) {
      throw new BadRequestException('Only submitted or pending approval expenses can be withdrawn');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.DRAFT,
        submittedAt: null,
      },
      include: {
        category: true,
        vendor: true,
        receipts: true,
      },
    });
  }

  async bulkSubmit(userId: string, expenseIds: string[]) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
      },
      include: { receipts: true },
    });

    if (expenses.length !== expenseIds.length) {
      throw new NotFoundException('One or more expenses not found');
    }

    for (const expense of expenses) {
      if (expense.submitterId !== userId) {
        throw new ForbiddenException('You can only submit your own expenses');
      }
      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException(`Expense ${expense.expenseNumber} is not in draft status`);
      }
      if (expense.receipts.length === 0) {
        throw new BadRequestException(
          `Expense ${expense.expenseNumber} requires at least one receipt`,
        );
      }
    }

    await this.prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
      },
      data: {
        status: ExpenseStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return { submitted: expenseIds.length };
  }

  async bulkDelete(userId: string, expenseIds: string[]) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
      },
    });

    if (expenses.length !== expenseIds.length) {
      throw new NotFoundException('One or more expenses not found');
    }

    for (const expense of expenses) {
      if (expense.submitterId !== userId) {
        throw new ForbiddenException('You can only delete your own expenses');
      }
      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException(`Expense ${expense.expenseNumber} is not in draft status`);
      }
    }

    await this.prisma.expense.deleteMany({
      where: {
        id: { in: expenseIds },
      },
    });

    return { deleted: expenseIds.length };
  }

  async getApprovals(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        submitter: {
          select: { id: true, departmentId: true },
        },
        approvalHistory: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Org-wide visibility roles (can see all expenses)
    const isOrgWide =
      user.role === RoleType.ADMIN ||
      user.role === RoleType.FINANCE ||
      user.role === RoleType.CEO ||
      user.role === RoleType.SUPER_APPROVER;

    // Department-scoped visibility (can see own + department expenses)
    const isDepartmentScoped = user.role === RoleType.APPROVER;

    // Check access
    const isOwnExpense = expense.submitterId === user.id;
    const isSameDepartment =
      isDepartmentScoped &&
      user.departmentId &&
      expense.submitter.departmentId === user.departmentId;

    if (!isOrgWide && !isOwnExpense && !isSameDepartment) {
      throw new ForbiddenException('You do not have access to this expense');
    }

    return expense.approvalHistory;
  }

  private async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastExpense = await this.prisma.expense.findFirst({
      where: {
        expenseNumber: {
          startsWith: `EXP-${year}`,
        },
      },
      orderBy: { expenseNumber: 'desc' },
    });

    let sequence = 1;
    if (lastExpense) {
      const lastSequence = parseInt(lastExpense.expenseNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `EXP-${year}-${sequence.toString().padStart(5, '0')}`;
  }
}
