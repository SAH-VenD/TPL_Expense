import { PrismaClient, UserStatus, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

// Create a separate Prisma client for testing
export const prisma = new PrismaClient();

// Test constants
export const TEST_PASSWORD = 'Test@123!';
export const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 12);

// User factory functions
export interface CreateTestUserOptions {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: RoleType;
  status?: UserStatus;
  departmentId?: string;
  managerId?: string;
}

export async function createTestUser(options: CreateTestUserOptions = {}) {
  const timestamp = Date.now();
  const email = options.email || `testuser${timestamp}@tekcellent.com`;

  return prisma.user.create({
    data: {
      email,
      passwordHash: TEST_PASSWORD_HASH,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'User',
      role: options.role || RoleType.EMPLOYEE,
      status: options.status || UserStatus.ACTIVE,
      departmentId: options.departmentId,
      managerId: options.managerId,
      passwordHistory: [TEST_PASSWORD_HASH],
    },
  });
}

export async function createTestAdmin() {
  return createTestUser({
    email: `admin${Date.now()}@tekcellent.com`,
    firstName: 'Admin',
    lastName: 'User',
    role: RoleType.ADMIN,
    status: UserStatus.ACTIVE,
  });
}

export async function createTestDepartment(name?: string) {
  const timestamp = Date.now();
  return prisma.department.create({
    data: {
      name: name || `Test Department ${timestamp}`,
      code: `DEPT${timestamp}`,
      description: 'Test department for testing',
    },
  });
}

export async function createTestCategory(name?: string) {
  const timestamp = Date.now();
  return prisma.category.create({
    data: {
      name: name || `Test Category ${timestamp}`,
      code: `CAT${timestamp}`,
      description: 'Test category for testing',
      requiresReceipt: true,
      requiresPreApproval: false,
    },
  });
}

// JWT token generation for tests
export function generateTestToken(userId: string, role: RoleType = RoleType.EMPLOYEE) {
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'test-secret-key',
  });

  return jwtService.sign({
    sub: userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  });
}

// Cleanup functions
export async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'testuser',
      },
    },
  });
}

export async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.comment.deleteMany({});
  await prisma.approvalHistory.deleteMany({});
  await prisma.expenseSplit.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.voucher.deleteMany({});
  await prisma.preApproval.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.approvalDelegation.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'testuser',
      },
    },
  });
}

// Database connection helpers
export async function connectTestDatabase() {
  await prisma.$connect();
}

export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

// Wait helper for async operations
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Response assertion helpers
export function expectSuccessResponse(response: { status: number; body: unknown }) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

export function expectErrorResponse(
  response: { status: number; body: { message?: string } },
  expectedStatus: number,
  messageContains?: string,
) {
  expect(response.status).toBe(expectedStatus);
  if (messageContains) {
    expect(response.body.message).toContain(messageContains);
  }
}
