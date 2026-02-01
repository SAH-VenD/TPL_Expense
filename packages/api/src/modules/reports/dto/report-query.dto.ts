import { IsOptional, IsDateString, IsUUID, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * Grouping options for reports
 */
export enum ReportGroupBy {
  DEPARTMENT = 'department',
  PROJECT = 'project',
  COST_CENTER = 'cost_center',
  CATEGORY = 'category',
  EMPLOYEE = 'employee',
  VENDOR = 'vendor',
}

/**
 * Common query parameters for all report endpoints
 */
export class ReportQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for report range (ISO date string)',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for report range (ISO date string)',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by cost center ID',
  })
  @IsUUID()
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Group results by specified dimension',
    enum: ReportGroupBy,
  })
  @IsEnum(ReportGroupBy)
  @IsOptional()
  groupBy?: ReportGroupBy;
}

/**
 * Query parameters for monthly trend report
 */
export class MonthlyTrendQueryDto {
  @ApiPropertyOptional({
    description: 'Year for the monthly trend (defaults to current year)',
    example: 2024,
  })
  @Transform(({ value }) => Number.parseInt(value, 10))
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

/**
 * Query parameters for approval turnaround report
 */
export class ApprovalTurnaroundQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for report range',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for report range',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Group by department for breakdown',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  byDepartment?: boolean;
}

/**
 * Query parameters for reimbursement status report
 */
export class ReimbursementStatusQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for report range',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for report range',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}

/**
 * Query parameters for dashboard summary
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by department ID (for department-specific dashboard)',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Period in days for trending data (default: 30)',
    example: 30,
  })
  @Transform(({ value }) => Number.parseInt(value, 10))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  periodDays?: number;
}
