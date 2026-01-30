import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetType, ExpenseStatus } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(createBudgetDto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        ...createBudgetDto,
        startDate: new Date(createBudgetDto.startDate),
        endDate: new Date(createBudgetDto.endDate),
      },
    });
  }

  async findAll(type?: BudgetType) {
    return this.prisma.budget.findMany({
      where: {
        isActive: true,
        ...(type && { type }),
      },
      include: {
        department: true,
        project: true,
        category: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        category: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return budget;
  }

  async getUtilization(id: string) {
    const budget = await this.findOne(id);

    // Calculate actual spend based on budget type
    const where: any = {
      status: ExpenseStatus.APPROVED,
      createdAt: {
        gte: budget.startDate,
        lte: budget.endDate,
      },
    };

    if (budget.departmentId) {
      where.submitter = { departmentId: budget.departmentId };
    } else if (budget.projectId) {
      where.projectId = budget.projectId;
    } else if (budget.categoryId) {
      where.categoryId = budget.categoryId;
    } else if (budget.employeeId) {
      where.submitterId = budget.employeeId;
    }

    const expenses = await this.prisma.expense.aggregate({
      where,
      _sum: { totalAmount: true },
    });

    const usedAmount = Number(expenses._sum.totalAmount || 0);
    const remainingAmount = Number(budget.totalAmount) - usedAmount;
    const utilizationPercentage = (usedAmount / Number(budget.totalAmount)) * 100;
    const isOverWarningThreshold = utilizationPercentage >= Number(budget.warningThreshold);

    return {
      budget,
      usedAmount,
      remainingAmount,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      isOverWarningThreshold,
    };
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto) {
    await this.findOne(id);

    return this.prisma.budget.update({
      where: { id },
      data: {
        ...updateBudgetDto,
        ...(updateBudgetDto.startDate && { startDate: new Date(updateBudgetDto.startDate) }),
        ...(updateBudgetDto.endDate && { endDate: new Date(updateBudgetDto.endDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.budget.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async checkBudgetForExpense(expense: any): Promise<{
    allowed: boolean;
    warning: boolean;
    message?: string;
  }> {
    // Find applicable budgets
    const budgets = await this.prisma.budget.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        OR: [
          { departmentId: expense.submitter?.departmentId },
          { projectId: expense.projectId },
          { categoryId: expense.categoryId },
          { employeeId: expense.submitterId },
        ],
      },
    });

    for (const budget of budgets) {
      const utilization = await this.getUtilization(budget.id);
      const newUtilization =
        ((utilization.usedAmount + Number(expense.totalAmount)) / Number(budget.totalAmount)) * 100;

      if (newUtilization > 100 && budget.enforcement === 'HARD_BLOCK') {
        return {
          allowed: false,
          warning: false,
          message: `Budget "${budget.name}" exceeded. Limit: ${budget.totalAmount}`,
        };
      }

      if (newUtilization >= Number(budget.warningThreshold)) {
        return {
          allowed: true,
          warning: true,
          message: `Budget "${budget.name}" at ${Math.round(newUtilization)}%`,
        };
      }
    }

    return { allowed: true, warning: false };
  }
}
