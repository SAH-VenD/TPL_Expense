import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  prisma,
  TEST_PASSWORD,
  connectTestDatabase,
  disconnectTestDatabase,
  createTestUser,
  createTestDepartment,
  createTestCategory,
} from './test-utils';
import {
  RoleType,
  ExpenseStatus,
  ExpenseType,
  ApprovalAction,
  VoucherStatus,
  BudgetType,
  BudgetPeriod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ReportType, ExportFormat } from '../src/modules/reports/dto/export-report.dto';

// Mock ThrottlerGuard to disable rate limiting in tests
class MockThrottlerGuard {
  canActivate() {
    return true;
  }
}

describe('ReportsController (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let approverToken: string;
  let financeToken: string;
  let adminToken: string;

  let employeeId: string;
  let approverId: string;
  let financeId: string;
  let adminId: string;

  let department1Id: string;
  let department2Id: string;
  let department3Id: string;
  let category1Id: string;
  let category2Id: string;
  let category3Id: string;
  let projectId: string;
  let costCenterId: string;

  const testTimestamp = Date.now();

  // Helper function to create expense data
  function createExpenseData(
    submitterId: string,
    categoryId: string,
    options: {
      description?: string;
      amount?: number;
      status?: ExpenseStatus;
      departmentId?: string;
      projectId?: string;
      costCenterId?: string;
      expenseDate?: Date;
    } = {},
  ) {
    const amount = options.amount || 5000;
    return {
      submitterId,
      categoryId,
      departmentId: options.departmentId,
      projectId: options.projectId,
      costCenterId: options.costCenterId,
      expenseNumber: `EXP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: ExpenseType.OUT_OF_POCKET,
      description: options.description || 'Test expense',
      amount: new Decimal(amount),
      currency: 'PKR' as const,
      totalAmount: new Decimal(amount),
      amountInPKR: new Decimal(amount),
      expenseDate: options.expenseDate || new Date(),
      status: options.status || ExpenseStatus.APPROVED,
      submittedAt: new Date(),
    };
  }

  beforeAll(async () => {
    await connectTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(MockThrottlerGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Create test departments
    const dept1 = await createTestDepartment(`Finance Dept ${testTimestamp}`);
    department1Id = dept1.id;

    const dept2 = await createTestDepartment(`Engineering Dept ${testTimestamp}`);
    department2Id = dept2.id;

    const dept3 = await createTestDepartment(`Marketing Dept ${testTimestamp}`);
    department3Id = dept3.id;

    // Create test categories
    const cat1 = await createTestCategory(`Travel ${testTimestamp}`);
    category1Id = cat1.id;

    const cat2 = await createTestCategory(`Office Supplies ${testTimestamp}`);
    category2Id = cat2.id;

    const cat3 = await createTestCategory(`Software ${testTimestamp}`);
    category3Id = cat3.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: `Test Project ${testTimestamp}`,
        code: `PROJ${testTimestamp}`,
        description: 'Test project for reports',
        clientName: 'Test Client',
        isActive: true,
      },
    });
    projectId = project.id;

    // Create test cost center
    const costCenter = await prisma.costCenter.create({
      data: {
        name: `Test Cost Center ${testTimestamp}`,
        code: `CC${testTimestamp}`,
        description: 'Test cost center for reports',
        departmentId: department1Id,
        isActive: true,
      },
    });
    costCenterId = costCenter.id;

    // Create test users
    const employee = await createTestUser({
      email: `reports-employee-${testTimestamp}@tekcellent.com`,
      firstName: 'Reports',
      lastName: 'Employee',
      role: RoleType.EMPLOYEE,
      departmentId: department1Id,
    });
    employeeId = employee.id;

    const approver = await createTestUser({
      email: `reports-approver-${testTimestamp}@tekcellent.com`,
      firstName: 'Reports',
      lastName: 'Approver',
      role: RoleType.APPROVER,
      departmentId: department2Id,
    });
    approverId = approver.id;

    const finance = await createTestUser({
      email: `reports-finance-${testTimestamp}@tekcellent.com`,
      firstName: 'Reports',
      lastName: 'Finance',
      role: RoleType.FINANCE,
      departmentId: department1Id,
    });
    financeId = finance.id;

    const admin = await createTestUser({
      email: `reports-admin-${testTimestamp}@tekcellent.com`,
      firstName: 'Reports',
      lastName: 'Admin',
      role: RoleType.ADMIN,
    });
    adminId = admin.id;

    // Login to get tokens
    const employeeLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: employee.email,
      password: TEST_PASSWORD,
    });
    employeeToken = employeeLogin.body.accessToken;

    const approverLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: approver.email,
      password: TEST_PASSWORD,
    });
    approverToken = approverLogin.body.accessToken;

    const financeLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: finance.email,
      password: TEST_PASSWORD,
    });
    financeToken = financeLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: admin.email,
      password: TEST_PASSWORD,
    });
    adminToken = adminLogin.body.accessToken;

    // Create test expenses for reports (various statuses, categories, departments)
    const expensesToCreate = [
      // Approved expenses in different categories and departments
      createExpenseData(employeeId, category1Id, {
        description: 'Travel expense 1',
        amount: 10000,
        status: ExpenseStatus.APPROVED,
        projectId,
        costCenterId,
      }),
      createExpenseData(employeeId, category1Id, {
        description: 'Travel expense 2',
        amount: 15000,
        status: ExpenseStatus.APPROVED,
      }),
      createExpenseData(employeeId, category2Id, {
        description: 'Office supplies 1',
        amount: 5000,
        status: ExpenseStatus.APPROVED,
        projectId,
      }),
      createExpenseData(employeeId, category3Id, {
        description: 'Software license',
        amount: 25000,
        status: ExpenseStatus.APPROVED,
        costCenterId,
      }),
      // Paid expenses
      createExpenseData(employeeId, category1Id, {
        description: 'Paid travel expense',
        amount: 8000,
        status: ExpenseStatus.PAID,
      }),
      // Pending expenses
      createExpenseData(employeeId, category2Id, {
        description: 'Pending office supplies',
        amount: 3000,
        status: ExpenseStatus.SUBMITTED,
      }),
      createExpenseData(employeeId, category1Id, {
        description: 'Pending approval travel',
        amount: 12000,
        status: ExpenseStatus.PENDING_APPROVAL,
      }),
      // Rejected expenses
      createExpenseData(employeeId, category3Id, {
        description: 'Rejected software',
        amount: 50000,
        status: ExpenseStatus.REJECTED,
      }),
      // Approver expenses (different department)
      createExpenseData(approverId, category1Id, {
        description: 'Approver travel',
        amount: 20000,
        status: ExpenseStatus.APPROVED,
      }),
    ];

    for (const expenseData of expensesToCreate) {
      await prisma.expense.create({ data: expenseData });
    }

    // Create approval history for some expenses to test approval turnaround
    const approvedExpenses = await prisma.expense.findMany({
      where: {
        submitterId: employeeId,
        status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
      },
      take: 3,
    });

    for (const expense of approvedExpenses) {
      await prisma.approvalHistory.create({
        data: {
          expenseId: expense.id,
          approverId: financeId,
          tierLevel: 1,
          action: ApprovalAction.APPROVED,
          comment: 'Approved for testing',
        },
      });
    }

    // Create a voucher for outstanding advances report
    await prisma.voucher.create({
      data: {
        voucherNumber: `VCH-${testTimestamp}`,
        requesterId: employeeId,
        purpose: 'Test petty cash advance',
        requestedAmount: new Decimal(20000),
        disbursedAmount: new Decimal(20000),
        status: VoucherStatus.DISBURSED,
        disbursedAt: new Date(),
        settlementDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // Create a budget for budget vs actual report
    const now = new Date();
    await prisma.budget.create({
      data: {
        name: `Test Budget ${testTimestamp}`,
        type: BudgetType.DEPARTMENT,
        period: BudgetPeriod.ANNUAL,
        totalAmount: new Decimal(500000),
        warningThreshold: new Decimal(80),
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
        departmentId: department1Id,
        ownerId: financeId,
        isActive: true,
      },
    });
  }, 60000);

  afterAll(async () => {
    // Cleanup in order to respect foreign key constraints
    await prisma.approvalHistory.deleteMany({
      where: {
        expense: {
          submitterId: { in: [employeeId, approverId, financeId, adminId] },
        },
      },
    });
    await prisma.expense.deleteMany({
      where: { submitterId: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.voucher.deleteMany({
      where: { requesterId: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.budget.deleteMany({
      where: { departmentId: { in: [department1Id, department2Id, department3Id] } },
    });
    await prisma.costCenter.deleteMany({
      where: { id: costCenterId },
    });
    await prisma.project.deleteMany({
      where: { id: projectId },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.department.deleteMany({
      where: { id: { in: [department1Id, department2Id, department3Id] } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: [category1Id, category2Id, category3Id] } },
    });

    await disconnectTestDatabase();
    await app.close();
  }, 15000);

  // ==================== AUTHENTICATION TESTS ====================

  describe('Authentication & Authorization', () => {
    it('should return 401 when accessing reports without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/reports/spend-by-department',
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 when EMPLOYEE tries to access reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when APPROVER tries to access reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow FINANCE role to access reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow ADMIN role to access reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  // ==================== SPEND BY DEPARTMENT TESTS ====================

  describe('GET /reports/spend-by-department', () => {
    it('should return spend breakdown by department', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('department');
      expect(response.body[0]).toHaveProperty('amount');
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for future date range with no data', async () => {
      const futureStart = new Date();
      futureStart.setFullYear(futureStart.getFullYear() + 1);
      const futureEnd = new Date(futureStart);
      futureEnd.setMonth(futureEnd.getMonth() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .query({
          startDate: futureStart.toISOString().split('T')[0],
          endDate: futureEnd.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  // ==================== SPEND BY CATEGORY TESTS ====================

  describe('GET /reports/spend-by-category', () => {
    it('should return spend breakdown by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-category')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('category');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('count');
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-category')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==================== SPEND BY VENDOR TESTS ====================

  describe('GET /reports/spend-by-vendor', () => {
    it('should return spend breakdown by vendor', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-vendor')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==================== BUDGET VS ACTUAL TESTS ====================

  describe('GET /reports/budget-vs-actual', () => {
    it('should return budget vs actual comparison', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/budget-vs-actual')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('budgetAmount');
        expect(response.body[0]).toHaveProperty('actualAmount');
        expect(response.body[0]).toHaveProperty('variance');
        expect(response.body[0]).toHaveProperty('utilizationPercentage');
      }
    });
  });

  // ==================== OUTSTANDING ADVANCES TESTS ====================

  describe('GET /reports/outstanding-advances', () => {
    it('should return outstanding voucher advances', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/outstanding-advances')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('voucherNumber');
      expect(response.body[0]).toHaveProperty('requester');
    });
  });

  // ==================== TAX SUMMARY TESTS ====================

  describe('GET /reports/tax-summary', () => {
    it('should return tax summary for current year', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/tax-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('year');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('totalTax');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body.year).toBe(new Date().getFullYear());
    });

    it('should return tax summary for specified year', async () => {
      const targetYear = 2023;
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/tax-summary?year=${targetYear}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(targetYear);
    });
  });

  // ==================== SPEND BY EMPLOYEE TESTS ====================

  describe('GET /reports/spend-by-employee', () => {
    it('should return spend breakdown by employee', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-employee')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('grandTotal');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(Array.isArray(response.body.items)).toBe(true);
      if (response.body.items.length > 0) {
        expect(response.body.items[0]).toHaveProperty('employeeId');
        expect(response.body.items[0]).toHaveProperty('employeeName');
        expect(response.body.items[0]).toHaveProperty('totalAmount');
        expect(response.body.items[0]).toHaveProperty('expenseCount');
        expect(response.body.items[0]).toHaveProperty('averageAmount');
      }
    });

    it('should filter by department', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-employee')
        .query({ departmentId: department1Id })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-employee')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });
  });

  // ==================== SPEND BY PROJECT TESTS ====================

  describe('GET /reports/spend-by-project', () => {
    it('should return spend breakdown by project', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-project')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('grandTotal');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('unallocatedAmount');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should include unallocated expenses amount', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-project')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.unallocatedAmount).toBe('number');
    });

    it('should show project details in items', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-project')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      if (response.body.items.length > 0) {
        expect(response.body.items[0]).toHaveProperty('projectId');
        expect(response.body.items[0]).toHaveProperty('projectName');
        expect(response.body.items[0]).toHaveProperty('totalAmount');
        expect(response.body.items[0]).toHaveProperty('expenseCount');
      }
    });
  });

  // ==================== SPEND BY COST CENTER TESTS ====================

  describe('GET /reports/spend-by-cost-center', () => {
    it('should return spend breakdown by cost center', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-cost-center')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('grandTotal');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('unallocatedAmount');
    });

    it('should filter by department', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-cost-center')
        .query({ departmentId: department1Id })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });
  });

  // ==================== MONTHLY TREND TESTS ====================

  describe('GET /reports/monthly-trend', () => {
    it('should return monthly trend for current year', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('year');
      expect(response.body).toHaveProperty('months');
      expect(response.body).toHaveProperty('ytdTotal');
      expect(response.body).toHaveProperty('ytdExpenseCount');
      expect(response.body).toHaveProperty('monthlyAverage');
      expect(response.body.year).toBe(new Date().getFullYear());
    });

    it('should return all 12 months', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.months.length).toBe(12);
    });

    it('should include month names and zero values for empty months', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      for (const month of response.body.months) {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('monthName');
        expect(month).toHaveProperty('year');
        expect(month).toHaveProperty('totalAmount');
        expect(month).toHaveProperty('expenseCount');
        expect(typeof month.totalAmount).toBe('number');
      }
    });

    it('should return monthly trend for specified year', async () => {
      const targetYear = 2023;
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/monthly-trend?year=${targetYear}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(targetYear);
    });

    it('should filter by department', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .query({ departmentId: department1Id })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('months');
    });

    it('should calculate MoM change percentage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      // First month should not have changePercentage, subsequent months may have it
      expect(response.body.months[0].changePercentage).toBeUndefined();
    });
  });

  // ==================== APPROVAL TURNAROUND TESTS ====================

  describe('GET /reports/approval-turnaround', () => {
    it('should return approval turnaround statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/approval-turnaround')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('pendingCount');
      expect(response.body.overall).toHaveProperty('avgDays');
      expect(response.body.overall).toHaveProperty('minDays');
      expect(response.body.overall).toHaveProperty('maxDays');
      expect(response.body.overall).toHaveProperty('medianDays');
      expect(response.body.overall).toHaveProperty('totalApprovals');
    });

    it('should return breakdown by department when requested', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/approval-turnaround')
        .query({ byDepartment: true })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('byDepartment');
      expect(Array.isArray(response.body.byDepartment)).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/approval-turnaround')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overall');
    });

    it('should return zeros when no approvals exist', async () => {
      // Use a future date range where no approvals exist
      const futureStart = new Date();
      futureStart.setFullYear(futureStart.getFullYear() + 1);
      const futureEnd = new Date(futureStart);
      futureEnd.setMonth(futureEnd.getMonth() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/approval-turnaround')
        .query({
          startDate: futureStart.toISOString().split('T')[0],
          endDate: futureEnd.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overall.totalApprovals).toBe(0);
      expect(response.body.overall.avgDays).toBe(0);
    });
  });

  // ==================== REIMBURSEMENT STATUS TESTS ====================

  describe('GET /reports/reimbursement-status', () => {
    it('should return reimbursement status breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/reimbursement-status')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body).toHaveProperty('pendingReimbursement');
      expect(response.body).toHaveProperty('reimbursed');
      expect(response.body).toHaveProperty('totals');
      expect(Array.isArray(response.body.breakdown)).toBe(true);
    });

    it('should show pending reimbursement and reimbursed counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/reimbursement-status')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pendingReimbursement).toHaveProperty('count');
      expect(response.body.pendingReimbursement).toHaveProperty('amount');
      expect(response.body.reimbursed).toHaveProperty('count');
      expect(response.body.reimbursed).toHaveProperty('amount');
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/reimbursement-status')
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('breakdown');
    });
  });

  // ==================== DASHBOARD SUMMARY TESTS ====================

  describe('GET /reports/dashboard-summary', () => {
    it('should return executive dashboard summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('approvals');
      expect(response.body).toHaveProperty('vouchers');
      expect(response.body).toHaveProperty('budgetUtilization');
      expect(response.body).toHaveProperty('topCategories');
      expect(response.body).toHaveProperty('recentTrend');
    });

    it('should return expense metrics with trends', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenses).toHaveProperty('total');
      expect(response.body.expenses).toHaveProperty('approved');
      expect(response.body.expenses).toHaveProperty('pending');
      expect(response.body.expenses).toHaveProperty('rejected');
      expect(response.body.expenses.total).toHaveProperty('value');
      expect(response.body.expenses.total).toHaveProperty('label');
    });

    it('should support custom period days', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .query({ periodDays: 7 })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period.days).toBe(7);
    });

    it('should support custom period of 90 days', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .query({ periodDays: 90 })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period.days).toBe(90);
    });

    it('should filter by department', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .query({ departmentId: department1Id })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      // When filtering by department, topDepartments should not be included
      expect(response.body.topDepartments).toBeUndefined();
    });

    it('should include top departments when not filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('topDepartments');
      expect(Array.isArray(response.body.topDepartments)).toBe(true);
    });

    it('should include approval metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.approvals).toHaveProperty('pendingCount');
      expect(response.body.approvals).toHaveProperty('oldestPendingDays');
      expect(response.body.approvals).toHaveProperty('avgPendingDays');
    });

    it('should include voucher metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.vouchers).toHaveProperty('outstandingCount');
      expect(response.body.vouchers).toHaveProperty('outstandingAmount');
      expect(response.body.vouchers).toHaveProperty('overdueCount');
      expect(response.body.vouchers).toHaveProperty('overdueAmount');
    });

    it('should include budget utilization metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.budgetUtilization).toHaveProperty('overallUtilization');
      expect(response.body.budgetUtilization).toHaveProperty('budgetsAtWarning');
      expect(response.body.budgetUtilization).toHaveProperty('budgetsExceeded');
      expect(response.body.budgetUtilization).toHaveProperty('totalAllocated');
      expect(response.body.budgetUtilization).toHaveProperty('totalSpent');
    });
  });

  // ==================== EXPORT TESTS ====================

  describe('POST /reports/export', () => {
    it('should export spend-by-department report as XLSX', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_DEPARTMENT,
          format: ExportFormat.XLSX,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toContain('.xlsx');
    });

    it('should export spend-by-category report as CSV', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_CATEGORY,
          format: ExportFormat.CSV,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    it('should export monthly-trend report', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.MONTHLY_TREND,
          format: ExportFormat.XLSX,
          year: new Date().getFullYear(),
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should export spend-by-employee report', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_EMPLOYEE,
          format: ExportFormat.CSV,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should export with date filters', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_DEPARTMENT,
          format: ExportFormat.XLSX,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect(response.status).toBe(200);
    });

    it('should return 403 when EMPLOYEE tries to export', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_DEPARTMENT,
          format: ExportFormat.XLSX,
        });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid report type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: 'invalid-report-type',
          format: ExportFormat.XLSX,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reportType: ReportType.SPEND_BY_DEPARTMENT,
          format: 'invalid-format',
        });

      expect(response.status).toBe(400);
    });
  });

  // ==================== EDGE CASES TESTS ====================

  describe('Edge Cases', () => {
    it('should handle invalid date format gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-department')
        .query({
          startDate: 'not-a-date',
          endDate: '2024-12-31',
        })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle invalid UUID for departmentId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-employee')
        .query({ departmentId: 'not-a-uuid' })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle invalid year for monthly trend', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/monthly-trend')
        .query({ year: 1999 }) // Below minimum 2000
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle invalid periodDays for dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/dashboard-summary')
        .query({ periodDays: 0 }) // Below minimum 1
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle non-existent department filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/spend-by-employee')
        .query({ departmentId: '00000000-0000-0000-0000-000000000000' })
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(0);
    });
  });
});
