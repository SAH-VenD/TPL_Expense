import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  SPEND_BY_DEPARTMENT = 'spend-by-department',
  SPEND_BY_CATEGORY = 'spend-by-category',
  SPEND_BY_VENDOR = 'spend-by-vendor',
  BUDGET_VS_ACTUAL = 'budget-vs-actual',
  OUTSTANDING_ADVANCES = 'outstanding-advances',
  TAX_SUMMARY = 'tax-summary',
}

export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  PDF = 'pdf',
}

export class ExportReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
