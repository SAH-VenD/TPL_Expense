import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { PreApprovalsModule } from './modules/pre-approvals/pre-approvals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './modules/storage/storage.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    ExpensesModule,
    ReceiptsModule,
    ApprovalsModule,
    VouchersModule,
    BudgetsModule,
    PreApprovalsModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    AuditModule,
    StorageModule,
    OcrModule,
    VendorsModule,
    ProjectsModule,
    CostCentersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
