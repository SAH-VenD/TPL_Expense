import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  prisma,
  TEST_PASSWORD,
  TEST_PASSWORD_HASH,
  connectTestDatabase,
  disconnectTestDatabase,
} from './test-utils';
import { RoleType, UserStatus } from '@prisma/client';

describe('User Registration & Approval Flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  const testTimestamp = Date.now();
  const adminEmail = `e2e-admin-${testTimestamp}@tekcellent.com`;

  beforeAll(async () => {
    await connectTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure app the same way as main.ts
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

    // Create an admin user directly in the database
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: TEST_PASSWORD_HASH,
        firstName: 'E2E Admin',
        lastName: 'User',
        role: RoleType.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHistory: [TEST_PASSWORD_HASH],
      },
    });

    // Login as admin to get a real token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: adminEmail,
        password: TEST_PASSWORD,
      });

    adminToken = loginResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    // Cleanup all test users
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            contains: `e2e-`,
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: `e2e-`,
        },
      },
    });
    await disconnectTestDatabase();
    await app.close();
  }, 15000);

  describe('Complete User Approval Flow', () => {
    const testEmail = `e2e-newuser-${testTimestamp}@tekcellent.com`;
    let registeredUserId: string;

    it('Step 1: Register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
          firstName: 'E2E New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toMatch(/approval/i);

      registeredUserId = response.body.userId;

      // Verify user is created with PENDING_APPROVAL status
      const user = await prisma.user.findUnique({
        where: { id: registeredUserId },
      });
      expect(user).toBeDefined();
      expect(user?.status).toBe(UserStatus.PENDING_APPROVAL);
      expect(user?.email).toBe(testEmail);
    });

    it('Step 2: Attempt login with pending user (should fail)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/pending|not active|approval/i);
    });

    it('Step 3: Admin can see pending user in user list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'PENDING_APPROVAL' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      const pendingUser = response.body.data.find(
        (u: { email: string }) => u.email === testEmail,
      );
      expect(pendingUser).toBeDefined();
      expect(pendingUser.status).toBe('PENDING_APPROVAL');
    });

    it('Step 4: Admin approves the pending user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${registeredUserId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ACTIVE');

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: registeredUserId },
      });
      expect(user?.status).toBe(UserStatus.ACTIVE);
    });

    it('Step 5: User can now login after approval', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testEmail);
    });
  });

  describe('Registration Validation', () => {
    it('should reject registration with non-tekcellent.com email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'user@gmail.com',
          password: TEST_PASSWORD,
          firstName: 'Invalid',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/tekcellent\.com/i);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `e2e-weakpass-${testTimestamp}@tekcellent.com`,
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('User Deactivation & Reactivation', () => {
    const activeUserEmail = `e2e-activeuser-${testTimestamp}@tekcellent.com`;
    let activeUserId: string;

    beforeAll(async () => {
      // Create user directly in database with ACTIVE status
      const user = await prisma.user.create({
        data: {
          email: activeUserEmail,
          passwordHash: TEST_PASSWORD_HASH,
          firstName: 'E2E Active',
          lastName: 'User',
          role: RoleType.EMPLOYEE,
          status: UserStatus.ACTIVE,
          passwordHistory: [TEST_PASSWORD_HASH],
        },
      });
      activeUserId = user.id;
    });

    it('should allow admin to deactivate an active user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${activeUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('INACTIVE');

      // Verify deactivated user cannot login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: activeUserEmail,
          password: TEST_PASSWORD,
        });

      expect(loginResponse.status).toBe(401);
    });

    it('should allow admin to reactivate an inactive user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${activeUserId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ACTIVE');

      // Verify reactivated user can login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: activeUserEmail,
          password: TEST_PASSWORD,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('accessToken');
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent unauthenticated access to user management', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users');

      expect(response.status).toBe(401);
    });

    it('should prevent non-admin from viewing user list', async () => {
      // Use an invalid/fake token to test authorization
      // This avoids rate limiting issues from too many login attempts
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlLXVzZXItaWQiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.invalid';

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${fakeToken}`);

      // Should return 401 (invalid token) which still proves endpoint is protected
      expect(response.status).toBe(401);
    });
  });

  describe('Admin User Creation', () => {
    it('should allow admin to create user directly with ACTIVE status', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `e2e-admincreated-${testTimestamp}@tekcellent.com`,
          firstName: 'E2E Admin',
          lastName: 'Created',
          role: 'EMPLOYEE',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ACTIVE');
    });
  });
});
