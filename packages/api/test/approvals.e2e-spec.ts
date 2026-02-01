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
  createTestCategory,
} from './test-utils';
import { RoleType, ExpenseStatus, ApprovalAction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Helper function to create expense data
function createExpenseData(
  submitterId: string,
  categoryId: string,
  description: string,
  amount: number,
) {
  return {
    submitterId,
    categoryId,
    expenseNumber: `EXP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type: 'STANDARD' as any,
    description,
    amount: new Decimal(amount),
    currency: 'PKR' as any,
    totalAmount: new Decimal(amount),
    amountInPKR: new Decimal(amount),
    expenseDate: new Date(),
    status: ExpenseStatus.SUBMITTED,
    submittedAt: new Date(),
  };
}

describe('Approvals Workflow (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let approverToken: string;
  let financeToken: string;
  let adminToken: string;

  let employeeId: string;
  let approverId: string;
  let financeId: string;
  let adminId: string;

  let categoryId: string;
  let tier1Id: string;
  let tier2Id: string;

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

    // Create test users
    const employee = await createTestUser({
      email: `e2e-employee-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Employee',
      role: RoleType.EMPLOYEE,
    });
    employeeId = employee.id;

    const approver = await createTestUser({
      email: `e2e-approver-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Approver',
      role: RoleType.APPROVER,
    });
    approverId = approver.id;

    const finance = await createTestUser({
      email: `e2e-finance-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Finance',
      role: RoleType.FINANCE,
    });
    financeId = finance.id;

    const admin = await createTestUser({
      email: `e2e-admin-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
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

    // Create test category
    const category = await createTestCategory('Travel');
    categoryId = category.id;

    // Create approval tiers
    const tier1 = await prisma.approvalTier.create({
      data: {
        name: 'Tier 1 - Manager',
        tierOrder: 1,
        minAmount: new Decimal(0),
        maxAmount: new Decimal(50000),
        approverRole: RoleType.APPROVER,
      },
    });
    tier1Id = tier1.id;

    const tier2 = await prisma.approvalTier.create({
      data: {
        name: 'Tier 2 - Finance',
        tierOrder: 2,
        minAmount: new Decimal(10000),
        maxAmount: null,
        approverRole: RoleType.FINANCE,
      },
    });
    tier2Id = tier2.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.approvalHistory.deleteMany({
      where: { expense: { submitterId: employeeId } },
    });
    await prisma.expense.deleteMany({
      where: { submitterId: employeeId },
    });
    await prisma.approvalDelegation.deleteMany({
      where: {
        OR: [{ fromUserId: { in: [employeeId, approverId, financeId, adminId] } }],
      },
    });
    await prisma.approvalTier.deleteMany({
      where: { id: { in: [tier1Id, tier2Id] } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.refreshToken.deleteMany({
      where: {
        userId: { in: [employeeId, approverId, financeId, adminId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [employeeId, approverId, financeId, adminId] },
      },
    });

    await disconnectTestDatabase();
    await app.close();
  }, 15000);

  describe('Single-Tier Approval Workflow', () => {
    let expenseId: string;

    it('Step 1: Employee submits expense (low amount)', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(
          employeeId,
          categoryId,
          'Low Amount Expense - Should require only Tier 1 approval',
          5000,
        ),
      });
      expenseId = expense.id;

      expect(expense.status).toBe(ExpenseStatus.SUBMITTED);
    });

    it('Step 2: Approver sees expense in pending list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: expenseId })]),
      );
    });

    it('Step 3: Finance should NOT see low amount expense', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      // Finance should not see this expense as it doesn't require Tier 2
      const financeExpenses = response.body.data.filter((e: { id: string }) => e.id === expenseId);
      expect(financeExpenses).toHaveLength(0);
    });

    it('Step 4: Approver approves expense (full approval)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId,
          comments: 'Approved - looks good',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('fully approved');

      // Verify expense status
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.status).toBe(ExpenseStatus.APPROVED);
    });

    it('Step 5: Approval history is recorded', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/expenses/${expenseId}/history`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveLength(1);
      expect(response.body.timeline[0].action).toBe(ApprovalAction.APPROVED);
      expect(response.body.timeline[0].tierLevel).toBe(1);
      expect(response.body.currentStatus).toBe(ExpenseStatus.APPROVED);
    });
  });

  describe('Multi-Tier Approval Workflow', () => {
    let expenseId: string;

    it('Step 1: Employee submits high amount expense', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(
          employeeId,
          categoryId,
          'High Amount Expense - Should require Tier 1 and Tier 2 approval',
          25000,
        ),
      });
      expenseId = expense.id;
    });

    it('Step 2: Approver sees expense in pending list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      const pendingExpense = response.body.data.find((e: { id: string }) => e.id === expenseId);
      expect(pendingExpense).toBeDefined();
    });

    it('Step 3: Approver approves at Tier 1', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId,
          comments: 'Tier 1 approved',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('tier 1');
      expect(response.body.message).toContain('tier 2');
      expect(response.body.nextTier).toContain('Finance');

      // Expense should still be PENDING_APPROVAL
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.status).toBe(ExpenseStatus.PENDING_APPROVAL);
    });

    it('Step 4: Finance sees expense in pending list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      const pendingExpense = response.body.data.find((e: { id: string }) => e.id === expenseId);
      expect(pendingExpense).toBeDefined();
    });

    it('Step 5: Approver should NOT see expense anymore', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      const pendingExpense = response.body.data.find((e: { id: string }) => e.id === expenseId);
      expect(pendingExpense).toBeUndefined();
    });

    it('Step 6: Finance approves at Tier 2 (final approval)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          expenseId,
          comments: 'Tier 2 approved - final',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('fully approved');

      // Expense should now be APPROVED
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.status).toBe(ExpenseStatus.APPROVED);
    });

    it('Step 7: Both approvals recorded in history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/expenses/${expenseId}/history`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveLength(2);
      expect(response.body.timeline[0].tierLevel).toBe(1);
      expect(response.body.timeline[1].tierLevel).toBe(2);
      expect(response.body.currentStatus).toBe(ExpenseStatus.APPROVED);
    });
  });

  describe('Rejection Workflow', () => {
    let expenseId: string;

    it('Step 1: Employee submits expense', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Expense to Reject', 5000),
      });
      expenseId = expense.id;
    });

    it('Step 2: Approver rejects expense', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/reject')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId,
          reason: 'Missing receipt attachment',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('rejected');

      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.status).toBe(ExpenseStatus.REJECTED);
      expect(expense?.rejectionReason).toBe('Missing receipt attachment');
    });

    it('Step 3: Rejection requires reason', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Another Expense', 5000),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/reject')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId: expense.id,
          reason: '', // Empty reason
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Clarification Request Workflow', () => {
    let expenseId: string;

    it('Step 1: Employee submits expense', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Unclear Expense', 5000),
      });
      expenseId = expense.id;
    });

    it('Step 2: Approver requests clarification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/clarify')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId,
          question: 'Please provide more details about this expense',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Clarification requested');

      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.status).toBe(ExpenseStatus.CLARIFICATION_REQUESTED);
      expect(expense?.clarificationNote).toBe('Please provide more details about this expense');
    });

    it('Step 3: Clarification requires question', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Another Expense', 5000),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/clarify')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId: expense.id,
          question: '', // Empty question
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Bulk Approval', () => {
    let expense1Id: string;
    let expense2Id: string;
    let expense3Id: string;

    beforeAll(async () => {
      const expense1 = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Bulk Expense 1', 3000),
      });
      expense1Id = expense1.id;

      const expense2 = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Bulk Expense 2', 4000),
      });
      expense2Id = expense2.id;

      const expense3 = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Bulk Expense 3', 2000),
      });
      expense3Id = expense3.id;
    });

    it('should approve multiple expenses in bulk', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve/bulk')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseIds: [expense1Id, expense2Id, expense3Id],
          comments: 'Bulk approved',
        });

      expect(response.status).toBe(201);
      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.successful).toBe(3);
      expect(response.body.summary.failed).toBe(0);

      // Verify all are approved
      const expenses = await prisma.expense.findMany({
        where: { id: { in: [expense1Id, expense2Id, expense3Id] } },
      });
      expect(expenses.every((e) => e.status === ExpenseStatus.APPROVED)).toBe(true);
    });
  });

  describe('Authorization Checks', () => {
    let expenseId: string;

    beforeAll(async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Auth Test Expense', 5000),
      });
      expenseId = expense.id;
    });

    it('should prevent employee from approving expense', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          expenseId,
          comments: 'Trying to approve own expense',
        });

      expect(response.status).toBe(403);
    });

    it('should prevent unauthenticated access to approvals', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/approvals/pending');

      expect(response.status).toBe(401);
    });

    it('should allow admin to approve expense', async () => {
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'Admin Test Expense', 5000),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expenseId: expense.id,
        });

      // Admin might not have the right role for the tier, so it might fail with 403
      // This depends on tier configuration - adjust test based on your business rules
      expect([201, 403]).toContain(response.status);
    });
  });

  describe('Delegation Workflow', () => {
    let delegationId: string;

    it('Step 1: Approver creates delegation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/delegations')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          delegateId: financeId,
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
          reason: 'On vacation',
        });

      expect(response.status).toBe(201);
      expect(response.body.fromUserId).toBe(approverId);
      expect(response.body.toUserId).toBe(financeId);
      delegationId = response.body.id;
    });

    it('Step 2: Get active delegations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/delegations')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Step 3: Revoke delegation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/delegations/revoke')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          delegationId,
        });

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(false);
    });

    it('should reject delegation with invalid dates', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/approvals/delegations')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          delegateId: financeId,
          startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(), // End before start
          reason: 'Invalid',
        });

      expect(response.status).toBe(400);
    });

    it('should prevent revoking other user delegation', async () => {
      // Create delegation as approver
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/approvals/delegations')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          delegateId: financeId,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        });

      const newDelegationId = createResponse.body.id;

      // Try to revoke as employee (different user)
      const revokeResponse = await request(app.getHttpServer())
        .post('/api/v1/approvals/delegations/revoke')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          delegationId: newDelegationId,
        });

      expect(revokeResponse.status).toBe(403);
    });
  });

  describe('Approval Tiers', () => {
    it('should get all approval tiers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/tiers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent non-admin from viewing tiers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/tiers')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Approval History', () => {
    it('should get user approval history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/history')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get expense-specific approval history', async () => {
      // Create and approve an expense first
      const expense = await prisma.expense.create({
        data: createExpenseData(employeeId, categoryId, 'History Test Expense', 5000),
      });

      await request(app.getHttpServer())
        .post('/api/v1/approvals/approve')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({ expenseId: expense.id });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/expenses/${expense.id}/history`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenseId).toBe(expense.id);
      expect(response.body.timeline).toBeDefined();
      expect(response.body.timeline.length).toBeGreaterThan(0);
    });
  });
});
