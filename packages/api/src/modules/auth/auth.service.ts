import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly PASSWORD_HISTORY_LENGTH = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Validate email domain
    this.validateEmailDomain(dto.email);

    // Validate password strength
    this.validatePasswordStrength(dto.password);

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.PENDING_APPROVAL,
        passwordHistory: [passwordHash],
        passwordChangedAt: new Date(),
      },
    });

    return {
      message: 'Registration successful. Please wait for admin approval.',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    // Check user status
    if (user.status === UserStatus.PENDING_APPROVAL) {
      throw new UnauthorizedException('Account pending approval');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Invalidate all previous sessions (single session per user)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update user login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    // Log audit event
    await this.logAudit(user.id, 'LOGIN', 'User', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });

      await this.logAudit(token.userId, 'LOGOUT', 'User', token.userId);
    }

    return { message: 'Logged out successfully' };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(storedToken.user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpiry = new Date(
      Date.now() +
        this.configService.get<number>('PASSWORD_RESET_EXPIRATION_HOURS', 24) *
          60 *
          60 *
          1000,
    );

    // Store reset token (in a real app, you'd send an email)
    // For now, we'll just log it
    console.log(`Password reset token for ${email}: ${resetToken}`);

    // TODO: Send email with reset link

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // TODO: Implement token verification from database

    this.validatePasswordStrength(newPassword);

    // This is a placeholder - in a real implementation, you'd:
    // 1. Verify the token from database
    // 2. Check if token is expired
    // 3. Update user's password
    // 4. Invalidate the token

    return { message: 'Password reset successful' };
  }

  async updateActivity(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    });
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    // Check session timeout
    const sessionTimeout = this.configService.get<number>(
      'SESSION_TIMEOUT_MINUTES',
      5,
    );
    if (user.lastActivityAt) {
      const lastActivity = new Date(user.lastActivityAt).getTime();
      const now = Date.now();
      if (now - lastActivity > sessionTimeout * 60 * 1000) {
        return null;
      }
    }

    return user;
  }

  private async generateTokens(user: Pick<User, 'id' | 'email' | 'role'>) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshToken = uuidv4();
    const refreshExpiration = this.parseDuration(
      this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    );
    const expiresAt = new Date(Date.now() + refreshExpiration);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(user: User) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: Partial<User> = {
      failedLoginAttempts: failedAttempts,
    };

    if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(
        Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      updateData.status = UserStatus.LOCKED;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData as any,
    });
  }

  private validateEmailDomain(email: string) {
    const allowedDomain = this.configService.get<string>(
      'ALLOWED_EMAIL_DOMAIN',
      'tekcellent.com',
    );
    const domain = email.split('@')[1]?.toLowerCase();

    if (domain !== allowedDomain) {
      throw new BadRequestException(`Email must be from @${allowedDomain}`);
    }
  }

  private validatePasswordStrength(password: string) {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (
      password.length < minLength ||
      !hasUppercase ||
      !hasLowercase ||
      !hasNumber ||
      !hasSpecial
    ) {
      throw new BadRequestException(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      );
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
      },
    });
  }
}
