import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleType, UserStatus } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@tekcellent.com',
    firstName: 'Test',
    lastName: 'User',
    role: RoleType.EMPLOYEE,
    departmentId: 'dept-1',
    status: UserStatus.ACTIVE,
  } as any;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to authService.register', async () => {
      const dto = {
        email: 'new@tekcellent.com',
        password: 'Test@123!',
        firstName: 'New',
        lastName: 'User',
      };
      const expected = { message: 'Registration successful', userId: 'user-1' };
      service.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(result).toEqual(expected);
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const dto = { email: 'test@tekcellent.com', password: 'Test@123!' };
      const expected = {
        user: { id: 'user-1', email: dto.email },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      service.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(result).toEqual(expected);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refreshTokens', () => {
    it('should delegate to authService.refreshTokens', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      const expected = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      service.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refreshTokens(dto as any);

      expect(result).toEqual(expected);
      expect(service.refreshTokens).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('logout', () => {
    it('should delegate to authService.logout', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const expected = { message: 'Logged out successfully' };
      service.logout.mockResolvedValue(expected);

      const result = await controller.logout(dto as any);

      expect(result).toEqual(expected);
      expect(service.logout).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('changePassword', () => {
    it('should delegate to authService.changePassword with user id', async () => {
      const dto = { currentPassword: 'Old@123!', newPassword: 'New@123!' };
      const expected = { message: 'Password changed successfully' };
      service.changePassword.mockResolvedValue(expected);

      const result = await controller.changePassword(mockUser, dto as any);

      expect(result).toEqual(expected);
      expect(service.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        dto.currentPassword,
        dto.newPassword,
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile fields', async () => {
      const result = await controller.getProfile(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        departmentId: mockUser.departmentId,
        status: mockUser.status,
      });
    });
  });
});
