import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateApprovalTierDto } from './dto/approval-tier.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { ExpenseStatus, VoucherStatus, UserStatus } from '@prisma/client';

const DEFAULT_SETTINGS = {
  sessionTimeoutMinutes: 5,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  passwordMinLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  expenseSubmissionDeadlineDays: 10,
  preApprovalExpiryDays: 30,
  voucherSettlementDeadlineDays: 30,
  budgetWarningThreshold: 80,
  allowedEmailDomains: ['tekcellent.com'],
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getApprovalTiers() {
    return this.prisma.approvalTier.findMany({
      where: { isActive: true },
      orderBy: { tierOrder: 'asc' },
    });
  }

  async createApprovalTier(dto: CreateApprovalTierDto) {
    return this.prisma.approvalTier.create({
      data: dto,
    });
  }

  async updateApprovalTier(id: string, dto: CreateApprovalTierDto) {
    const tier = await this.prisma.approvalTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Approval tier with ID ${id} not found`);
    }

    return this.prisma.approvalTier.update({
      where: { id },
      data: dto,
    });
  }

  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();

    // Build settings object from key-value pairs
    const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };

    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  async updateSettings(dto: SystemSettingsDto) {
    const updates = Object.entries(dto).filter(([, value]) => value !== undefined);

    await Promise.all(
      updates.map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          create: {
            key,
            value: value as object,
            category: 'system',
          },
          update: {
            value: value as object,
          },
        }),
      ),
    );

    return this.getSettings();
  }

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      activeVouchers,
      overdueVouchers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.expense.count({ where: { status: ExpenseStatus.SUBMITTED } }),
      this.prisma.expense.count(),
      this.prisma.expense.count({
        where: { status: ExpenseStatus.SUBMITTED },
      }),
      this.prisma.expense.count({ where: { status: ExpenseStatus.APPROVED } }),
      this.prisma.voucher.count({
        where: {
          status: { in: [VoucherStatus.APPROVED, VoucherStatus.DISBURSED] },
        },
      }),
      this.prisma.voucher.count({
        where: {
          status: VoucherStatus.DISBURSED,
          settlementDeadline: { lt: new Date() },
        },
      }),
    ]);

    const expenseTotal = await this.prisma.expense.aggregate({
      where: { status: ExpenseStatus.APPROVED },
      _sum: { totalAmount: true },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      expenses: {
        total: totalExpenses,
        pending: pendingExpenses,
        approved: approvedExpenses,
        totalAmount: Number(expenseTotal._sum.totalAmount || 0),
      },
      vouchers: {
        active: activeVouchers,
        overdue: overdueVouchers,
      },
      pendingApprovals,
    };
  }

  async generateTestData() {
    // TODO: Implement test data generation
    return { message: 'Test data generation not implemented yet' };
  }
}
