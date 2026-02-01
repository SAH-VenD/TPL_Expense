import { IsEnum, IsNumber, IsOptional, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BudgetType, BudgetPeriod } from '@prisma/client';

export class BudgetSummaryQueryDto {
  @ApiPropertyOptional({ enum: BudgetType })
  @IsEnum(BudgetType)
  @IsOptional()
  type?: BudgetType;

  @ApiPropertyOptional({ enum: BudgetPeriod })
  @IsEnum(BudgetPeriod)
  @IsOptional()
  periodType?: BudgetPeriod;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Fiscal year to filter by', example: 2024 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  fiscalYear?: number;

  @ApiPropertyOptional({ description: 'Quarter to filter by (1-4)', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number;

  @ApiPropertyOptional({ description: 'Include only active budgets', default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  activeOnly?: boolean;
}
