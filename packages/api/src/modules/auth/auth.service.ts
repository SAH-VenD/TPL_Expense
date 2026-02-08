import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
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
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingMinutes} minutes.`);
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

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
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
      return { message: 'If an account exists with that email, a reset link has been sent' };
    }

    // Generate a cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token with SHA256 before storing in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiry using configurable duration (default 1 hour)
    const expiryHours = this.configService.get<number>('PASSWORD_RESET_EXPIRATION_HOURS', 1);
    const resetExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Store hashed token and expiry in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: resetExpiry,
      },
    });

    // Send email with the raw (unhashed) token using fire-and-forget pattern
    this.emailService
      .sendPasswordResetEmail(user, token)
      .catch((err) => this.logger.error('Failed to send reset email', err.stack));

    return { message: 'If an account exists with that email, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Hash the incoming token with SHA256 to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user where resetToken matches and token has not expired
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Check password history (prevent reuse of last 3 passwords)
    const passwordHistory = (user.passwordHistory as string[]) || [];
    for (const oldHash of passwordHistory.slice(-3)) {
      const isReused = await bcrypt.compare(newPassword, oldHash);
      if (isReused) {
        throw new BadRequestException('Cannot reuse any of your last 3 passwords');
      }
    }

    // Hash the new password
    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    const updatedHistory = [...passwordHistory, newHash].slice(-5);

    // Invalidate all existing sessions (refresh tokens) for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Update user: set new password, clear reset token fields, update history
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
        passwordChangedAt: new Date(),
        passwordHistory: updatedHistory,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        newValue: { passwordReset: true },
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Check password history (prevent reuse of last 3 passwords)
    const passwordHistory = (user.passwordHistory as string[]) || [];
    for (const oldHash of passwordHistory.slice(-3)) {
      const isReused = await bcrypt.compare(newPassword, oldHash);
      if (isReused) {
        throw new BadRequestException('Cannot reuse any of your last 3 passwords');
      }
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    const updatedHistory = [...passwordHistory, newHash].slice(-5);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordHistory: updatedHistory,
        passwordChangedAt: new Date(),
      },
    });

    // Log audit event
    await this.logAudit(userId, 'PASSWORD_CHANGE', 'User', userId);

    return { message: 'Password changed successfully' };
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
    const sessionTimeout = this.configService.get<number>('SESSION_TIMEOUT_MINUTES', 5);
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
      updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      updateData.status = UserStatus.LOCKED;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData as any,
    });
  }

  private validateEmailDomain(email: string) {
    const allowedDomain = this.configService.get<string>('ALLOWED_EMAIL_DOMAIN', 'tekcellent.com');
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

  private async logAudit(userId: string, action: string, entityType: string, entityId: string) {
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
