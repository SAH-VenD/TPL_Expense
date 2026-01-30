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
import { RoleType, VoucherStatus, ExpenseType, ExpenseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Vouchers Workflow (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let approverToken: string;
  let financeToken: string;
  let adminToken: string;

  let employeeId: string;
  let employee2Id: string;
  let approverId: string;
  let financeId: string;
  let adminId: string;

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

    // Create test users
    const employee = await createTestUser({
      email: `voucher-employee-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Employee',
      role: RoleType.EMPLOYEE,
    });
    employeeId = employee.id;

    const employee2 = await createTestUser({
      email: `voucher-employee2-${testTimestamp}@tekcellent.com`,
      firstName: 'Test2',
      lastName: 'Employee2',
      role: RoleType.EMPLOYEE,
    });
    employee2Id = employee2.id;

    const approver = await createTestUser({
      email: `voucher-approver-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Approver',
      role: RoleType.APPROVER,
    });
    approverId = approver.id;

    const finance = await createTestUser({
      email: `voucher-finance-${testTimestamp}@tekcellent.com`,
      firstName: 'Test',
      lastName: 'Finance',
      role: RoleType.FINANCE,
    });
    financeId = finance.id;

    const admin = await createTestUser({
      email: `voucher-admin-${testTimestamp}@tekcellent.com`,
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
    const category = await createTestCategory('Office Supplies');
    categoryId = category.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.expense.deleteMany({
      where: { submitterId: { in: [employeeId, employee2Id] } },
    });
    await prisma.voucher.deleteMany({
      where: { requesterId: { in: [employeeId, employee2Id] } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.refreshToken.deleteMany({
      where: {
        userId: { in: [employeeId, employee2Id, approverId, financeId, adminId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [employeeId, employee2Id, approverId, financeId, adminId] },
      },
    });

    await disconnectTestDatabase();
    await app.close();
  }, 15000);

  describe('Create Voucher Request', () => {
    it('should create a valid voucher request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 25000,
          purpose: 'Office supplies for team meeting and client presentation materials',
        });

      expect(response.status).toBe(201);
      expect(response.body.voucherNumber).toMatch(/^PC-\d{4}-\d{4}$/);
      expect(response.body.status).toBe(VoucherStatus.REQUESTED);
      expect(response.body.requestedAmount).toBe('25000');
      expect(response.body.requester).toBeDefined();

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
    });

    it('should reject voucher with negative amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: -1000,
          purpose: 'Invalid negative amount',
        });

      expect(response.status).toBe(400);
    });

    it('should reject voucher with zero amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 0,
          purpose: 'Invalid zero amount',
        });

      expect(response.status).toBe(400);
    });

    it('should reject voucher exceeding maximum amount (50000 PKR)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 60000,
          purpose: 'Exceeds maximum petty cash limit',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('50000');
    });

    it('should reject voucher with short purpose (< 10 chars)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 25000,
          purpose: 'Short',
        });

      expect(response.status).toBe(400);
    });

    it('should reject if user has existing open voucher', async () => {
      // Create first voucher
      const first = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 25000,
          purpose: 'First voucher request for office supplies',
        });

      expect(first.status).toBe(201);

      // Try to create second voucher
      const second = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 30000,
          purpose: 'Second voucher - should be rejected',
        });

      expect(second.status).toBe(400);
      expect(second.body.message).toContain('already have an open');

      // Cleanup
      await prisma.voucher.delete({ where: { id: first.body.id } });
    });
  });

  describe('Approval Workflow', () => {
    let voucherId: string;

    beforeAll(async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-TEST-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(30000),
          purpose: 'Test voucher for approval workflow',
          status: VoucherStatus.REQUESTED,
        },
      });
      voucherId = voucher.id;
    });

    afterAll(async () => {
      await prisma.voucher.deleteMany({ where: { id: voucherId } });
    });

    it('should allow approver to see pending vouchers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/pending-approval')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const pendingVoucher = response.body.find((v: { id: string }) => v.id === voucherId);
      expect(pendingVoucher).toBeDefined();
    });

    it('should reject employee access to pending approvals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/pending-approval')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should approve voucher', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/approve`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.APPROVED);
      expect(response.body.approvedBy).toBe(approverId);
      expect(response.body.approvedAt).toBeDefined();
    });

    it('should reject approval of already approved voucher', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/approve`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only requested vouchers can be approved');
    });
  });

  describe('Rejection Workflow', () => {
    let voucherId: string;

    beforeEach(async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-REJECT-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(20000),
          purpose: 'Test voucher for rejection workflow',
          status: VoucherStatus.REQUESTED,
        },
      });
      voucherId = voucher.id;
    });

    afterEach(async () => {
      await prisma.voucher.deleteMany({ where: { id: voucherId } });
    });

    it('should reject voucher with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/reject`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          reason: 'Amount exceeds departmental policy limit',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.REJECTED);
      expect(response.body.notes).toContain('exceeds departmental policy');
    });

    it('should require rejection reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/reject`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          reason: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Cancel Voucher', () => {
    it('should allow owner to cancel before disbursement', async () => {
      // Create voucher
      const create = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 15000,
          purpose: 'Test voucher for cancellation',
        });

      const voucherId = create.body.id;

      // Cancel voucher
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/vouchers/${voucherId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(VoucherStatus.REJECTED);
      expect(response.body.notes).toContain('Cancelled');

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucherId } });
    });

    it('should reject cancel by non-owner', async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-CANCEL-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(15000),
          purpose: 'Test voucher for non-owner cancel',
          status: VoucherStatus.REQUESTED,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should reject cancel after disbursement', async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-DISB-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(15000),
          purpose: 'Test voucher for disbursed cancel',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(15000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('before disbursement');

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });
  });

  describe('Disburse Voucher', () => {
    let voucherId: string;

    beforeEach(async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-DISB-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(40000),
          purpose: 'Test voucher for disbursement',
          status: VoucherStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          approvedAmount: new Decimal(40000),
        },
      });
      voucherId = voucher.id;
    });

    afterEach(async () => {
      await prisma.voucher.deleteMany({ where: { id: voucherId } });
    });

    it('should disburse approved voucher', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/disburse`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 35000,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.DISBURSED);
      expect(response.body.disbursedAmount).toBe('35000');
      expect(response.body.disbursedBy).toBe(financeId);
      expect(response.body.settlementDeadline).toBeDefined();
    });

    it('should reject disbursement exceeding requested amount', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/disburse`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 50000, // Exceeds requested 40000
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot exceed requested amount');
    });

    it('should reject disbursement by non-finance', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/disburse`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          amount: 35000,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Link Expense to Voucher', () => {
    let voucherId: string;
    let expenseId: string;

    beforeEach(async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-LINK-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher for expense linking',
          status: VoucherStatus.DISBURSED,
          approvedBy: approverId,
          approvedAt: new Date(),
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });
      voucherId = voucher.id;

      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-LINK-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Petty cash expense for linking',
          expenseDate: new Date(),
          amount: new Decimal(10000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(10000),
          amountInPKR: new Decimal(10000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
        },
      });
      expenseId = expense.id;
    });

    afterEach(async () => {
      await prisma.expense.deleteMany({ where: { id: expenseId } });
      await prisma.voucher.deleteMany({ where: { id: voucherId } });
    });

    it('should link petty cash expense to disbursed voucher', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/link-expense`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          expenseId,
        });

      expect(response.status).toBe(201);
      expect(response.body.expenses).toBeDefined();

      // Verify expense is linked
      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      expect(expense?.voucherId).toBe(voucherId);
    });

    it('should reject linking by non-owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/link-expense`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          expenseId,
        });

      expect(response.status).toBe(403);
    });

    it('should reject linking non-petty-cash expense', async () => {
      const standardExpense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-STD-${Date.now()}`,
          type: ExpenseType.OUT_OF_POCKET,
          submitterId: employeeId,
          categoryId,
          description: 'Out of pocket expense',
          expenseDate: new Date(),
          amount: new Decimal(10000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(10000),
          amountInPKR: new Decimal(10000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/link-expense`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          expenseId: standardExpense.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only petty cash');

      // Cleanup
      await prisma.expense.delete({ where: { id: standardExpense.id } });
    });
  });

  describe('Settle Voucher', () => {
    it('should settle voucher with exact spend', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-SETTLE-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher for settlement',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create and link expenses
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-SETTLE-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Expense for settlement',
          expenseDate: new Date(),
          amount: new Decimal(50000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(50000),
          amountInPKR: new Decimal(50000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Settle voucher
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'All expenses documented',
          cashReturnConfirmed: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.SETTLED);
      expect(response.body.settledAmount).toBe('50000');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should require overspend justification', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-OVER-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(40000),
          purpose: 'Test voucher for overspend',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(40000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create overspent expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-OVER-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Overspent expense',
          expenseDate: new Date(),
          amount: new Decimal(50000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(50000),
          amountInPKR: new Decimal(50000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Try to settle without justification
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Settlement notes',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Overspend justification required');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should settle with overspend justification', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-OVER2-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(40000),
          purpose: 'Test voucher for overspend with justification',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(40000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create overspent expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-OVER2-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Overspent expense',
          expenseDate: new Date(),
          amount: new Decimal(45000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(45000),
          amountInPKR: new Decimal(45000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Settle with justification
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Settlement notes',
          overspendJustification: 'Additional items were required for the event',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.SETTLED);

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should require cash return confirmation for underspend', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-UNDER-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher for underspend',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create underspent expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-UNDER-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Underspent expense',
          expenseDate: new Date(),
          amount: new Decimal(30000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(30000),
          amountInPKR: new Decimal(30000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Try to settle without cash return confirmation
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Settlement notes',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('confirm return');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should reject settlement with pending expenses', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-PEND-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher for pending expenses',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create pending expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-PEND-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Pending expense',
          expenseDate: new Date(),
          amount: new Decimal(50000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(50000),
          amountInPKR: new Decimal(50000),
          status: ExpenseStatus.SUBMITTED, // Still pending
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Try to settle
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Settlement notes',
          cashReturnConfirmed: false,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('pending approval');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should allow finance to settle voucher', async () => {
      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-FIN-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher for finance settlement',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-FIN-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Finance settlement expense',
          expenseDate: new Date(),
          amount: new Decimal(50000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(50000),
          amountInPKR: new Decimal(50000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      // Finance settles
      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/settle`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          notes: 'Settled by finance',
          cashReturnConfirmed: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.SETTLED);

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });
  });

  describe('Get Outstanding Vouchers', () => {
    it('should return outstanding vouchers for finance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/outstanding')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject access for non-finance/admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/outstanding')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Get Overdue Vouchers', () => {
    it('should return overdue vouchers for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject access for non-finance/admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/overdue')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should prevent employee from accessing other user vouchers', async () => {
      // Create voucher for employee2
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-AUTH-${Date.now()}`,
          requesterId: employee2Id,
          requestedAmount: new Decimal(25000),
          purpose: 'Test voucher for authorization',
          status: VoucherStatus.REQUESTED,
        },
      });

      // Try to access as employee1
      const response = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should allow admin to access any voucher', async () => {
      // Create voucher for employee
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-ADMIN-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(25000),
          purpose: 'Test voucher for admin access',
          status: VoucherStatus.REQUESTED,
        },
      });

      // Access as admin
      const response = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(voucher.id);

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });

    it('should prevent unauthenticated access', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/vouchers');

      expect(response.status).toBe(401);
    });
  });

  describe('Full Voucher Lifecycle', () => {
    it('should complete full lifecycle: create -> approve -> disburse -> link expense -> settle', async () => {
      // Step 1: Create voucher
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 30000,
          purpose: 'Full lifecycle test voucher for office supplies',
        });

      expect(createResponse.status).toBe(201);
      const voucherId = createResponse.body.id;
      expect(createResponse.body.status).toBe(VoucherStatus.REQUESTED);

      // Step 2: Approve voucher
      const approveResponse = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/approve`)
        .set('Authorization', `Bearer ${approverToken}`);

      expect(approveResponse.status).toBe(201);
      expect(approveResponse.body.status).toBe(VoucherStatus.APPROVED);

      // Step 3: Disburse voucher
      const disburseResponse = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/disburse`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 30000,
        });

      expect(disburseResponse.status).toBe(201);
      expect(disburseResponse.body.status).toBe(VoucherStatus.DISBURSED);
      expect(disburseResponse.body.disbursedAmount).toBe('30000');
      expect(disburseResponse.body.settlementDeadline).toBeDefined();

      // Step 4: Create and link expense
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-LIFECYCLE-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Office supplies expense',
          expenseDate: new Date(),
          amount: new Decimal(30000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(30000),
          amountInPKR: new Decimal(30000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
        },
      });

      const linkResponse = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/link-expense`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          expenseId: expense.id,
        });

      expect(linkResponse.status).toBe(201);

      // Step 5: Settle voucher (exact spend - no confirmation needed)
      const settleResponse = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucherId}/settle`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'All expenses documented and verified',
        });

      expect(settleResponse.status).toBe(201);
      expect(settleResponse.body.status).toBe(VoucherStatus.SETTLED);
      expect(settleResponse.body.settledAmount).toBe('30000');

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucherId } });
    });
  });

  describe('Boundary Value Tests', () => {
    it('should accept exactly 50000 PKR (maximum limit)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 50000,
          purpose: 'Maximum petty cash request for bulk office supplies',
        });

      expect(response.status).toBe(201);
      expect(response.body.requestedAmount).toBe('50000');

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
    });

    it('should accept exactly 10 character purpose (minimum length)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 25000,
          purpose: '1234567890', // Exactly 10 characters
        });

      expect(response.status).toBe(201);

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
    });

    it('should reject 9 character purpose (below minimum)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 25000,
          purpose: '123456789', // 9 characters
        });

      expect(response.status).toBe(400);
    });

    it('should reject 50001 PKR (above maximum)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 50001,
          purpose: 'Slightly above maximum limit for testing',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('50000');
    });

    it('should accept 1 PKR (minimum positive)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          requestedAmount: 1,
          purpose: 'Minimum petty cash for small item purchase',
        });

      expect(response.status).toBe(201);
      expect(response.body.requestedAmount).toBe('1');

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
    });
  });

  describe('Settlement Deadline Calculation', () => {
    it('should set settlement deadline when disbursing', async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-DEADLINE-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(30000),
          purpose: 'Test settlement deadline calculation',
          status: VoucherStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          approvedAmount: new Decimal(30000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/disburse`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 30000,
        });

      expect(response.status).toBe(201);
      expect(response.body.settlementDeadline).toBeDefined();

      // Verify deadline is approximately 7 business days in the future
      const deadline = new Date(response.body.settlementDeadline);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Should be between 7-14 days (7 business days including weekends)
      expect(diffDays).toBeGreaterThanOrEqual(7);
      expect(diffDays).toBeLessThanOrEqual(14);

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });
  });

  describe('Multiple Open Voucher Prevention', () => {
    it('should allow creating after settling previous voucher', async () => {
      // Create and settle first voucher
      const firstVoucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-FIRST-${Date.now()}`,
          requesterId: employee2Id,
          requestedAmount: new Decimal(20000),
          purpose: 'First voucher to be settled',
          status: VoucherStatus.SETTLED,
          settledAmount: new Decimal(20000),
          settledAt: new Date(),
        },
      });

      // Get employee2 token
      const employee2Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `voucher-employee2-${testTimestamp}@tekcellent.com`,
          password: TEST_PASSWORD,
        });
      const employee2Token = employee2Login.body.accessToken;

      // Should be able to create new voucher
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employee2Token}`)
        .send({
          requestedAmount: 15000,
          purpose: 'Second voucher after settling first',
        });

      expect(response.status).toBe(201);

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
      await prisma.voucher.delete({ where: { id: firstVoucher.id } });
    });

    it('should allow creating after rejection of previous voucher', async () => {
      // Create and reject first voucher
      const rejectedVoucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-REJECT-${Date.now()}`,
          requesterId: employee2Id,
          requestedAmount: new Decimal(20000),
          purpose: 'Rejected voucher',
          status: VoucherStatus.REJECTED,
          notes: 'Rejected for testing',
        },
      });

      // Get employee2 token
      const employee2Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `voucher-employee2-${testTimestamp}@tekcellent.com`,
          password: TEST_PASSWORD,
        });
      const employee2Token = employee2Login.body.accessToken;

      // Should be able to create new voucher
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${employee2Token}`)
        .send({
          requestedAmount: 15000,
          purpose: 'New voucher after rejection of previous',
        });

      expect(response.status).toBe(201);

      // Cleanup
      await prisma.voucher.delete({ where: { id: response.body.id } });
      await prisma.voucher.delete({ where: { id: rejectedVoucher.id } });
    });
  });

  describe('Partial Disbursement', () => {
    it('should allow disbursing less than requested amount', async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-PARTIAL-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(40000),
          purpose: 'Test partial disbursement',
          status: VoucherStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          approvedAmount: new Decimal(40000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/disburse`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 30000, // Less than requested
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(VoucherStatus.DISBURSED);
      expect(response.body.disbursedAmount).toBe('30000');

      // Cleanup
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });
  });

  describe('Get Voucher Details', () => {
    it('should return voucher with expenses included', async () => {
      const voucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-DETAIL-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(50000),
          purpose: 'Test voucher details with expenses',
          status: VoucherStatus.DISBURSED,
          disbursedAmount: new Decimal(50000),
          disbursedBy: financeId,
          disbursedAt: new Date(),
        },
      });

      const expense = await prisma.expense.create({
        data: {
          expenseNumber: `EXP-DETAIL-${Date.now()}`,
          type: ExpenseType.PETTY_CASH,
          submitterId: employeeId,
          categoryId,
          description: 'Expense for detail test',
          expenseDate: new Date(),
          amount: new Decimal(25000),
          currency: 'PKR' as any,
          totalAmount: new Decimal(25000),
          amountInPKR: new Decimal(25000),
          status: ExpenseStatus.APPROVED,
          submittedAt: new Date(),
          voucherId: voucher.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(voucher.id);
      expect(response.body.expenses).toBeDefined();
      expect(response.body.expenses.length).toBeGreaterThanOrEqual(1);
      expect(response.body.requester).toBeDefined();

      // Cleanup
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.voucher.delete({ where: { id: voucher.id } });
    });
  });

  describe('List Vouchers with Status Filter', () => {
    it('should filter vouchers by status', async () => {
      // Create vouchers with different statuses
      const requestedVoucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-REQ-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(20000),
          purpose: 'Requested status voucher',
          status: VoucherStatus.REQUESTED,
        },
      });

      const approvedVoucher = await prisma.voucher.create({
        data: {
          voucherNumber: `PC-2024-APP-${Date.now()}`,
          requesterId: employeeId,
          requestedAmount: new Decimal(25000),
          purpose: 'Approved status voucher',
          status: VoucherStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });

      // Get only REQUESTED vouchers
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers?status=REQUESTED')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify all returned vouchers have REQUESTED status
      response.body.forEach((v: { status: VoucherStatus }) => {
        expect(v.status).toBe(VoucherStatus.REQUESTED);
      });

      // Cleanup
      await prisma.voucher.delete({ where: { id: requestedVoucher.id } });
      await prisma.voucher.delete({ where: { id: approvedVoucher.id } });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent voucher', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/vouchers/non-existent-id-12345')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when approving non-existent voucher', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers/non-existent-id-12345/approve')
        .set('Authorization', `Bearer ${approverToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when disbursing non-existent voucher', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vouchers/non-existent-id-12345/disburse')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ amount: 25000 });

      expect(response.status).toBe(404);
    });
  });
});
