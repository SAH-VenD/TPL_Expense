import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { TransferBudgetDto } from './dto/transfer-budget.dto';
import { CheckExpenseDto } from './dto/check-expense.dto';
import { BudgetSummaryQueryDto } from './dto/budget-summary-query.dto';
import {
  BudgetUtilizationDto,
  BudgetCheckResultDto,
  ExpenseBudgetCheckDto,
  BudgetSummaryDto,
  BudgetTransferResultDto,
  BudgetPeriodDatesDto,
  CurrentPeriodDto,
  EnforcementAction,
  BudgetStatus,
} from './dto/budget-responses.dto';
import {
  BudgetType,
  BudgetPeriod,
  BudgetEnforcement,
  ExpenseStatus,
  Budget,
  User,
  RoleType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD OPERATIONS ====================

  async create(createBudgetDto: CreateBudgetDto, userId?: string) {
    // Validate dates
    const startDate = new Date(createBudgetDto.startDate);
    const endDate = new Date(createBudgetDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate reference ID based on type
    await this.validateBudgetReference(createBudgetDto);

    return this.prisma.budget.create({
      data: {
        name: createBudgetDto.name,
        type: createBudgetDto.type,
        period: createBudgetDto.period,
        totalAmount: createBudgetDto.totalAmount,
        warningThreshold: createBudgetDto.warningThreshold ?? 80,
        enforcement: createBudgetDto.enforcement ?? BudgetEnforcement.SOFT_WARNING,
        startDate,
        endDate,
        departmentId: createBudgetDto.departmentId,
        projectId: createBudgetDto.projectId,
        costCenterId: createBudgetDto.costCenterId,
        categoryId: createBudgetDto.categoryId,
        employeeId: createBudgetDto.employeeId,
        ownerId: userId,
        isActive: true,
      },
      include: {
        department: true,
        project: true,
        category: true,
        costCenter: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAll(
    type?: BudgetType,
    activeOnly: boolean = true,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const where = {
      ...(activeOnly && { isActive: true }),
      ...(type && { type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        include: {
          department: true,
          project: true,
          category: true,
          costCenter: true,
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.budget.count({ where }),
    ]);

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
    };
  }

  async findOne(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        category: true,
        costCenter: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return budget;
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
      include: {
        department: true,
        project: true,
        category: true,
        costCenter: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
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

  // ==================== ENHANCED UTILIZATION ====================

  async getUtilization(id: string): Promise<BudgetUtilizationDto> {
    const budget = await this.findOne(id);
    return this.calculateUtilization(budget);
  }

  async calculateUtilization(budget: Budget): Promise<BudgetUtilizationDto> {
    // Build where clause based on budget type
    const expenseWhere = this.buildExpenseWhereClause(budget);

    // Get all expenses linked to this budget within the period
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...expenseWhere,
        expenseDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        status: {
          notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED],
        },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        amountInPKR: true,
      },
    });

    // Calculate committed (PENDING_APPROVAL, SUBMITTED, CLARIFICATION_REQUESTED, RESUBMITTED)
    const pendingStatuses = new Set<ExpenseStatus>([
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.PENDING_APPROVAL,
      ExpenseStatus.CLARIFICATION_REQUESTED,
      ExpenseStatus.RESUBMITTED,
    ]);

    const committed = expenses
      .filter((e) => pendingStatuses.has(e.status))
      .reduce((sum, e) => sum + Number(e.amountInPKR || e.totalAmount), 0);

    // Calculate spent (APPROVED, PAID)
    const spentStatuses = new Set<ExpenseStatus>([ExpenseStatus.APPROVED, ExpenseStatus.PAID]);

    const spent = expenses
      .filter((e) => spentStatuses.has(e.status))
      .reduce((sum, e) => sum + Number(e.amountInPKR || e.totalAmount), 0);

    const allocated = Number(budget.totalAmount);
    const available = allocated - committed - spent;
    const utilization = allocated > 0 ? ((committed + spent) / allocated) * 100 : 0;
    const warningThreshold = Number(budget.warningThreshold);

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      type: budget.type,
      period: budget.period,
      allocated,
      committed,
      spent,
      available,
      utilizationPercentage: Math.round(utilization * 100) / 100,
      isOverBudget: available < 0,
      isAtWarningThreshold: utilization >= warningThreshold,
      warningThreshold,
      expenseCount: expenses.length,
      pendingCount: expenses.filter((e) => pendingStatuses.has(e.status)).length,
      startDate: budget.startDate,
      endDate: budget.endDate,
      enforcement: budget.enforcement,
    };
  }

  // ==================== BUDGET CHECK FOR EXPENSES ====================

  async checkBudgetForExpense(budgetId: string, amount: number): Promise<BudgetCheckResultDto> {
    const budget = await this.findOne(budgetId);
    const utilization = await this.calculateUtilization(budget);

    const allocated = Number(budget.totalAmount);
    const newTotal = utilization.committed + utilization.spent + amount;
    const newUtilization = allocated > 0 ? (newTotal / allocated) * 100 : 0;
    const wouldExceed = newTotal > allocated;
    const wouldTriggerWarning = newUtilization >= utilization.warningThreshold;

    const enforcementAction = this.getEnforcementAction(budget.enforcement, wouldExceed);
    const canProceed = this.canProceed(enforcementAction, wouldExceed);
    const message = this.getCheckMessage(budget, wouldExceed, wouldTriggerWarning);

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      currentUtilization: utilization.utilizationPercentage,
      projectedUtilization: Math.round(newUtilization * 100) / 100,
      expenseAmount: amount,
      availableBefore: utilization.available,
      availableAfter: allocated - newTotal,
      wouldExceed,
      wouldTriggerWarning,
      enforcementAction,
      canProceed,
      message,
    };
  }

  async checkExpenseAgainstBudgets(dto: CheckExpenseDto): Promise<ExpenseBudgetCheckDto> {
    const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : new Date();

    // Find all applicable budgets
    const applicableBudgets = await this.findApplicableBudgets({
      departmentId: dto.departmentId,
      projectId: dto.projectId,
      costCenterId: dto.costCenterId,
      categoryId: dto.categoryId,
      employeeId: dto.employeeId,
      budgetId: dto.budgetId,
      expenseDate,
    });

    if (applicableBudgets.length === 0) {
      return {
        allowed: true,
        hasWarnings: false,
        requiresEscalation: false,
        message: 'No applicable budgets found for this expense',
        budgetResults: [],
      };
    }

    const budgetResults: BudgetCheckResultDto[] = [];
    let allowed = true;
    let hasWarnings = false;
    let requiresEscalation = false;

    for (const budget of applicableBudgets) {
      const result = await this.checkBudgetForExpense(budget.id, dto.amount);
      budgetResults.push(result);

      if (!result.canProceed) {
        allowed = false;
      }

      if (result.wouldTriggerWarning) {
        hasWarnings = true;
      }

      if (result.enforcementAction === EnforcementAction.ESCALATE) {
        requiresEscalation = true;
      }
    }

    // Generate overall message
    let message: string | undefined;
    if (!allowed) {
      const blockedBudgets = budgetResults.filter((r) => !r.canProceed);
      message = `Expense blocked by ${blockedBudgets.length} budget(s): ${blockedBudgets.map((b) => b.budgetName).join(', ')}`;
    } else if (requiresEscalation) {
      message = 'Expense requires escalation due to budget constraints';
    } else if (hasWarnings) {
      const warningBudgets = budgetResults.filter((r) => r.wouldTriggerWarning);
      message = `Warning: ${warningBudgets.length} budget(s) at or above threshold`;
    }

    return {
      allowed,
      hasWarnings,
      requiresEscalation,
      message,
      budgetResults,
    };
  }

  // ==================== FIND APPLICABLE BUDGETS ====================

  async findApplicableBudgets(params: {
    departmentId?: string;
    projectId?: string;
    costCenterId?: string;
    categoryId?: string;
    employeeId?: string;
    budgetId?: string;
    expenseDate: Date;
  }): Promise<Budget[]> {
    const budgets: Budget[] = [];
    const now = params.expenseDate;

    // 1. Check for explicit budget assignment
    if (params.budgetId) {
      const budget = await this.prisma.budget.findFirst({
        where: {
          id: params.budgetId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (budget) budgets.push(budget);
    }

    // 2. Check department budget
    if (params.departmentId) {
      const deptBudget = await this.prisma.budget.findFirst({
        where: {
          type: BudgetType.DEPARTMENT,
          departmentId: params.departmentId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (deptBudget && !budgets.some((b) => b.id === deptBudget.id)) {
        budgets.push(deptBudget);
      }
    }

    // 3. Check project budget
    if (params.projectId) {
      const projectBudget = await this.prisma.budget.findFirst({
        where: {
          type: BudgetType.PROJECT,
          projectId: params.projectId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (projectBudget && !budgets.some((b) => b.id === projectBudget.id)) {
        budgets.push(projectBudget);
      }
    }

    // 4. Check cost center budget
    if (params.costCenterId) {
      const ccBudget = await this.prisma.budget.findFirst({
        where: {
          type: BudgetType.COST_CENTER,
          costCenterId: params.costCenterId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (ccBudget && !budgets.some((b) => b.id === ccBudget.id)) {
        budgets.push(ccBudget);
      }
    }

    // 5. Check category budget
    if (params.categoryId) {
      const categoryBudget = await this.prisma.budget.findFirst({
        where: {
          type: BudgetType.CATEGORY,
          categoryId: params.categoryId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (categoryBudget && !budgets.some((b) => b.id === categoryBudget.id)) {
        budgets.push(categoryBudget);
      }
    }

    // 6. Check employee budget
    if (params.employeeId) {
      const employeeBudget = await this.prisma.budget.findFirst({
        where: {
          type: BudgetType.EMPLOYEE,
          employeeId: params.employeeId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (employeeBudget && !budgets.some((b) => b.id === employeeBudget.id)) {
        budgets.push(employeeBudget);
      }
    }

    return budgets;
  }

  // ==================== BUDGET PERIOD CALCULATIONS ====================

  getBudgetPeriodDates(
    periodType: BudgetPeriod,
    fiscalYear: number,
    quarter?: number,
    month?: number,
  ): BudgetPeriodDatesDto {
    switch (periodType) {
      case BudgetPeriod.ANNUAL:
        return {
          startDate: new Date(fiscalYear, 0, 1), // Jan 1
          endDate: new Date(fiscalYear, 11, 31, 23, 59, 59), // Dec 31
        };

      case BudgetPeriod.QUARTERLY: {
        if (!quarter || quarter < 1 || quarter > 4) {
          throw new BadRequestException('Quarter must be between 1 and 4 for quarterly budgets');
        }
        const qStartMonth = (quarter - 1) * 3;
        return {
          startDate: new Date(fiscalYear, qStartMonth, 1),
          endDate: new Date(fiscalYear, qStartMonth + 3, 0, 23, 59, 59), // Last day of quarter
        };
      }

      case BudgetPeriod.MONTHLY:
        if (!month || month < 1 || month > 12) {
          throw new BadRequestException('Month must be between 1 and 12 for monthly budgets');
        }
        return {
          startDate: new Date(fiscalYear, month - 1, 1),
          endDate: new Date(fiscalYear, month, 0, 23, 59, 59), // Last day of month
        };

      case BudgetPeriod.PROJECT_BASED:
        throw new BadRequestException('Project-based budgets require explicit start and end dates');

      default:
        throw new BadRequestException(`Unknown period type: ${periodType}`);
    }
  }

  getCurrentPeriod(periodType: BudgetPeriod): CurrentPeriodDto {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    switch (periodType) {
      case BudgetPeriod.ANNUAL:
        return { year };
      case BudgetPeriod.QUARTERLY:
        return { year, quarter };
      case BudgetPeriod.MONTHLY:
        return { year, month };
      case BudgetPeriod.PROJECT_BASED:
        return { year };
      default:
        return { year };
    }
  }

  // ==================== BUDGET TRANSFERS ====================

  async transferBudget(dto: TransferBudgetDto, userId: string): Promise<BudgetTransferResultDto> {
    // Validate budgets exist
    const fromBudget = await this.findOne(dto.fromBudgetId);
    const toBudget = await this.findOne(dto.toBudgetId);

    // Validate same currency (both use PKR as default)
    if (fromBudget.currency !== toBudget.currency) {
      throw new BadRequestException('Cannot transfer between budgets with different currencies');
    }

    // Validate source budget has sufficient available amount
    const fromUtilization = await this.calculateUtilization(fromBudget);
    if (fromUtilization.available < dto.amount) {
      throw new BadRequestException(
        `Insufficient available budget. Available: ${fromUtilization.available.toFixed(2)}, Requested: ${dto.amount}`,
      );
    }

    // Validate budgets are active
    if (!fromBudget.isActive || !toBudget.isActive) {
      throw new BadRequestException('Both budgets must be active to perform a transfer');
    }

    // Perform the transfer atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Reduce source budget
      const updatedFromBudget = await tx.budget.update({
        where: { id: dto.fromBudgetId },
        data: {
          totalAmount: new Decimal(Number(fromBudget.totalAmount) - dto.amount),
        },
      });

      // Increase destination budget
      const updatedToBudget = await tx.budget.update({
        where: { id: dto.toBudgetId },
        data: {
          totalAmount: new Decimal(Number(toBudget.totalAmount) + dto.amount),
        },
      });

      // Create audit log entries for both budgets
      await tx.auditLog.create({
        data: {
          userId,
          action: 'BUDGET_TRANSFER_OUT',
          entityType: 'Budget',
          entityId: dto.fromBudgetId,
          oldValue: { totalAmount: Number(fromBudget.totalAmount) },
          newValue: {
            totalAmount: Number(updatedFromBudget.totalAmount),
            transferAmount: -dto.amount,
            transferTo: dto.toBudgetId,
            reason: dto.reason,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BUDGET_TRANSFER_IN',
          entityType: 'Budget',
          entityId: dto.toBudgetId,
          oldValue: { totalAmount: Number(toBudget.totalAmount) },
          newValue: {
            totalAmount: Number(updatedToBudget.totalAmount),
            transferAmount: dto.amount,
            transferFrom: dto.fromBudgetId,
            reason: dto.reason,
          },
        },
      });

      return {
        fromBudgetNewBalance: Number(updatedFromBudget.totalAmount),
        toBudgetNewBalance: Number(updatedToBudget.totalAmount),
      };
    });

    return {
      success: true,
      message: `Successfully transferred ${dto.amount} from "${fromBudget.name}" to "${toBudget.name}"`,
      fromBudgetId: dto.fromBudgetId,
      toBudgetId: dto.toBudgetId,
      amount: dto.amount,
      fromBudgetNewBalance: result.fromBudgetNewBalance,
      toBudgetNewBalance: result.toBudgetNewBalance,
    };
  }

  // ==================== BUDGET STATUS MANAGEMENT ====================

  async activateBudget(id: string, userId: string): Promise<Budget> {
    const budget = await this.findOne(id);

    // Validate budget can be activated
    const now = new Date();
    if (budget.endDate < now) {
      throw new BadRequestException('Cannot activate a budget with an end date in the past');
    }

    if (budget.isActive) {
      throw new BadRequestException('Budget is already active');
    }

    const updatedBudget = await this.prisma.budget.update({
      where: { id },
      data: { isActive: true },
      include: {
        department: true,
        project: true,
        category: true,
        costCenter: true,
      },
    });

    // Log the activation
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BUDGET_ACTIVATED',
        entityType: 'Budget',
        entityId: id,
        oldValue: { isActive: false },
        newValue: { isActive: true },
      },
    });

    return updatedBudget;
  }

  async closeBudget(id: string, userId: string): Promise<Budget> {
    const budget = await this.findOne(id);

    if (!budget.isActive) {
      throw new BadRequestException('Budget is already inactive/closed');
    }

    // Get final utilization before closing
    const utilization = await this.calculateUtilization(budget);

    const updatedBudget = await this.prisma.budget.update({
      where: { id },
      data: {
        isActive: false,
        usedAmount: utilization.committed + utilization.spent,
      },
      include: {
        department: true,
        project: true,
        category: true,
        costCenter: true,
      },
    });

    // Log the closure with final utilization
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BUDGET_CLOSED',
        entityType: 'Budget',
        entityId: id,
        oldValue: { isActive: true },
        newValue: {
          isActive: false,
          finalUtilization: {
            allocated: utilization.allocated,
            committed: utilization.committed,
            spent: utilization.spent,
            available: utilization.available,
            utilizationPercentage: utilization.utilizationPercentage,
          },
        },
      },
    });

    return updatedBudget;
  }

  async archiveBudget(id: string, userId: string): Promise<Budget> {
    const budget = await this.findOne(id);

    // Budget must be closed (inactive) before archiving
    if (budget.isActive) {
      throw new BadRequestException('Budget must be closed before archiving');
    }

    // Check if budget period has ended
    const now = new Date();
    if (budget.endDate > now) {
      throw new BadRequestException('Cannot archive a budget before its end date');
    }

    // Log the archive action (we use isActive = false for both closed and archived)
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BUDGET_ARCHIVED',
        entityType: 'Budget',
        entityId: id,
        newValue: { archived: true, archivedAt: new Date() },
      },
    });

    return budget;
  }

  getBudgetStatus(budget: Budget): BudgetStatus {
    const now = new Date();

    if (!budget.isActive) {
      // Could be CLOSED or ARCHIVED - check if period has ended
      if (budget.endDate < now) {
        return BudgetStatus.ARCHIVED;
      }
      return BudgetStatus.CLOSED;
    }

    // Active budget
    if (budget.startDate > now) {
      return BudgetStatus.DRAFT; // Future budget
    }

    return BudgetStatus.ACTIVE;
  }

  // ==================== BUDGET SUMMARY/REPORTS ====================

  /**
   * Get budget summary
   * For EMPLOYEE role, only shows budgets for their department
   */
  async getBudgetSummary(query: BudgetSummaryQueryDto, user?: User): Promise<BudgetSummaryDto> {
    const where: any = {};

    if (query.activeOnly !== false) {
      where.isActive = true;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.periodType) {
      where.period = query.periodType;
    }

    // EMPLOYEE users only see their department's budgets
    if (user?.role === RoleType.EMPLOYEE && user.departmentId) {
      where.departmentId = user.departmentId;
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.fiscalYear) {
      const yearStart = new Date(query.fiscalYear, 0, 1);
      const yearEnd = new Date(query.fiscalYear, 11, 31, 23, 59, 59);

      if (query.quarter) {
        const qStartMonth = (query.quarter - 1) * 3;
        where.startDate = { gte: new Date(query.fiscalYear, qStartMonth, 1) };
        where.endDate = { lte: new Date(query.fiscalYear, qStartMonth + 3, 0, 23, 59, 59) };
      } else {
        where.startDate = { gte: yearStart };
        where.endDate = { lte: yearEnd };
      }
    }

    const budgets = await this.prisma.budget.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Calculate utilization for each budget
    const budgetUtilizations: BudgetUtilizationDto[] = [];
    let totalAllocated = 0;
    let totalCommitted = 0;
    let totalSpent = 0;
    let budgetsOverThreshold = 0;
    let budgetsExceeded = 0;
    let activeBudgets = 0;

    for (const budget of budgets) {
      const utilization = await this.calculateUtilization(budget);
      budgetUtilizations.push(utilization);

      totalAllocated += utilization.allocated;
      totalCommitted += utilization.committed;
      totalSpent += utilization.spent;

      if (utilization.isAtWarningThreshold) {
        budgetsOverThreshold++;
      }

      if (utilization.isOverBudget) {
        budgetsExceeded++;
      }

      if (budget.isActive) {
        activeBudgets++;
      }
    }

    const totalAvailable = totalAllocated - totalCommitted - totalSpent;
    const overallUtilization =
      totalAllocated > 0 ? ((totalCommitted + totalSpent) / totalAllocated) * 100 : 0;

    return {
      generatedAt: new Date(),
      summary: {
        totalBudgets: budgets.length,
        totalAllocated,
        totalCommitted,
        totalSpent,
        totalAvailable,
        overallUtilization: Math.round(overallUtilization * 100) / 100,
        budgetsOverThreshold,
        budgetsExceeded,
        activeBudgets,
      },
      budgets: budgetUtilizations,
    };
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * @deprecated Use checkExpenseAgainstBudgets instead
   */
  async checkBudgetForExpenseLegacy(expense: any): Promise<{
    allowed: boolean;
    warning: boolean;
    message?: string;
  }> {
    const result = await this.checkExpenseAgainstBudgets({
      amount: Number(expense.totalAmount || expense.amount),
      departmentId: expense.submitter?.departmentId,
      projectId: expense.projectId,
      categoryId: expense.categoryId,
      employeeId: expense.submitterId,
    });

    return {
      allowed: result.allowed,
      warning: result.hasWarnings,
      message: result.message,
    };
  }

  // ==================== HELPER METHODS ====================

  private buildExpenseWhereClause(budget: Budget): any {
    const where: any = {};

    switch (budget.type) {
      case BudgetType.DEPARTMENT:
        if (budget.departmentId) {
          where.OR = [
            { departmentId: budget.departmentId },
            { submitter: { departmentId: budget.departmentId } },
          ];
        }
        break;

      case BudgetType.PROJECT:
        if (budget.projectId) {
          where.projectId = budget.projectId;
        }
        break;

      case BudgetType.COST_CENTER:
        if (budget.costCenterId) {
          where.costCenterId = budget.costCenterId;
        }
        break;

      case BudgetType.CATEGORY:
        if (budget.categoryId) {
          where.categoryId = budget.categoryId;
        }
        break;

      case BudgetType.EMPLOYEE:
        if (budget.employeeId) {
          where.submitterId = budget.employeeId;
        }
        break;
    }

    // Also check for explicitly linked expenses
    if (Object.keys(where).length > 0) {
      where.OR = [...(where.OR || []), { budgetId: budget.id }];
    } else {
      where.budgetId = budget.id;
    }

    return where;
  }

  private getEnforcementAction(
    enforcement: BudgetEnforcement,
    wouldExceed: boolean,
  ): EnforcementAction {
    if (!wouldExceed) {
      return EnforcementAction.NONE;
    }

    switch (enforcement) {
      case BudgetEnforcement.HARD_BLOCK:
        return EnforcementAction.HARD_BLOCK;
      case BudgetEnforcement.SOFT_WARNING:
        return EnforcementAction.SOFT_WARNING;
      case BudgetEnforcement.AUTO_ESCALATE:
        return EnforcementAction.ESCALATE;
      default:
        return EnforcementAction.NONE;
    }
  }

  private canProceed(action: EnforcementAction, wouldExceed: boolean): boolean {
    if (!wouldExceed) return true;

    switch (action) {
      case EnforcementAction.HARD_BLOCK:
        return false;
      case EnforcementAction.SOFT_WARNING:
      case EnforcementAction.ESCALATE:
      case EnforcementAction.NONE:
        return true;
    }
  }

  private getCheckMessage(
    budget: Budget,
    wouldExceed: boolean,
    wouldTriggerWarning: boolean,
  ): string | undefined {
    if (wouldExceed) {
      switch (budget.enforcement) {
        case BudgetEnforcement.HARD_BLOCK:
          return `Cannot submit: This expense would exceed budget "${budget.name}"`;
        case BudgetEnforcement.SOFT_WARNING:
          return `Warning: This expense will exceed budget "${budget.name}"`;
        case BudgetEnforcement.AUTO_ESCALATE:
          return `This expense exceeds budget "${budget.name}" and will require additional approval`;
        default:
          return `Note: This expense will exceed budget "${budget.name}"`;
      }
    }

    if (wouldTriggerWarning) {
      return `Warning: Budget "${budget.name}" will reach ${budget.warningThreshold}% utilization`;
    }

    return undefined;
  }

  private async validateBudgetReference(dto: CreateBudgetDto): Promise<void> {
    switch (dto.type) {
      case BudgetType.DEPARTMENT:
        if (dto.departmentId) {
          const dept = await this.prisma.department.findUnique({
            where: { id: dto.departmentId },
          });
          if (!dept) {
            throw new BadRequestException(`Department with ID ${dto.departmentId} not found`);
          }
        }
        break;

      case BudgetType.PROJECT:
        if (dto.projectId) {
          const project = await this.prisma.project.findUnique({
            where: { id: dto.projectId },
          });
          if (!project) {
            throw new BadRequestException(`Project with ID ${dto.projectId} not found`);
          }
        }
        break;

      case BudgetType.COST_CENTER:
        if (dto.costCenterId) {
          const cc = await this.prisma.costCenter.findUnique({
            where: { id: dto.costCenterId },
          });
          if (!cc) {
            throw new BadRequestException(`Cost Center with ID ${dto.costCenterId} not found`);
          }
        }
        break;

      case BudgetType.CATEGORY:
        if (dto.categoryId) {
          const cat = await this.prisma.category.findUnique({
            where: { id: dto.categoryId },
          });
          if (!cat) {
            throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
          }
        }
        break;

      case BudgetType.EMPLOYEE:
        if (dto.employeeId) {
          const emp = await this.prisma.user.findUnique({
            where: { id: dto.employeeId },
          });
          if (!emp) {
            throw new BadRequestException(`Employee with ID ${dto.employeeId} not found`);
          }
        }
        break;
    }
  }
}
