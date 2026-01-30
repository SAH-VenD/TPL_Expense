import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExportReportDto } from './dto/export-report.dto';
import { ExpenseStatus, VoucherStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSpendByDepartment(startDate?: string, endDate?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    // Get department details
    const expenses = await this.prisma.expense.findMany({
      where: {
        status: ExpenseStatus.APPROVED,
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

  async getSpendByCategory(startDate?: string, endDate?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const result = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        status: ExpenseStatus.APPROVED,
        ...dateFilter,
      },
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

    return result.map((r) => ({
      category: categories.find((c) => c.id === r.categoryId)?.name || 'Unknown',
      amount: Number(r._sum.totalAmount),
      count: r._count,
    }));
  }

  async getSpendByVendor(startDate?: string, endDate?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const result = await this.prisma.expense.groupBy({
      by: ['vendorId'],
      where: {
        status: ExpenseStatus.APPROVED,
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

  async getTaxSummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const expenses = await this.prisma.expense.findMany({
      where: {
        status: ExpenseStatus.APPROVED,
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

  async exportReport(dto: ExportReportDto) {
    let data: any[];

    switch (dto.reportType) {
      case 'spend-by-department':
        data = await this.getSpendByDepartment(dto.startDate, dto.endDate);
        break;
      case 'spend-by-category':
        data = await this.getSpendByCategory(dto.startDate, dto.endDate);
        break;
      case 'spend-by-vendor':
        data = await this.getSpendByVendor(dto.startDate, dto.endDate);
        break;
      case 'budget-vs-actual':
        data = await this.getBudgetVsActual();
        break;
      default:
        data = [];
    }

    if (dto.format === 'xlsx') {
      return this.generateExcel(dto.reportType, data);
    } else if (dto.format === 'csv') {
      return this.generateCsv(dto.reportType, data);
    }

    return this.generatePdf(dto.reportType, data);
  }

  private getDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};

    return {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    };
  }

  private async generateExcel(reportType: string, data: any[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType);

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 20,
      }));

      worksheet.addRows(data);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${reportType}-${Date.now()}.xlsx`,
    };
  }

  private generateCsv(reportType: string, data: any[]) {
    if (data.length === 0) {
      return {
        buffer: Buffer.from(''),
        contentType: 'text/csv',
        filename: `${reportType}-${Date.now()}.csv`,
      };
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    return {
      buffer: Buffer.from(csv),
      contentType: 'text/csv',
      filename: `${reportType}-${Date.now()}.csv`,
    };
  }

  private generatePdf(reportType: string, _data: unknown[]) {
    // TODO: Implement PDF generation with pdfkit
    return {
      buffer: Buffer.from('PDF generation not implemented'),
      contentType: 'application/pdf',
      filename: `${reportType}-${Date.now()}.pdf`,
    };
  }
}
