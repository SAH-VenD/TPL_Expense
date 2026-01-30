import { IsString, IsNumber, IsOptional, MaxLength, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisburseVoucherDto {
  @ApiProperty({
    example: 50000,
    description: 'Amount to disburse (must not exceed requested amount)',
  })
  @IsNumber()
  @Min(1, { message: 'Disbursed amount must be positive' })
  amount: number;

  @ApiPropertyOptional({ example: 'CASH' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'CASH-2024-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentReference?: string;
}

export class SettleVoucherDto {
  @ApiPropertyOptional({ example: 'All expenses documented and receipts attached' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'Overspent due to additional requirements' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  overspendJustification?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Confirmation that unused cash has been returned',
  })
  @IsBoolean()
  @IsOptional()
  cashReturnConfirmed?: boolean;
}

export class RejectVoucherDto {
  @ApiProperty({ example: 'Amount exceeds policy limit for this purpose' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class LinkExpenseDto {
  @ApiProperty({ example: 'exp-uuid-here', description: 'ID of expense to link to this voucher' })
  @IsString()
  expenseId: string;
}
