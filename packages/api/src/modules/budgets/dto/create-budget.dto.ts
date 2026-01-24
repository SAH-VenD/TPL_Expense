import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetType, BudgetPeriod, BudgetEnforcement } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Engineering Q1 2024' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: BudgetType })
  @IsEnum(BudgetType)
  type: BudgetType;

  @ApiProperty({ enum: BudgetPeriod })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ example: 80, default: 80 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  warningThreshold?: number;

  @ApiPropertyOptional({ enum: BudgetEnforcement, default: BudgetEnforcement.SOFT_WARNING })
  @IsEnum(BudgetEnforcement)
  @IsOptional()
  enforcement?: BudgetEnforcement;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-03-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  employeeId?: string;
}
