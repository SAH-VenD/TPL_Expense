import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseStatus, RoleType, User } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    const expenseNumber = await this.generateExpenseNumber();

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
        totalAmount: createExpenseDto.amount + (createExpenseDto.taxAmount || 0),
        currency: createExpenseDto.currency,
        exchangeRate: createExpenseDto.exchangeRate,
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

  async findAll(user: User, filters: { status?: ExpenseStatus; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    const where = {
      ...(isAdmin ? {} : { submitterId: user.id }),
      ...(status && { status }),
    };

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
        orderBy: { createdAt: 'desc' },
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

  async findOne(id: string, user: User) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        submitter: {
          select: { id: true, firstName: true, lastName: true, email: true },
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

    const isAdmin = user.role === RoleType.ADMIN || user.role === RoleType.FINANCE;

    if (!isAdmin && expense.submitterId !== user.id) {
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
