import { IsOptional, IsEnum, IsDateString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * Available report types for export
 */
export enum ReportType {
  // Existing reports
  SPEND_BY_DEPARTMENT = 'spend-by-department',
  SPEND_BY_CATEGORY = 'spend-by-category',
  SPEND_BY_VENDOR = 'spend-by-vendor',
  BUDGET_VS_ACTUAL = 'budget-vs-actual',
  OUTSTANDING_ADVANCES = 'outstanding-advances',
  TAX_SUMMARY = 'tax-summary',
  // New reports
  SPEND_BY_EMPLOYEE = 'spend-by-employee',
  SPEND_BY_PROJECT = 'spend-by-project',
  SPEND_BY_COST_CENTER = 'spend-by-cost-center',
  MONTHLY_TREND = 'monthly-trend',
  APPROVAL_TURNAROUND = 'approval-turnaround',
  REIMBURSEMENT_STATUS = 'reimbursement-status',
  DASHBOARD_SUMMARY = 'dashboard-summary',
}

/**
 * Supported export formats
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  PDF = 'pdf',
}

/**
 * DTO for exporting reports
 */
export class ExportReportDto {
  @ApiProperty({
    enum: ReportType,
    description: 'Type of report to export',
    example: ReportType.SPEND_BY_DEPARTMENT,
  })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({
    enum: ExportFormat,
    description: 'Export file format',
    example: ExportFormat.XLSX,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

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
    description: 'Year for monthly trend and tax summary reports',
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
    description: 'Include breakdown by department for applicable reports',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  byDepartment?: boolean;
}
