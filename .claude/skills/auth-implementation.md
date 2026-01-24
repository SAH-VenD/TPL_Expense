# Authentication Implementation Skill

Complete auth implementation pattern for TPL Expense.

## Auth Module Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── jwt-refresh.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── refresh-token.dto.ts
└── decorators/
    └── current-user.decorator.ts
```

## JWT Strategy

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Check session timeout (5 minutes)
    const sessionTimeout = this.configService.get<number>('SESSION_TIMEOUT_MINUTES', 5);
    if (user.lastActivityAt) {
      const lastActivity = new Date(user.lastActivityAt).getTime();
      const now = Date.now();
      if (now - lastActivity > sessionTimeout * 60 * 1000) {
        throw new UnauthorizedException('Session expired due to inactivity');
      }
    }

    return user;
  }
}
```

## Auth Service Core Methods

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Password validation
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new BadRequestException(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      );
    }
  }

  // Email domain validation
  private validateEmailDomain(email: string): void {
    const allowedDomain = this.configService.get<string>('ALLOWED_EMAIL_DOMAIN', 'tekcellent.com');
    const domain = email.split('@')[1];
    if (domain !== allowedDomain) {
      throw new BadRequestException(`Email must be from @${allowedDomain}`);
    }
  }

  // Registration
  async register(dto: RegisterDto) {
    this.validateEmailDomain(dto.email);
    this.validatePasswordStrength(dto.password);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'PENDING_APPROVAL',
        passwordHistory: [passwordHash],
      },
    });

    return {
      message: 'Registration successful. Please wait for admin approval.',
      userId: user.id,
    };
  }

  // Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingMinutes} minutes.`);
    }

    // Check status
    if (user.status === 'PENDING_APPROVAL') {
      throw new UnauthorizedException('Account pending approval');
    }
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account deactivated');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60000);
        updateData.status = 'LOCKED';
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Invalidate previous sessions (single session per user)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        status: 'ACTIVE',
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  // Generate tokens
  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshToken = uuidv4();
    const refreshExpiration = this.configService.get('JWT_REFRESH_EXPIRATION', '7d');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshExpiration));

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(stored.user);
  }

  // Logout
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  // Update activity
  async updateActivity(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    });
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
```

## Auth Guard

```typescript
// guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

## Current User Decorator

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

## Public Decorator

```typescript
// decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

## DTOs

```typescript
// dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@tekcellent.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;
}

// dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john.doe@tekcellent.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
}
```
