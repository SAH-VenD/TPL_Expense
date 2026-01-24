import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SystemSettingsDto {
  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  lockoutDurationMinutes?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @Min(6)
  @Max(32)
  @IsOptional()
  passwordMinLength?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireUppercase?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireLowercase?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireNumber?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireSpecialChar?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  expenseSubmissionDeadlineDays?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @Min(1)
  @Max(90)
  @IsOptional()
  preApprovalExpiryDays?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @Min(1)
  @Max(90)
  @IsOptional()
  voucherSettlementDeadlineDays?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsNumber()
  @Min(50)
  @Max(100)
  @IsOptional()
  budgetWarningThreshold?: number;

  @ApiPropertyOptional({ example: ['tekcellent.com'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedEmailDomains?: string[];
}
