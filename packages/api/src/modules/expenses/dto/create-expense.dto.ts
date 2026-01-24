import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType, Currency } from '@prisma/client';

export class ExpenseSplitDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseType, default: ExpenseType.OUT_OF_POCKET })
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  costCenterId?: string;

  @ApiProperty({ example: 'Client dinner meeting' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: Currency, default: Currency.PKR })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  invoiceNumber?: string;

  @ApiPropertyOptional({ type: [ExpenseSplitDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits?: ExpenseSplitDto[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  preApprovalId?: string;
}
