import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseFiltersDto {
  @ApiPropertyOptional({ description: 'Single status or comma-separated list of statuses' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter expenses from this date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter expenses to this date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ type: Number, description: 'Minimum amount filter' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountMin?: number;

  @ApiPropertyOptional({ type: Number, description: 'Maximum amount filter' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountMax?: number;

  @ApiPropertyOptional({ description: 'Search in description and expense number' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field:direction (e.g., createdAt:desc)' })
  @IsString()
  @IsOptional()
  sort?: string;
}
