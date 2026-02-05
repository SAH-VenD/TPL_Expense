import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExportReportDto, ReportType } from './dto/export-report.dto';
import {
  ReportQueryDto,
  MonthlyTrendQueryDto,
  ApprovalTurnaroundQueryDto,
  ReimbursementStatusQueryDto,
  DashboardQueryDto,
} from './dto/report-query.dto';
import {
  SpendByEmployeeReportDto,
  SpendByProjectReportDto,
  SpendByCostCenterReportDto,
  MonthlyTrendReportDto,
  MonthlyTrendItemDto,
  ApprovalTurnaroundReportDto,
  ApprovalTurnaroundStatsDto,
  ReimbursementStatusReportDto,
  DashboardSummaryReportDto,
  DashboardMetricDto,
} from './dto/report-responses.dto';
import { ExpenseStatus, VoucherStatus, ApprovalAction, RoleType, User } from '@prisma/client';
import * as ExcelJS from 'exceljs';

/**
 * Month names for display
 */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Statuses considered as "approved" for financial reports
 */
const APPROVED_STATUSES: ExpenseStatus[] = [ExpenseStatus.APPROVED, ExpenseStatus.PAID];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== EXISTING REPORTS ====================

  /**
   * Get spend breakdown by department
   */
  async getSpendByDepartment(startDate?: string, endDate?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: APPROVED_STATUSES },
        ...dateFilter,
      },
      include: {
        submitter: {
          include: {
            department: true,
          },
        },
      },
    });

    const departmentSpend = expenses.reduce(
      (acc, expense) => {
        const deptName = expense.submitter.department?.name || 'Unknown';
        acc[deptName] = (acc[deptName] || 0) + Number(expense.totalAmount);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(departmentSpend).map(([department, amount]) => ({
      department,
      amount,
    }));
  }

  /**
   * Get spend breakdown by category
   * For EMPLOYEE role, only shows their own expenses
   */
  async getSpendByCategory(startDate?: string, endDate?: string, user?: User) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    // Build where clause - filter by submitterId for EMPLOYEE role
    const whereClause: Record<string, unknown> = {
      status: { in: APPROVED_STATUSES },
      ...dateFilter,
    };

    // EMPLOYEE users only see their own data
    if (user?.role === RoleType.EMPLOYEE) {
      whereClause.submitterId = user.id;
    }

    const result = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: result.map((r) => r.categoryId) },
      },
    });

    // Calculate total for percentage calculation
    const totalAmount = result.reduce((sum, r) => sum + Number(r._sum.totalAmount || 0), 0);

    return result.map((r) => {
      const amount = Number(r._sum.totalAmount || 0);
      return {
        categoryId: r.categoryId,
        categoryName: categories.find((c) => c.id === r.categoryId)?.name || 'Unknown',
        totalAmount: amount,
        count: r._count,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      };
    });
  }

  /**
   * Get spend breakdown by vendor
   */
  async getSpendByVendor(startDate?: string, endDate?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const result = await this.prisma.expense.groupBy({
      by: ['vendorId'],
      where: {
        status: { in: APPROVED_STATUSES },
        vendorId: { not: null },
        ...dateFilter,
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const vendors = await this.prisma.vendor.findMany({
      where: {
        id: { in: result.map((r) => r.vendorId!).filter(Boolean) },
      },
    });

    return result.map((r) => ({
      vendor: vendors.find((v) => v.id === r.vendorId)?.name || 'Unknown',
      amount: Number(r._sum.totalAmount),
      count: r._count,
    }));
  }

  /**
   * Get budget vs actual comparison
   */
  async getBudgetVsActual() {
    const budgets = await this.prisma.budget.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        department: true,
        project: true,
        category: true,
      },
    });

    const result = [];

    for (const budget of budgets) {
      const where: Record<string, unknown> = {
        status: { in: APPROVED_STATUSES },
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
      }

      const actual = await this.prisma.expense.aggregate({
        where,
        _sum: { totalAmount: true },
      });

      result.push({
        name: budget.name,
        type: budget.type,
        budgetAmount: Number(budget.totalAmount),
        actualAmount: Number(actual._sum.totalAmount || 0),
        variance: Number(budget.totalAmount) - Number(actual._sum.totalAmount || 0),
        utilizationPercentage:
          (Number(actual._sum.totalAmount || 0) / Number(budget.totalAmount)) * 100,
      });
    }

    return result;
  }

  /**
   * Get outstanding advances (disbursed vouchers not yet settled)
   */
  async getOutstandingAdvances() {
    return this.prisma.voucher.findMany({
      where: {
        status: VoucherStatus.DISBURSED,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { settlementDeadline: 'asc' },
    });
  }

  /**
   * Get tax summary for FBR compliance
   */
  async getTaxSummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: APPROVED_STATUSES },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    const taxBreakdown = expenses.reduce(
      (acc, expense) => {
        const taxType = expense.taxType || 'NONE';
        if (!acc[taxType]) {
          acc[taxType] = { amount: 0, taxAmount: 0, count: 0 };
        }
        acc[taxType].amount += Number(expense.amount);
        acc[taxType].taxAmount += Number(expense.taxAmount || 0);
        acc[taxType].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; taxAmount: number; count: number }>,
    );

    return {
      year: targetYear,
      totalExpenses: expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0),
      totalTax: expenses.reduce((sum, exp) => sum + Number(exp.taxAmount || 0), 0),
      breakdown: taxBreakdown,
    };
  }

  // ==================== NEW REPORTS ====================

  /**
   * Get spend breakdown by employee
   */
  async getSpendByEmployee(query: ReportQueryDto): Promise<SpendByEmployeeReportDto> {
    const dateFilter = this.getDateFilter(query.startDate, query.endDate);

    const where: Record<string, unknown> = {
      status: { in: APPROVED_STATUSES },
      ...dateFilter,
    };

    if (query.departmentId) {
      where.submitter = { departmentId: query.departmentId };
    }

    const result = await this.prisma.expense.groupBy({
      by: ['submitterId'],
      where,
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: result.map((r) => r.submitterId) },
      },
      include: {
        department: true,
      },
    });

    const items = result.map((r) => {
      const user = users.find((u) => u.id === r.submitterId);
      const totalAmount = Number(r._sum.totalAmount || 0);
      return {
        employeeId: r.submitterId,
        employeeName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        email: user?.email || '',
        department: user?.department?.name,
        totalAmount,
        expenseCount: r._count,
        averageAmount: r._count > 0 ? totalAmount / r._count : 0,
      };
    });

    // Sort by total amount descending
    items.sort((a, b) => b.totalAmount - a.totalAmount);

    const grandTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalExpenses = items.reduce((sum, item) => sum + item.expenseCount, 0);

    return {
      items,
      grandTotal,
      totalExpenses,
    };
  }

  /**
   * Get spend breakdown by project
   */
  async getSpendByProject(query: ReportQueryDto): Promise<SpendByProjectReportDto> {
    const dateFilter = this.getDateFilter(query.startDate, query.endDate);

    const where: Record<string, unknown> = {
      status: { in: APPROVED_STATUSES },
      ...dateFilter,
    };

    if (query.departmentId) {
      where.submitter = { departmentId: query.departmentId };
    }

    // Get expenses with project
    const projectExpenses = await this.prisma.expense.groupBy({
      by: ['projectId'],
      where: {
        ...where,
        projectId: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Get expenses without project (unallocated)
    const unallocatedResult = await this.prisma.expense.aggregate({
      where: {
        ...where,
        projectId: null,
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const projectIds = projectExpenses
      .map((r) => r.projectId)
      .filter((id): id is string => id !== null);

    const projects = await this.prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
    });

    // Get budgets for projects
    const projectBudgets = await this.prisma.budget.findMany({
      where: {
        projectId: { in: projectIds },
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const items = projectExpenses.map((r) => {
      const project = projects.find((p) => p.id === r.projectId);
      const budget = projectBudgets.find((b) => b.projectId === r.projectId);
      const totalAmount = Number(r._sum.totalAmount || 0);
      const budgetAmount = budget ? Number(budget.totalAmount) : undefined;

      return {
        projectId: r.projectId!,
        projectName: project?.name || 'Unknown',
        projectCode: project?.code || '',
        clientName: project?.clientName || undefined,
        totalAmount,
        expenseCount: r._count,
        budgetAllocated: budgetAmount,
        budgetUtilization: budgetAmount ? (totalAmount / budgetAmount) * 100 : undefined,
      };
    });

    // Sort by total amount descending
    items.sort((a, b) => b.totalAmount - a.totalAmount);

    const grandTotal =
      items.reduce((sum, item) => sum + item.totalAmount, 0) +
      Number(unallocatedResult._sum.totalAmount || 0);
    const totalExpenses =
      items.reduce((sum, item) => sum + item.expenseCount, 0) + (unallocatedResult._count || 0);

    return {
      items,
      grandTotal,
      totalExpenses,
      unallocatedAmount: Number(unallocatedResult._sum.totalAmount || 0),
    };
  }

  /**
   * Get spend breakdown by cost center
   */
  async getSpendByCostCenter(query: ReportQueryDto): Promise<SpendByCostCenterReportDto> {
    const dateFilter = this.getDateFilter(query.startDate, query.endDate);

    const where: Record<string, unknown> = {
      status: { in: APPROVED_STATUSES },
      ...dateFilter,
    };

    if (query.departmentId) {
      where.submitter = { departmentId: query.departmentId };
    }

    // Get expenses with cost center
    const costCenterExpenses = await this.prisma.expense.groupBy({
      by: ['costCenterId'],
      where: {
        ...where,
        costCenterId: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Get expenses without cost center (unallocated)
    const unallocatedResult = await this.prisma.expense.aggregate({
      where: {
        ...where,
        costCenterId: null,
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const costCenterIds = costCenterExpenses
      .map((r) => r.costCenterId)
      .filter((id): id is string => id !== null);

    const costCenters = await this.prisma.costCenter.findMany({
      where: {
        id: { in: costCenterIds },
      },
      include: {
        department: true,
      },
    });

    // Get budgets for cost centers
    const costCenterBudgets = await this.prisma.budget.findMany({
      where: {
        costCenterId: { in: costCenterIds },
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const items = costCenterExpenses.map((r) => {
      const costCenter = costCenters.find((cc) => cc.id === r.costCenterId);
      const budget = costCenterBudgets.find((b) => b.costCenterId === r.costCenterId);
      const totalAmount = Number(r._sum.totalAmount || 0);
      const budgetAmount = budget ? Number(budget.totalAmount) : undefined;

      return {
        costCenterId: r.costCenterId!,
        costCenterName: costCenter?.name || 'Unknown',
        costCenterCode: costCenter?.code || '',
        department: costCenter?.department?.name,
        totalAmount,
        expenseCount: r._count,
        budgetAllocated: budgetAmount,
        budgetUtilization: budgetAmount ? (totalAmount / budgetAmount) * 100 : undefined,
      };
    });

    // Sort by total amount descending
    items.sort((a, b) => b.totalAmount - a.totalAmount);

    const grandTotal =
      items.reduce((sum, item) => sum + item.totalAmount, 0) +
      Number(unallocatedResult._sum.totalAmount || 0);
    const totalExpenses =
      items.reduce((sum, item) => sum + item.expenseCount, 0) + (unallocatedResult._count || 0);

    return {
      items,
      grandTotal,
      totalExpenses,
      unallocatedAmount: Number(unallocatedResult._sum.totalAmount || 0),
    };
  }

  /**
   * Get monthly trend report
   * For EMPLOYEE role, only shows their own expenses
   */
  async getMonthlyTrend(query: MonthlyTrendQueryDto, user?: User): Promise<MonthlyTrendReportDto> {
    const year = query.year || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const where: Record<string, unknown> = {
      status: { in: APPROVED_STATUSES },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // EMPLOYEE users only see their own data
    if (user?.role === RoleType.EMPLOYEE) {
      where.submitterId = user.id;
    } else if (query.departmentId) {
      where.submitter = { departmentId: query.departmentId };
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Initialize all 12 months with zeros
    const monthlyData: Record<number, { amount: number; count: number }> = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { amount: 0, count: 0 };
    }

    // Aggregate expenses by month
    for (const expense of expenses) {
      const month = expense.createdAt.getMonth() + 1; // 1-indexed
      monthlyData[month].amount += Number(expense.totalAmount);
      monthlyData[month].count += 1;
    }

    // Build months array with change percentage
    const months: MonthlyTrendItemDto[] = [];
    let previousAmount = 0;

    for (let month = 1; month <= 12; month++) {
      const data = monthlyData[month];
      const changePercentage =
        month > 1 && previousAmount > 0
          ? ((data.amount - previousAmount) / previousAmount) * 100
          : undefined;

      months.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        year,
        totalAmount: data.amount,
        expenseCount: data.count,
        averageAmount: data.count > 0 ? data.amount / data.count : 0,
        changePercentage,
      });

      previousAmount = data.amount;
    }

    const ytdTotal = months.reduce((sum, m) => sum + m.totalAmount, 0);
    const ytdExpenseCount = months.reduce((sum, m) => sum + m.expenseCount, 0);
    const monthsWithData = months.filter((m) => m.totalAmount > 0).length;
    const monthlyAverage = monthsWithData > 0 ? ytdTotal / monthsWithData : 0;

    // Get previous year total for comparison
    const previousYear = year - 1;
    const previousYearWhere = {
      ...where,
      createdAt: {
        gte: new Date(previousYear, 0, 1),
        lte: new Date(previousYear, 11, 31, 23, 59, 59),
      },
    };

    const previousYearResult = await this.prisma.expense.aggregate({
      where: previousYearWhere,
      _sum: { totalAmount: true },
    });

    const previousYearTotal = Number(previousYearResult._sum.totalAmount || 0);
    const yoyChangePercentage =
      previousYearTotal > 0
        ? ((ytdTotal - previousYearTotal) / previousYearTotal) * 100
        : undefined;

    return {
      year,
      months,
      ytdTotal,
      ytdExpenseCount,
      monthlyAverage,
      previousYearTotal: previousYearTotal > 0 ? previousYearTotal : undefined,
      yoyChangePercentage,
    };
  }

  /**
   * Get approval turnaround time report
   */
  async getApprovalTurnaround(
    query: ApprovalTurnaroundQueryDto,
  ): Promise<ApprovalTurnaroundReportDto> {
    const dateFilter = this.getDateFilter(query.startDate, query.endDate);

    // Get all approved expenses with their first approval
    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: APPROVED_STATUSES },
        ...dateFilter,
      },
      include: {
        submitter: {
          include: {
            department: true,
          },
        },
        approvalHistory: {
          where: {
            action: ApprovalAction.APPROVED,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });

    // Calculate turnaround times
    const turnaroundTimes: Array<{
      days: number;
      departmentId: string | null;
      departmentName: string;
    }> = [];

    for (const expense of expenses) {
      if (expense.approvalHistory.length > 0) {
        const submittedAt = expense.submittedAt || expense.createdAt;
        const approvedAt = expense.approvalHistory[0].createdAt;
        const diffMs = approvedAt.getTime() - submittedAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        turnaroundTimes.push({
          days: diffDays,
          departmentId: expense.submitter.departmentId,
          departmentName: expense.submitter.department?.name || 'Unknown',
        });
      }
    }

    // Filter by department if specified
    const filteredTimes = query.departmentId
      ? turnaroundTimes.filter((t) => t.departmentId === query.departmentId)
      : turnaroundTimes;

    // Calculate overall statistics
    const overall = this.calculateTurnaroundStats(filteredTimes.map((t) => t.days));

    // Get pending count
    const pendingCount = await this.prisma.expense.count({
      where: {
        status: {
          in: [ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_APPROVAL],
        },
        ...(query.departmentId && { submitter: { departmentId: query.departmentId } }),
      },
    });

    // Calculate by department if requested
    let byDepartment: ApprovalTurnaroundReportDto['byDepartment'];
    if (query.byDepartment) {
      const departmentGroups = new Map<string, { name: string; times: number[] }>();

      for (const t of turnaroundTimes) {
        const deptId = t.departmentId || 'unknown';
        if (!departmentGroups.has(deptId)) {
          departmentGroups.set(deptId, { name: t.departmentName, times: [] });
        }
        departmentGroups.get(deptId)!.times.push(t.days);
      }

      byDepartment = Array.from(departmentGroups.entries()).map(([deptId, data]) => ({
        departmentId: deptId,
        departmentName: data.name,
        stats: this.calculateTurnaroundStats(data.times),
      }));
    }

    return {
      overall,
      byDepartment,
      pendingCount,
    };
  }

  /**
   * Get reimbursement status report
   */
  async getReimbursementStatus(
    query: ReimbursementStatusQueryDto,
  ): Promise<ReimbursementStatusReportDto> {
    const dateFilter = this.getDateFilter(query.startDate, query.endDate);

    const where: Record<string, unknown> = {
      ...dateFilter,
    };

    if (query.departmentId) {
      where.submitter = { departmentId: query.departmentId };
    }

    // Get counts by status
    const statusCounts = await this.prisma.expense.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Calculate totals
    let totalCount = 0;
    let totalAmount = 0;
    const breakdown = statusCounts.map((sc) => {
      const count = sc._count;
      const amount = Number(sc._sum.totalAmount || 0);
      totalCount += count;
      totalAmount += amount;
      return {
        status: sc.status,
        count,
        amount,
        percentageOfCount: 0, // Will calculate after
        percentageOfAmount: 0, // Will calculate after
      };
    });

    // Calculate percentages
    for (const item of breakdown) {
      item.percentageOfCount = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
      item.percentageOfAmount = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    }

    // Separate approved (pending reimbursement) and paid (reimbursed)
    const approvedItem = breakdown.find((b) => b.status === ExpenseStatus.APPROVED);
    const paidItem = breakdown.find((b) => b.status === ExpenseStatus.PAID);

    // Calculate average reimbursement time (from APPROVED to PAID)
    // This would require tracking when status changed to PAID, which we don't have
    // For now, we'll return undefined

    return {
      breakdown,
      pendingReimbursement: {
        count: approvedItem?.count || 0,
        amount: approvedItem?.amount || 0,
      },
      reimbursed: {
        count: paidItem?.count || 0,
        amount: paidItem?.amount || 0,
      },
      totals: {
        totalCount,
        totalAmount,
      },
      avgReimbursementDays: undefined, // Would need to track status change timestamps
    };
  }

  /**
   * Get dashboard summary with key metrics
   * For EMPLOYEE role, only shows their own expenses
   */
  async getDashboardSummary(query: DashboardQueryDto, user?: User): Promise<DashboardSummaryReportDto> {
    const periodDays = query.periodDays || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    const baseWhere: Record<string, unknown> = {};

    // EMPLOYEE users only see their own data
    if (user?.role === RoleType.EMPLOYEE) {
      baseWhere.submitterId = user.id;
    } else if (query.departmentId) {
      baseWhere.submitter = { departmentId: query.departmentId };
    }

    // Current period metrics
    const currentExpenses = await this.getExpenseMetrics(startDate, endDate, baseWhere);
    const previousExpenses = await this.getExpenseMetrics(
      previousStartDate,
      previousEndDate,
      baseWhere,
    );

    // Pending approvals
    const pendingApprovals = await this.prisma.expense.findMany({
      where: {
        status: {
          in: [ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_APPROVAL],
        },
        ...baseWhere,
      },
      select: {
        createdAt: true,
      },
    });

    const now = new Date();
    const pendingDays = pendingApprovals.map((e) => {
      const diffMs = now.getTime() - e.createdAt.getTime();
      return diffMs / (1000 * 60 * 60 * 24);
    });

    // Voucher metrics - EMPLOYEE sees only their own vouchers
    const voucherMetrics = await this.getVoucherMetrics(
      user?.role === RoleType.EMPLOYEE ? undefined : query.departmentId,
      user?.role === RoleType.EMPLOYEE ? user.id : undefined,
    );

    // Budget utilization - EMPLOYEE sees their department's budgets
    const budgetDepartmentId = user?.role === RoleType.EMPLOYEE ? user.departmentId : query.departmentId;
    const budgetMetrics = await this.getBudgetMetrics(budgetDepartmentId ?? undefined);

    // Top categories
    const topCategories = await this.getTopCategories(startDate, endDate, baseWhere, 5);

    // Top departments (if not filtering by department or user is EMPLOYEE)
    const topDepartments = (query.departmentId || user?.role === RoleType.EMPLOYEE)
      ? undefined
      : await this.getTopDepartments(startDate, endDate, 5);

    // Recent trend (daily)
    const recentTrend = await this.getRecentTrend(periodDays, baseWhere);

    return {
      period: {
        startDate,
        endDate,
        days: periodDays,
      },
      expenses: {
        total: this.createMetric('Total Expenses', currentExpenses.total, previousExpenses.total),
        approved: this.createMetric(
          'Approved',
          currentExpenses.approved,
          previousExpenses.approved,
        ),
        pending: this.createMetric('Pending', currentExpenses.pending, previousExpenses.pending),
        rejected: this.createMetric(
          'Rejected',
          currentExpenses.rejected,
          previousExpenses.rejected,
        ),
      },
      approvals: {
        pendingCount: pendingApprovals.length,
        oldestPendingDays: pendingDays.length > 0 ? Math.max(...pendingDays) : 0,
        avgPendingDays:
          pendingDays.length > 0 ? pendingDays.reduce((a, b) => a + b, 0) / pendingDays.length : 0,
      },
      vouchers: voucherMetrics,
      budgetUtilization: budgetMetrics,
      topCategories,
      topDepartments,
      recentTrend,
    };
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  /**
   * Export a report to the specified format
   */
  async exportReport(dto: ExportReportDto) {
    const data = await this.getReportData(dto);

    if (dto.format === 'xlsx') {
      return this.generateExcel(dto.reportType, data);
    } else if (dto.format === 'csv') {
      return this.generateCsv(dto.reportType, data);
    }

    return this.generatePdf(dto.reportType, data);
  }

  /**
   * Get report data based on report type
   */
  private async getReportData(dto: ExportReportDto): Promise<unknown[]> {
    const queryParams = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      departmentId: dto.departmentId,
    };

    switch (dto.reportType) {
      case ReportType.SPEND_BY_DEPARTMENT:
        return this.getSpendByDepartment(dto.startDate, dto.endDate);

      case ReportType.SPEND_BY_CATEGORY:
        return this.getSpendByCategory(dto.startDate, dto.endDate);

      case ReportType.SPEND_BY_VENDOR:
        return this.getSpendByVendor(dto.startDate, dto.endDate);

      case ReportType.BUDGET_VS_ACTUAL:
        return this.getBudgetVsActual();

      case ReportType.OUTSTANDING_ADVANCES:
        return this.getOutstandingAdvances();

      case ReportType.TAX_SUMMARY:
        return [await this.getTaxSummary(dto.year)];

      case ReportType.SPEND_BY_EMPLOYEE:
        return (await this.getSpendByEmployee(queryParams)).items;

      case ReportType.SPEND_BY_PROJECT:
        return (await this.getSpendByProject(queryParams)).items;

      case ReportType.SPEND_BY_COST_CENTER:
        return (await this.getSpendByCostCenter(queryParams)).items;

      case ReportType.MONTHLY_TREND:
        return (await this.getMonthlyTrend({ year: dto.year, departmentId: dto.departmentId }))
          .months;

      case ReportType.APPROVAL_TURNAROUND: {
        const turnaroundReport = await this.getApprovalTurnaround({
          startDate: dto.startDate,
          endDate: dto.endDate,
          departmentId: dto.departmentId,
          byDepartment: dto.byDepartment,
        });
        return dto.byDepartment && turnaroundReport.byDepartment
          ? turnaroundReport.byDepartment
          : [turnaroundReport.overall];
      }

      case ReportType.REIMBURSEMENT_STATUS:
        return (await this.getReimbursementStatus(queryParams)).breakdown;

      case ReportType.DASHBOARD_SUMMARY:
        return [await this.getDashboardSummary({ departmentId: dto.departmentId })];

      default:
        return [];
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Build date filter for queries
   */
  private getDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};

    return {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    };
  }

  /**
   * Calculate turnaround statistics from an array of days
   */
  private calculateTurnaroundStats(days: number[]): ApprovalTurnaroundStatsDto {
    if (days.length === 0) {
      return {
        avgDays: 0,
        minDays: 0,
        maxDays: 0,
        medianDays: 0,
        totalApprovals: 0,
      };
    }

    const sorted = [...days].sort((a, b) => a - b);
    const sum = days.reduce((a, b) => a + b, 0);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      avgDays: Number((sum / days.length).toFixed(2)),
      minDays: Number(Math.min(...days).toFixed(2)),
      maxDays: Number(Math.max(...days).toFixed(2)),
      medianDays: Number(median.toFixed(2)),
      totalApprovals: days.length,
    };
  }

  /**
   * Get expense metrics for a date range
   */
  private async getExpenseMetrics(
    startDate: Date,
    endDate: Date,
    baseWhere: Record<string, unknown>,
  ) {
    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [total, approved, pending, rejected] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { ...baseWhere, ...dateFilter },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...baseWhere, ...dateFilter, status: { in: APPROVED_STATUSES } },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...baseWhere,
          ...dateFilter,
          status: { in: [ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_APPROVAL] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...baseWhere, ...dateFilter, status: ExpenseStatus.REJECTED },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total: Number(total._sum.totalAmount || 0),
      approved: Number(approved._sum.totalAmount || 0),
      pending: Number(pending._sum.totalAmount || 0),
      rejected: Number(rejected._sum.totalAmount || 0),
    };
  }

  /**
   * Get voucher metrics
   * For EMPLOYEE role, filter by requesterId
   */
  private async getVoucherMetrics(departmentId?: string, userId?: string) {
    const baseWhere: Record<string, unknown> = {};
    if (userId) {
      // EMPLOYEE users only see their own vouchers
      baseWhere.requesterId = userId;
    } else if (departmentId) {
      baseWhere.requester = { departmentId };
    }

    const [outstanding, overdue] = await Promise.all([
      this.prisma.voucher.aggregate({
        where: {
          ...baseWhere,
          status: VoucherStatus.DISBURSED,
        },
        _count: true,
        _sum: { disbursedAmount: true },
      }),
      this.prisma.voucher.aggregate({
        where: {
          ...baseWhere,
          status: VoucherStatus.OVERDUE,
        },
        _count: true,
        _sum: { disbursedAmount: true },
      }),
    ]);

    return {
      outstandingCount: outstanding._count || 0,
      outstandingAmount: Number(outstanding._sum.disbursedAmount || 0),
      overdueCount: overdue._count || 0,
      overdueAmount: Number(overdue._sum.disbursedAmount || 0),
    };
  }

  /**
   * Get budget utilization metrics
   */
  private async getBudgetMetrics(departmentId?: string) {
    const now = new Date();
    const where: Record<string, unknown> = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const budgets = await this.prisma.budget.findMany({
      where,
    });

    let totalAllocated = 0;
    let totalSpent = 0;
    let budgetsAtWarning = 0;
    let budgetsExceeded = 0;

    for (const budget of budgets) {
      const allocated = Number(budget.totalAmount);
      const spent = Number(budget.usedAmount);
      const utilization = (spent / allocated) * 100;
      const warningThreshold = Number(budget.warningThreshold);

      totalAllocated += allocated;
      totalSpent += spent;

      if (utilization >= 100) {
        budgetsExceeded++;
      } else if (utilization >= warningThreshold) {
        budgetsAtWarning++;
      }
    }

    return {
      overallUtilization: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
      budgetsAtWarning,
      budgetsExceeded,
      totalAllocated,
      totalSpent,
    };
  }

  /**
   * Get top spending categories
   */
  private async getTopCategories(
    startDate: Date,
    endDate: Date,
    baseWhere: Record<string, unknown>,
    limit: number,
  ) {
    const result = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        ...baseWhere,
        status: { in: APPROVED_STATUSES },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { totalAmount: true },
      orderBy: {
        _sum: { totalAmount: 'desc' },
      },
      take: limit,
    });

    const total = result.reduce((sum, r) => sum + Number(r._sum.totalAmount || 0), 0);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: result.map((r) => r.categoryId) } },
    });

    return result.map((r) => {
      const amount = Number(r._sum.totalAmount || 0);
      return {
        name: categories.find((c) => c.id === r.categoryId)?.name || 'Unknown',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    });
  }

  /**
   * Get top spending departments
   */
  private async getTopDepartments(startDate: Date, endDate: Date, limit: number) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        status: { in: APPROVED_STATUSES },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        submitter: {
          include: { department: true },
        },
      },
    });

    const deptTotals = new Map<string, { name: string; amount: number }>();
    let total = 0;

    for (const expense of expenses) {
      const deptId = expense.submitter.departmentId || 'unknown';
      const deptName = expense.submitter.department?.name || 'Unknown';
      const amount = Number(expense.totalAmount);

      if (!deptTotals.has(deptId)) {
        deptTotals.set(deptId, { name: deptName, amount: 0 });
      }
      deptTotals.get(deptId)!.amount += amount;
      total += amount;
    }

    return Array.from(deptTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map((d) => ({
        name: d.name,
        amount: d.amount,
        percentage: total > 0 ? (d.amount / total) * 100 : 0,
      }));
  }

  /**
   * Get recent daily trend
   */
  private async getRecentTrend(days: number, baseWhere: Record<string, unknown>) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const expenses = await this.prisma.expense.findMany({
      where: {
        ...baseWhere,
        status: { in: APPROVED_STATUSES },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Group by date
    const dailyData = new Map<string, { amount: number; count: number }>();

    for (const expense of expenses) {
      const dateStr = expense.createdAt.toISOString().split('T')[0];
      if (!dailyData.has(dateStr)) {
        dailyData.set(dateStr, { amount: 0, count: 0 });
      }
      const data = dailyData.get(dateStr)!;
      data.amount += Number(expense.totalAmount);
      data.count += 1;
    }

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Create a dashboard metric with trend calculation
   */
  private createMetric(label: string, value: number, previousValue: number): DashboardMetricDto {
    const changePercentage =
      previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : undefined;

    let trend: 'up' | 'down' | 'stable' | undefined;
    if (changePercentage !== undefined) {
      if (changePercentage > 1) trend = 'up';
      else if (changePercentage < -1) trend = 'down';
      else trend = 'stable';
    }

    return {
      label,
      value,
      previousValue: previousValue > 0 ? previousValue : undefined,
      changePercentage,
      trend,
    };
  }

  /**
   * Generate Excel export
   */
  private async generateExcel(reportType: string, data: unknown[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType);

    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const firstItem = data[0] as Record<string, unknown>;
      worksheet.columns = Object.keys(firstItem).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 20,
      }));

      worksheet.addRows(data as Record<string, unknown>[]);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${reportType}-${Date.now()}.xlsx`,
    };
  }

  /**
   * Generate CSV export
   */
  private generateCsv(reportType: string, data: unknown[]) {
    if (data.length === 0) {
      return {
        buffer: Buffer.from(''),
        contentType: 'text/csv',
        filename: `${reportType}-${Date.now()}.csv`,
      };
    }

    const firstItem = data[0] as Record<string, unknown>;
    const headers = Object.keys(firstItem).join(',');
    const rows = data.map((row) => {
      const record = row as Record<string, unknown>;
      return Object.values(record)
        .map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) {
            return `"${v.replaceAll('"', '""')}"`;
          }
          return String(v);
        })
        .join(',');
    });
    const csv = [headers, ...rows].join('\n');

    return {
      buffer: Buffer.from(csv),
      contentType: 'text/csv',
      filename: `${reportType}-${Date.now()}.csv`,
    };
  }

  /**
   * Generate PDF export (placeholder)
   */
  private generatePdf(reportType: string, _data: unknown[]) {
    // TODO: Implement PDF generation with pdfkit
    return {
      buffer: Buffer.from('PDF generation not implemented'),
      contentType: 'application/pdf',
      filename: `${reportType}-${Date.now()}.pdf`,
    };
  }
}
