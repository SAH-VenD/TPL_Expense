import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { UserStatus, RoleType } from '@prisma/client';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        ALLOWED_EMAIL_DOMAIN: 'tekcellent.com',
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        SESSION_TIMEOUT_MINUTES: 5,
        PASSWORD_RESET_EXPIRATION_HOURS: 24,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterDto = {
      email: 'newuser@tekcellent.com',
      password: 'Test@123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register a user with valid @tekcellent.com email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-123',
        email: validRegisterDto.email,
        firstName: validRegisterDto.firstName,
        lastName: validRegisterDto.lastName,
        status: UserStatus.PENDING_APPROVAL,
      });

      const result = await service.register(validRegisterDto);

      expect(result.message).toContain('Registration successful');
      expect(result.userId).toBe('user-id-123');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: validRegisterDto.email.toLowerCase(),
            status: UserStatus.PENDING_APPROVAL,
          }),
        }),
      );
    });

    it('should reject non-tekcellent.com emails', async () => {
      const invalidDto = { ...validRegisterDto, email: 'user@gmail.com' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(invalidDto)).rejects.toThrow('@tekcellent.com');
    });

    it('should reject emails with wrong domain', async () => {
      const invalidDto = { ...validRegisterDto, email: 'user@other.com' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should enforce password complexity - minimum length', async () => {
      const weakPasswordDto = { ...validRegisterDto, password: 'Ab1!' };

      await expect(service.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(weakPasswordDto)).rejects.toThrow('at least 8 characters');
    });

    it('should enforce password complexity - require uppercase', async () => {
      const noUppercaseDto = { ...validRegisterDto, password: 'password123!' };

      await expect(service.register(noUppercaseDto)).rejects.toThrow(BadRequestException);
    });

    it('should enforce password complexity - require lowercase', async () => {
      const noLowercaseDto = { ...validRegisterDto, password: 'PASSWORD123!' };

      await expect(service.register(noLowercaseDto)).rejects.toThrow(BadRequestException);
    });

    it('should enforce password complexity - require number', async () => {
      const noNumberDto = { ...validRegisterDto, password: 'Password!' };

      await expect(service.register(noNumberDto)).rejects.toThrow(BadRequestException);
    });

    it('should enforce password complexity - require special character', async () => {
      const noSpecialDto = { ...validRegisterDto, password: 'Password123' };

      await expect(service.register(noSpecialDto)).rejects.toThrow(BadRequestException);
    });

    it('should create user with PENDING_APPROVAL status', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-123',
        status: UserStatus.PENDING_APPROVAL,
      });

      await service.register(validRegisterDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.PENDING_APPROVAL,
          }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(validRegisterDto)).rejects.toThrow(ConflictException);
      await expect(service.register(validRegisterDto)).rejects.toThrow('already registered');
    });

    it('should hash password before storing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-id' });

      await service.register(validRegisterDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.not.stringMatching(validRegisterDto.password),
          }),
        }),
      );
    });
  });

  describe('login', () => {
    const validLoginDto = {
      email: 'user@tekcellent.com',
      password: 'Test@123!',
    };

    const mockActiveUser = {
      id: 'user-id-123',
      email: 'user@tekcellent.com',
      passwordHash: bcrypt.hashSync('Test@123!', 12),
      firstName: 'Test',
      lastName: 'User',
      role: RoleType.EMPLOYEE,
      status: UserStatus.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      departmentId: null,
    };

    it('should allow login for ACTIVE users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      mockPrismaService.user.update.mockResolvedValue(mockActiveUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.login(validLoginDto);

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(mockActiveUser.email);
    });

    it('should reject login for PENDING_APPROVAL users', async () => {
      const pendingUser = { ...mockActiveUser, status: UserStatus.PENDING_APPROVAL };
      mockPrismaService.user.findUnique.mockResolvedValue(pendingUser);

      await expect(service.login(validLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(validLoginDto)).rejects.toThrow('pending approval');
    });

    it('should reject login for INACTIVE users', async () => {
      const inactiveUser = { ...mockActiveUser, status: UserStatus.INACTIVE };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.login(validLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(validLoginDto)).rejects.toThrow('deactivated');
    });

    it('should reject login with invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(validLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.user.update.mockResolvedValue(mockActiveUser);

      const wrongPasswordDto = { ...validLoginDto, password: 'WrongPassword123!' };

      await expect(service.login(wrongPasswordDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed login attempts on wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.user.update.mockResolvedValue({});

      const wrongPasswordDto = { ...validLoginDto, password: 'WrongPassword123!' };

      try {
        await service.login(wrongPasswordDto);
      } catch {
        // Expected to throw
      }

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockActiveUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 1,
          }),
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWith4Attempts = { ...mockActiveUser, failedLoginAttempts: 4 };
      mockPrismaService.user.findUnique.mockResolvedValue(userWith4Attempts);
      mockPrismaService.user.update.mockResolvedValue({});

      const wrongPasswordDto = { ...validLoginDto, password: 'WrongPassword123!' };

      try {
        await service.login(wrongPasswordDto);
      } catch {
        // Expected to throw
      }

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
            status: UserStatus.LOCKED,
          }),
        }),
      );
    });

    it('should reject login for locked accounts', async () => {
      const lockedUser = {
        ...mockActiveUser,
        status: UserStatus.LOCKED,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more minutes
      };
      mockPrismaService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(service.login(validLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(validLoginDto)).rejects.toThrow('Account locked');
    });

    it('should reset failed attempts on successful login', async () => {
      const userWithFailedAttempts = { ...mockActiveUser, failedLoginAttempts: 3 };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithFailedAttempts);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      mockPrismaService.user.update.mockResolvedValue(mockActiveUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.login(validLoginDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
    });

    it('should update lastLoginAt on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      mockPrismaService.user.update.mockResolvedValue(mockActiveUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.login(validLoginDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create audit log on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockActiveUser);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      mockPrismaService.user.update.mockResolvedValue(mockActiveUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.login(validLoginDto);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN',
            userId: mockActiveUser.id,
          }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const mockToken = {
        id: 'token-id',
        token: 'refresh-token',
        userId: 'user-id',
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.logout('refresh-token');

      expect(result.message).toContain('Logged out');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockToken.id },
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create audit log on logout', async () => {
      const mockToken = {
        id: 'token-id',
        token: 'refresh-token',
        userId: 'user-id',
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logout('refresh-token');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGOUT',
          }),
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should reject invalid refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        token: 'revoked-token',
        revokedAt: new Date(),
        user: { status: UserStatus.ACTIVE },
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        token: 'expired-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: { status: UserStatus.ACTIVE },
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        status: UserStatus.INACTIVE,
      });

      const result = await service.validateUser('user-id');

      expect(result).toBeNull();
    });

    it('should return user for active user', async () => {
      const activeUser = {
        id: 'user-id',
        status: UserStatus.ACTIVE,
        lastActivityAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(activeUser);

      const result = await service.validateUser('user-id');

      expect(result).toEqual(activeUser);
    });

    it('should return null if session timed out', async () => {
      const userWithOldActivity = {
        id: 'user-id',
        status: UserStatus.ACTIVE,
        lastActivityAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (> 5 min timeout)
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithOldActivity);

      const result = await service.validateUser('user-id');

      expect(result).toBeNull();
    });
  });
});
