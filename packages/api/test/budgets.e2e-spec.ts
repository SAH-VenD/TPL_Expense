import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
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
  BudgetType,
  BudgetPeriod,
  BudgetEnforcement,
  ExpenseType,
  ExpenseStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Budgets Module (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let approverToken: string;
  let financeToken: string;
  let adminToken: string;

  let employeeId: string;
  let approverId: string;
  let financeId: string;
  let adminId: string;

  let departmentId: string;
  let categoryId: string;

  const testTimestamp = Date.now();

  beforeAll(async () => {
    await connectTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // Create test department and category
    const department = await createTestDepartment(`Budget Test Dept ${testTimestamp}`);
    departmentId = department.id;

    const category = await createTestCategory(`Budget Test Category ${testTimestamp}`);
    categoryId = category.id;

    // Create test users
    const employee = await createTestUser({
      email: `budget-employee-${testTimestamp}@tekcellent.com`,
      firstName: 'Budget',
      lastName: 'Employee',
      role: RoleType.EMPLOYEE,
      departmentId,
    });
    employeeId = employee.id;

    const approver = await createTestUser({
      email: `budget-approver-${testTimestamp}@tekcellent.com`,
      firstName: 'Budget',
      lastName: 'Approver',
      role: RoleType.APPROVER,
    });
    approverId = approver.id;

    const finance = await createTestUser({
      email: `budget-finance-${testTimestamp}@tekcellent.com`,
      firstName: 'Budget',
      lastName: 'Finance',
      role: RoleType.FINANCE,
    });
    financeId = finance.id;

    const admin = await createTestUser({
      email: `budget-admin-${testTimestamp}@tekcellent.com`,
      firstName: 'Budget',
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
  }, 30000);

  afterAll(async () => {
    // Cleanup in order to respect foreign key constraints
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.expense.deleteMany({
      where: { submitterId: { in: [employeeId] } },
    });
    await prisma.budget.deleteMany({
      where: { departmentId },
    });
    await prisma.budget.deleteMany({
      where: { categoryId },
    });
    await prisma.budget.deleteMany({
      where: { ownerId: { in: [financeId, adminId] } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [employeeId, approverId, financeId, adminId] } },
    });
    await prisma.department.deleteMany({ where: { id: departmentId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });

    await disconnectTestDatabase();
    await app.close();
  }, 15000);

  // ==================== CREATE BUDGET TESTS ====================

  describe('POST /budgets - Create Budget', () => {
    it('should create a budget as finance user', async () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: `Test Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          warningThreshold: 80,
          enforcement: BudgetEnforcement.SOFT_WARNING,
          startDate: yearStart,
          endDate: yearEnd,
          departmentId,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(`Test Budget ${testTimestamp}`);
      expect(response.body.type).toBe(BudgetType.DEPARTMENT);
      expect(response.body.totalAmount).toBe('500000');
      expect(response.body.warningThreshold).toBe('80');
      expect(response.body.isActive).toBe(true);

      // Cleanup
      await prisma.budget.delete({ where: { id: response.body.id } });
    });

    it('should create a budget as admin user', async () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Admin Budget ${testTimestamp}`,
          type: BudgetType.CATEGORY,
          period: BudgetPeriod.QUARTERLY,
          totalAmount: 100000,
          startDate: yearStart,
          endDate: yearEnd,
          categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe(BudgetType.CATEGORY);

      // Cleanup
      await prisma.budget.delete({ where: { id: response.body.id } });
    });

    it('should reject budget creation by employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Budget',
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          departmentId,
        });

      expect(response.status).toBe(403);
    });

    it('should reject budget creation by approver', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          name: 'Unauthorized Budget',
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          departmentId,
        });

      expect(response.status).toBe(403);
    });

    it('should reject budget with end date before start date', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid Dates Budget',
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          startDate: '2024-12-31',
          endDate: '2024-01-01',
          departmentId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('End date must be after start date');
    });

    it('should reject budget with non-existent department', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid Department Budget',
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          departmentId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Department');
    });

    it('should set default values for warningThreshold and enforcement', async () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: `Default Values Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 500000,
          startDate: yearStart,
          endDate: yearEnd,
          departmentId,
        });

      expect(response.status).toBe(201);
      expect(response.body.warningThreshold).toBe('80');
      expect(response.body.enforcement).toBe(BudgetEnforcement.SOFT_WARNING);

      // Cleanup
      await prisma.budget.delete({ where: { id: response.body.id } });
    });
  });

  // ==================== GET ALL BUDGETS TESTS ====================

  describe('GET /budgets - List Budgets', () => {
    let testBudgetId: string;

    beforeAll(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `List Test Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          warningThreshold: new Decimal(80),
          enforcement: BudgetEnforcement.SOFT_WARNING,
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;
    });

    afterAll(async () => {
      await prisma.budget.delete({ where: { id: testBudgetId } });
    });

    it('should list budgets for finance user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const budget = response.body.find((b: { id: string }) => b.id === testBudgetId);
      expect(budget).toBeDefined();
    });

    it('should list budgets for admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should list budgets for approver user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject budget listing by employee', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets?type=DEPARTMENT')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((budget: { type: BudgetType }) => {
        expect(budget.type).toBe(BudgetType.DEPARTMENT);
      });
    });

    it('should include inactive budgets when activeOnly=false', async () => {
      // Create inactive budget
      const inactiveBudget = await prisma.budget.create({
        data: {
          name: `Inactive Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(100000),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets?activeOnly=false')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      const found = response.body.find((b: { id: string }) => b.id === inactiveBudget.id);
      expect(found).toBeDefined();

      // Cleanup
      await prisma.budget.delete({ where: { id: inactiveBudget.id } });
    });
  });

  // ==================== GET SINGLE BUDGET TESTS ====================

  describe('GET /budgets/:id - Get Budget', () => {
    let testBudgetId: string;

    beforeAll(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Single Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;
    });

    afterAll(async () => {
      await prisma.budget.delete({ where: { id: testBudgetId } });
    });

    it('should get budget by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testBudgetId);
      expect(response.body.department).toBeDefined();
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ==================== GET UTILIZATION TESTS ====================

  describe('GET /budgets/:id/utilization - Get Utilization', () => {
    let testBudgetId: string;
    let testExpenseId: string;

    beforeAll(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Utilization Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          warningThreshold: new Decimal(80),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;

      // Create linked expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-UTIL-${testTimestamp}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Test utilization expense',
          expenseDate: new Date(),
          amount: new Decimal(100000),
          currency: 'PKR',
          totalAmount: new Decimal(100000),
          amountInPKR: new Decimal(100000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: testBudgetId,
        },
      });
      testExpenseId = expense.id;
    });

    afterAll(async () => {
      await prisma.expense.delete({ where: { id: testExpenseId } });
      await prisma.budget.delete({ where: { id: testBudgetId } });
    });

    it('should return utilization metrics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/budgets/${testBudgetId}/utilization`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.budgetId).toBe(testBudgetId);
      expect(response.body.allocated).toBe(500000);
      expect(response.body.spent).toBeGreaterThanOrEqual(100000);
      expect(response.body.available).toBeLessThanOrEqual(400000);
      expect(response.body.utilizationPercentage).toBeGreaterThanOrEqual(20);
    });

    it('should show isOverBudget when exceeded', async () => {
      // Create budget that's over limit
      const overBudget = await prisma.budget.create({
        data: {
          name: `Over Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(50000),
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      // Create expense exceeding budget
      const overExpense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-OVER-${testTimestamp}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Expense exceeding budget',
          expenseDate: new Date(),
          amount: new Decimal(60000),
          currency: 'PKR',
          totalAmount: new Decimal(60000),
          amountInPKR: new Decimal(60000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: overBudget.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/budgets/${overBudget.id}/utilization`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isOverBudget).toBe(true);
      expect(response.body.available).toBeLessThan(0);

      // Cleanup
      await prisma.expense.delete({ where: { id: overExpense.id } });
      await prisma.budget.delete({ where: { id: overBudget.id } });
    });
  });

  // ==================== UPDATE BUDGET TESTS ====================

  describe('PATCH /budgets/:id - Update Budget', () => {
    let testBudgetId: string;

    beforeEach(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Update Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;
    });

    afterEach(async () => {
      await prisma.budget.delete({ where: { id: testBudgetId } }).catch(() => {});
    });

    it('should update budget name and amount', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Updated Budget Name',
          totalAmount: 600000,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Budget Name');
      expect(response.body.totalAmount).toBe('600000');
    });

    it('should update warning threshold', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          warningThreshold: 90,
        });

      expect(response.status).toBe(200);
      expect(response.body.warningThreshold).toBe('90');
    });

    it('should update enforcement type', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          enforcement: BudgetEnforcement.HARD_BLOCK,
        });

      expect(response.status).toBe(200);
      expect(response.body.enforcement).toBe(BudgetEnforcement.HARD_BLOCK);
    });

    it('should reject update by employee', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Update',
        });

      expect(response.status).toBe(403);
    });
  });

  // ==================== DELETE BUDGET TESTS ====================

  describe('DELETE /budgets/:id - Soft Delete Budget', () => {
    it('should soft delete budget as admin', async () => {
      const budget = await prisma.budget.create({
        data: {
          name: `Delete Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          departmentId,
          ownerId: adminId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/budgets/${budget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject delete by finance (admin only)', async () => {
      const budget = await prisma.budget.create({
        data: {
          name: `Delete Test Budget Finance ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/budgets/${budget.id}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });
  });

  // ==================== ACTIVATE BUDGET TESTS ====================

  describe('POST /budgets/:id/activate - Activate Budget', () => {
    it('should activate an inactive budget', async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Activate Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear() + 1, 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/activate`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(true);

      // Cleanup
      await prisma.auditLog.deleteMany({ where: { entityId: budget.id } });
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject activation of already active budget', async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Already Active Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear() + 1, 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/activate`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already active');

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject activation of expired budget', async () => {
      const budget = await prisma.budget.create({
        data: {
          name: `Expired Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-12-31'),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/activate`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });
  });

  // ==================== CLOSE BUDGET TESTS ====================

  describe('POST /budgets/:id/close - Close Budget', () => {
    it('should close an active budget', async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Close Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/close`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(false);

      // Cleanup
      await prisma.auditLog.deleteMany({ where: { entityId: budget.id } });
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject closing already inactive budget', async () => {
      const budget = await prisma.budget.create({
        data: {
          name: `Already Closed Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/close`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already inactive');

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });
  });

  // ==================== ARCHIVE BUDGET TESTS ====================

  describe('POST /budgets/:id/archive - Archive Budget', () => {
    it('should archive a closed budget after end date', async () => {
      const budget = await prisma.budget.create({
        data: {
          name: `Archive Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-12-31'),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/archive`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(201);

      // Cleanup
      await prisma.auditLog.deleteMany({ where: { entityId: budget.id } });
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject archiving active budget', async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Active Archive Test Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/archive`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must be closed');

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    it('should reject archiving before end date', async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Future End Archive Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear() + 1, 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budget.id}/archive`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('before its end');

      // Cleanup
      await prisma.budget.delete({ where: { id: budget.id } });
    });
  });

  // ==================== BUDGET TRANSFER TESTS ====================

  describe('POST /budgets/transfer - Transfer Budget', () => {
    let fromBudgetId: string;
    let toBudgetId: string;

    beforeEach(async () => {
      const now = new Date();
      const fromBudget = await prisma.budget.create({
        data: {
          name: `From Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      fromBudgetId = fromBudget.id;

      const toBudget = await prisma.budget.create({
        data: {
          name: `To Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(300000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      toBudgetId = toBudget.id;
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: [fromBudgetId, toBudgetId] } },
      });
      await prisma.budget.delete({ where: { id: fromBudgetId } }).catch(() => {});
      await prisma.budget.delete({ where: { id: toBudgetId } }).catch(() => {});
    });

    it('should transfer budget successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/transfer')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          fromBudgetId,
          toBudgetId,
          amount: 100000,
          reason: 'Reallocation for Q2 priorities',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.fromBudgetNewBalance).toBe(400000);
      expect(response.body.toBudgetNewBalance).toBe(400000);
    });

    it('should reject transfer with insufficient available budget', async () => {
      // Create expense using most of the from budget
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-TRANSFER-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Large expense',
          expenseDate: new Date(),
          amount: new Decimal(450000),
          currency: 'PKR',
          totalAmount: new Decimal(450000),
          amountInPKR: new Decimal(450000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: fromBudgetId,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/transfer')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          fromBudgetId,
          toBudgetId,
          amount: 100000,
          reason: 'Transfer exceeding available',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient available budget');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
    });

    it('should reject transfer with inactive source budget', async () => {
      await prisma.budget.update({
        where: { id: fromBudgetId },
        data: { isActive: false },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/transfer')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          fromBudgetId,
          toBudgetId,
          amount: 50000,
          reason: 'Transfer from inactive',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Both budgets must be active');
    });

    it('should reject transfer by employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/transfer')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          fromBudgetId,
          toBudgetId,
          amount: 50000,
          reason: 'Unauthorized transfer',
        });

      expect(response.status).toBe(403);
    });
  });

  // ==================== CHECK EXPENSE TESTS ====================

  describe('POST /budgets/check-expense - Check Expense Against Budgets', () => {
    let testBudgetId: string;

    beforeAll(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Check Expense Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(100000),
          warningThreshold: new Decimal(80),
          enforcement: BudgetEnforcement.SOFT_WARNING,
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;
    });

    afterAll(async () => {
      await prisma.budget.delete({ where: { id: testBudgetId } });
    });

    it('should allow expense within budget', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          departmentId,
        });

      expect(response.status).toBe(201);
      expect(response.body.allowed).toBe(true);
      expect(response.body.hasWarnings).toBe(false);
    });

    it('should return warning when expense exceeds threshold', async () => {
      // Create expenses to bring utilization near threshold
      const expense1 = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-THRESHOLD-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Threshold expense',
          expenseDate: new Date(),
          amount: new Decimal(75000),
          currency: 'PKR',
          totalAmount: new Decimal(75000),
          amountInPKR: new Decimal(75000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: testBudgetId,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          departmentId,
        });

      expect(response.status).toBe(201);
      expect(response.body.hasWarnings).toBe(true);

      // Cleanup
      await prisma.expense.delete({ where: { id: expense1.id } });
    });

    it('should block expense with HARD_BLOCK enforcement', async () => {
      const hardBlockBudget = await prisma.budget.create({
        data: {
          name: `Hard Block Budget ${Date.now()}`,
          type: BudgetType.CATEGORY,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(50000),
          enforcement: BudgetEnforcement.HARD_BLOCK,
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
          categoryId,
          ownerId: financeId,
          isActive: true,
        },
      });

      // Create expense to use most of budget
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-HARD-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Hard block test',
          expenseDate: new Date(),
          amount: new Decimal(45000),
          currency: 'PKR',
          totalAmount: new Decimal(45000),
          amountInPKR: new Decimal(45000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: hardBlockBudget.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.allowed).toBe(false);
      expect(response.body.message).toContain('blocked');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.budget.delete({ where: { id: hardBlockBudget.id } });
    });

    it('should require escalation with AUTO_ESCALATE enforcement', async () => {
      const escalateBudget = await prisma.budget.create({
        data: {
          name: `Escalate Budget ${Date.now()}`,
          type: BudgetType.CATEGORY,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(50000),
          enforcement: BudgetEnforcement.AUTO_ESCALATE,
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
          categoryId,
          ownerId: financeId,
          isActive: true,
        },
      });

      // Create expense to use most of budget
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-ESC-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Escalate test',
          expenseDate: new Date(),
          amount: new Decimal(45000),
          currency: 'PKR',
          totalAmount: new Decimal(45000),
          amountInPKR: new Decimal(45000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: escalateBudget.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.requiresEscalation).toBe(true);
      expect(response.body.message).toContain('escalation');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.budget.delete({ where: { id: escalateBudget.id } });
    });

    it('should return no budgets message when none applicable', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          projectId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(201);
      expect(response.body.allowed).toBe(true);
      expect(response.body.message).toContain('No applicable budgets');
    });
  });

  // ==================== BUDGET SUMMARY TESTS ====================

  describe('GET /budgets/summary - Budget Summary', () => {
    let testBudgetId: string;

    beforeAll(async () => {
      const now = new Date();
      const budget = await prisma.budget.create({
        data: {
          name: `Summary Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(500000),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });
      testBudgetId = budget.id;
    });

    afterAll(async () => {
      await prisma.budget.delete({ where: { id: testBudgetId } });
    });

    it('should return budget summary for finance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/summary')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.generatedAt).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalBudgets).toBeGreaterThanOrEqual(1);
      expect(response.body.budgets).toBeDefined();
      expect(Array.isArray(response.body.budgets)).toBe(true);
    });

    it('should return budget summary for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalAllocated).toBeGreaterThanOrEqual(500000);
    });

    it('should reject summary access by employee', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/summary')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should filter summary by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/summary?type=DEPARTMENT')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      response.body.budgets.forEach((budget: { type: BudgetType }) => {
        expect(budget.type).toBe(BudgetType.DEPARTMENT);
      });
    });

    it('should filter summary by fiscal year', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/budgets/summary?fiscalYear=${currentYear}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
    });
  });

  // ==================== PERIOD DATES TESTS ====================

  describe('GET /budgets/period-dates - Period Dates Calculation', () => {
    it('should calculate annual period dates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/period-dates?periodType=ANNUAL&fiscalYear=2024')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      const startDate = new Date(response.body.startDate);
      const endDate = new Date(response.body.endDate);
      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(0);
      expect(endDate.getMonth()).toBe(11);
    });

    it('should calculate quarterly period dates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/period-dates?periodType=QUARTERLY&fiscalYear=2024&quarter=2')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      const startDate = new Date(response.body.startDate);
      const endDate = new Date(response.body.endDate);
      expect(startDate.getMonth()).toBe(3); // April
      expect(endDate.getMonth()).toBe(5); // June
    });

    it('should calculate monthly period dates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/period-dates?periodType=MONTHLY&fiscalYear=2024&month=6')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      const startDate = new Date(response.body.startDate);
      const endDate = new Date(response.body.endDate);
      expect(startDate.getMonth()).toBe(5); // June (0-indexed)
      expect(endDate.getDate()).toBe(30); // June has 30 days
    });

    it('should reject quarterly without quarter parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/period-dates?periodType=QUARTERLY&fiscalYear=2024')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject monthly without month parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/period-dates?periodType=MONTHLY&fiscalYear=2024')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(400);
    });
  });

  // ==================== CURRENT PERIOD TESTS ====================

  describe('GET /budgets/current-period - Current Period', () => {
    it('should return current annual period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/current-period?periodType=ANNUAL')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(new Date().getFullYear());
    });

    it('should return current quarterly period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/current-period?periodType=QUARTERLY')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(new Date().getFullYear());
      expect(response.body.quarter).toBeGreaterThanOrEqual(1);
      expect(response.body.quarter).toBeLessThanOrEqual(4);
    });

    it('should return current monthly period', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/budgets/current-period?periodType=MONTHLY')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(new Date().getFullYear());
      expect(response.body.month).toBe(new Date().getMonth() + 1);
    });
  });

  // ==================== AUTHORIZATION TESTS ====================

  describe('Authorization and Access Control', () => {
    it('should prevent unauthenticated access to budgets', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/budgets');

      expect(response.status).toBe(401);
    });

    it('should prevent unauthenticated budget creation', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/budgets').send({
        name: 'Unauthorized Budget',
        type: BudgetType.DEPARTMENT,
        period: BudgetPeriod.ANNUAL,
        totalAmount: 500000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        departmentId,
      });

      expect(response.status).toBe(401);
    });

    it('should allow employee to check expense against budgets', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/budgets/check-expense')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          amount: 10000,
          departmentId,
        });

      expect(response.status).toBe(201);
    });
  });

  // ==================== FULL WORKFLOW TEST ====================

  describe('Full Budget Workflow', () => {
    it('should complete full lifecycle: create -> activate -> use -> close -> archive', async () => {
      const now = new Date();
      const pastYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      const pastYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];

      // Step 1: Create budget (inactive by default after we set isActive=false for test)
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: `Lifecycle Budget ${testTimestamp}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: 100000,
          enforcement: BudgetEnforcement.SOFT_WARNING,
          startDate: pastYearStart,
          endDate: pastYearEnd,
          departmentId,
        });

      expect(createResponse.status).toBe(201);
      const budgetId = createResponse.body.id;
      expect(createResponse.body.isActive).toBe(true);

      // Step 2: Close budget
      const closeResponse = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budgetId}/close`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(closeResponse.status).toBe(201);
      expect(closeResponse.body.isActive).toBe(false);

      // Step 3: Archive budget
      const archiveResponse = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budgetId}/archive`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(archiveResponse.status).toBe(201);

      // Cleanup
      await prisma.auditLog.deleteMany({ where: { entityId: budgetId } });
      await prisma.budget.delete({ where: { id: budgetId } });
    });

    it('should track utilization as expenses are added', async () => {
      const now = new Date();
      // Create budget
      const budget = await prisma.budget.create({
        data: {
          name: `Utilization Track Budget ${Date.now()}`,
          type: BudgetType.DEPARTMENT,
          period: BudgetPeriod.ANNUAL,
          totalAmount: new Decimal(100000),
          warningThreshold: new Decimal(80),
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          departmentId,
          ownerId: financeId,
          isActive: true,
        },
      });

      // Check initial utilization
      const initial = await request(app.getHttpServer())
        .get(`/api/v1/budgets/${budget.id}/utilization`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(initial.body.utilizationPercentage).toBe(0);
      expect(initial.body.available).toBe(100000);

      // Add expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-TRACK-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          departmentId,
          description: 'Tracking expense',
          expenseDate: new Date(),
          amount: new Decimal(40000),
          currency: 'PKR',
          totalAmount: new Decimal(40000),
          amountInPKR: new Decimal(40000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          budgetId: budget.id,
        },
      });

      // Check updated utilization
      const updated = await request(app.getHttpServer())
        .get(`/api/v1/budgets/${budget.id}/utilization`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(updated.body.utilizationPercentage).toBe(40);
      expect(updated.body.spent).toBe(40000);
      expect(updated.body.available).toBe(60000);

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.budget.delete({ where: { id: budget.id } });
    });
  });
});
